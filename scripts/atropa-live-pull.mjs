#!/usr/bin/env node
// atropa-live-pull.mjs — READ-ONLY. No signers, no transactions, no approvals, no private keys.
// Hybrid pull: on-chain totalSupply/decimals via PulseChain RPC + DEX Screener prices/liquidity,
// plus a DEFINITIVE mint-into-LP registry detector (count/at/get).
// Node 20+, zero dependencies. Outputs data/atropa-live.json + data/atropa-summary.md
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// ---- config -------------------------------------------------------------
// G4MM4 first: rpc.pulsechain.com rate-limits under batch load.
const RPCS = (process.env.PULSE_RPC || [
  "https://rpc-pulsechain.g4mm4.io",
  "https://pulsechain-rpc.publicnode.com",
  "https://rpc.pulsechain.com",
].join(",")).split(",").map(s => s.trim()).filter(Boolean);

const TOKENS_FILE = process.env.TOKENS_FILE || "data/atropa-tokens.json";
const OUT_DIR = process.env.OUT_DIR || "data";
const DS_BASE = "https://api.dexscreener.com/latest/dex/tokens/";
const BATCH = Number(process.env.BATCH || 30);   // tokens per RPC batch
const MAX_PAIRS_ENUM = Number(process.env.MAX_PAIRS_ENUM || 50);

// function selectors
const SEL = {
  totalSupply: "0x18160ddd",
  decimals:    "0x313ce567",
  count:       "0x06661abd", // NUKES-family registry: number of registered pairs
  at:          "0x28468a7b", // at(uint256) -> address
  get:         "0x7fc3865b", // get(address) -> (uint256 amount, address owner)
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = h => h.replace(/^0x/, "").padStart(64, "0");
const encAddr = a => pad(a.toLowerCase());
const encUint = n => pad(BigInt(n).toString(16));
const isEmpty = h => !h || h === "0x" || h === "0x0";
const decUint = h => (isEmpty(h) ? null : BigInt(h.slice(0, 66)));
const decAddr = h => (isEmpty(h) || h.length < 66 ? null : "0x" + h.slice(26, 66));

// ---- transport ----------------------------------------------------------
let rpcIdx = 0;
async function rpcCall(payload) {
  let lastErr;
  for (let attempt = 0; attempt < RPCS.length * 2; attempt++) {
    const url = RPCS[rpcIdx % RPCS.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 429) { await sleep(1200 * (attempt + 1)); rpcIdx++; continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();
    } catch (e) {
      lastErr = e; rpcIdx++; await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

// returns array of hex results aligned to calls; null where the call reverted/returned nothing
async function ethCallBatch(calls) {
  if (!calls.length) return [];
  const payload = calls.map((c, i) => ({
    jsonrpc: "2.0", id: i, method: "eth_call",
    params: [{ to: c.to, data: c.data }, "latest"],
  }));
  let out;
  try {
    out = await rpcCall(payload);
  } catch {
    // batch rejected: fall back to sequential
    const res = [];
    for (const c of calls) {
      try {
        const r = await rpcCall({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: c.to, data: c.data }, "latest"] });
        res.push(r?.error ? null : r?.result ?? null);
      } catch { res.push(null); }
    }
    return res;
  }
  const arr = Array.isArray(out) ? out : [out];
  const byId = new Map(arr.map(r => [r.id, r]));
  return calls.map((_, i) => {
    const r = byId.get(i);
    if (!r || r.error) return null;
    return r.result ?? null;
  });
}

async function fetchJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(1500 * (i + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

// ---- main ---------------------------------------------------------------
const { tokens } = JSON.parse(readFileSync(TOKENS_FILE, "utf8"));
console.error(`[pull] ${tokens.length} tokens | rpc: ${RPCS[0]}`);

const rows = tokens.map(t => ({ ...t, totalSupply: null, decimals: null, registryCount: null, registeredPairs: null, errors: [] }));

// Phase 1: totalSupply + decimals + count(), batched
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const calls = [];
  for (const r of slice) {
    calls.push({ to: r.address, data: SEL.totalSupply });
    calls.push({ to: r.address, data: SEL.decimals });
    calls.push({ to: r.address, data: SEL.count });
  }
  const res = await ethCallBatch(calls);
  slice.forEach((r, j) => {
    const ts = decUint(res[j * 3]);
    const dc = decUint(res[j * 3 + 1]);
    const ct = decUint(res[j * 3 + 2]);
    r.totalSupply = ts === null ? null : ts.toString();
    r.decimals = dc === null ? null : Number(dc);
    // count() returning a plausible value = the NUKES-family registry is present.
    r.registryCount = ct === null ? null : (ct <= 100000n ? Number(ct) : null);
    if (ts === null) r.errors.push("totalSupply reverted/empty");
  });
  console.error(`[pull] supplies ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

// Phase 2: for registry hits, enumerate the registered pairs
const famRows = rows.filter(r => r.registryCount !== null);
console.error(`[pull] registry present on ${famRows.length} token(s)`);
for (const r of famRows) {
  const n = Math.min(r.registryCount, MAX_PAIRS_ENUM);
  if (n === 0) { r.registeredPairs = []; continue; }
  const atRes = await ethCallBatch(
    Array.from({ length: n }, (_, k) => ({ to: r.address, data: SEL.at + encUint(k) }))
  );
  const pairs = atRes.map(decAddr).filter(Boolean);
  const getRes = await ethCallBatch(pairs.map(p => ({ to: r.address, data: SEL.get + encAddr(p) })));
  r.registeredPairs = pairs.map((p, k) => {
    const h = getRes[k];
    if (isEmpty(h) || h.length < 130) return { pair: p, weight: null, owner: null };
    return { pair: p, weight: BigInt("0x" + h.slice(2, 66)).toString(), owner: "0x" + h.slice(90, 130) };
  });
}

// Phase 3: DEX Screener prices/liquidity
const seenPairs = new Set();
const mkt = new Map();
for (let i = 0; i < rows.length; i += 30) {
  const slice = rows.slice(i, i + 30);
  try {
    const j = await fetchJson(DS_BASE + slice.map(r => r.address).join(","));
    for (const p of j?.pairs || []) {
      if (p.chainId !== "pulsechain") continue;
      const base = (p.baseToken?.address || "").toLowerCase();
      const cur = mkt.get(base);
      const liq = Number(p.liquidity?.usd || 0);
      if (!cur || liq > cur.liquidityUsd) {
        mkt.set(base, { priceUsd: Number(p.priceUsd || 0), liquidityUsd: liq, deepestPair: p.pairAddress });
      }
      const e = mkt.get(base);
      if (!seenPairs.has(p.pairAddress)) {
        seenPairs.add(p.pairAddress);
        e.totalLiquidityUsd = (e.totalLiquidityUsd || 0) + liq;
        e.volume24h = (e.volume24h || 0) + Number(p.volume?.h24 || 0);
        e.pairCount = (e.pairCount || 0) + 1;
      }
    }
  } catch (e) {
    console.error(`[pull] dexscreener batch ${i} failed: ${e.message}`);
  }
  await sleep(250);
}

for (const r of rows) {
  const m = mkt.get(r.address.toLowerCase());
  r.priceUsd = m?.priceUsd ?? null;
  r.liquidityUsd = m?.totalLiquidityUsd ?? null;
  r.volume24h = m?.volume24h ?? null;
  r.pairCount = m?.pairCount ?? 0;
  // supply must NOT depend on price: the interesting tokens here have no market at all.
  r.supplyFloat = (r.totalSupply !== null && r.decimals !== null)
    ? Number(BigInt(r.totalSupply)) / 10 ** r.decimals
    : null;
  r.marketCapUsd = (r.supplyFloat !== null && r.priceUsd) ? r.supplyFloat * r.priceUsd : null;
  // cross-check vs the Feb-2025 snapshot's initial supply
  r.supplyGrowthVsInitial =
    r.supplyFloat && r.initialSupplySnapshot ? r.supplyFloat / r.initialSupplySnapshot : null;
}

// ---- summary ------------------------------------------------------------
const alive = rows.filter(r => r.totalSupply !== null);
const withMkt = rows.filter(r => r.marketCapUsd);
const family = rows.filter(r => r.registryCount !== null);
const armed = family.filter(r => r.registryCount > 0);

const summary = {
  generatedAt: new Date().toISOString(),
  rpc: RPCS[0],
  tokensQueried: rows.length,
  contractsAlive: alive.length,
  tokensWithMarket: withMkt.length,
  totalLiquidityUsd: rows.reduce((a, r) => a + (r.liquidityUsd || 0), 0),
  mintIntoLpFamily: family.length,
  mintIntoLpArmed: armed.length,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/atropa-live.json`, JSON.stringify({ summary, tokens: rows }, (_, v) => typeof v === "bigint" ? v.toString() : v, 1));

const fmt = n => n === null || n === undefined ? "-" : (typeof n === "number" ? n.toLocaleString("en-US", { maximumFractionDigits: 6 }) : String(n));
let md = `# Atropa live pull\n\n`;
md += `Generated: ${summary.generatedAt}\nRPC: ${summary.rpc}\n\n`;
md += `- Tokens queried: **${summary.tokensQueried}**\n- Contracts alive: **${summary.contractsAlive}**\n`;
md += `- With a DEX market: **${summary.tokensWithMarket}**\n- Total liquidity: **$${fmt(Math.round(summary.totalLiquidityUsd))}**\n\n`;
md += `## Mint-into-LP registry (definitive, on-chain)\n\n`;
md += `\`count()\` responded on **${summary.mintIntoLpFamily}** token(s). **${summary.mintIntoLpArmed}** have a live registered pair.\n\n`;
if (family.length) {
  md += `| Symbol | Address | count() | supply now | vs snapshot initial | registered pairs |\n|---|---|---|---|---|---|\n`;
  for (const r of family.sort((a, b) => b.registryCount - a.registryCount)) {
    const pl = (r.registeredPairs || []).map(p => `\`${p.pair}\` w=${p.weight ?? "?"}`).join("<br>") || "_none_";
    md += `| ${r.symbol} | \`${r.address}\` | ${r.registryCount} | ${fmt(r.supplyFloat)} | ${r.supplyGrowthVsInitial ? fmt(r.supplyGrowthVsInitial) + "x" : "-"} | ${pl} |\n`;
  }
  md += `\n`;
}
md += `## Biggest supply growth vs Feb-2025 snapshot\n\n| Symbol | Address | initial (snapshot) | supply now | growth |\n|---|---|---|---|---|\n`;
for (const r of rows.filter(r => r.supplyGrowthVsInitial).sort((a, b) => b.supplyGrowthVsInitial - a.supplyGrowthVsInitial).slice(0, 20)) {
  md += `| ${r.symbol} | \`${r.address}\` | ${fmt(r.initialSupplySnapshot)} | ${fmt(r.supplyFloat)} | ${fmt(r.supplyGrowthVsInitial)}x |\n`;
}
md += `\n## Top 15 by liquidity\n\n| Symbol | Price USD | Liquidity | 24h vol | Market cap | Pairs |\n|---|---|---|---|---|---|\n`;
for (const r of rows.filter(r => r.liquidityUsd).sort((a, b) => b.liquidityUsd - a.liquidityUsd).slice(0, 15)) {
  md += `| ${r.symbol} | ${fmt(r.priceUsd)} | $${fmt(Math.round(r.liquidityUsd))} | $${fmt(Math.round(r.volume24h || 0))} | $${fmt(Math.round(r.marketCapUsd || 0))} | ${r.pairCount} |\n`;
}
md += `\n---\n_Read-only. No transactions were sent. \`count()\` presence is a selector match — confirm any hit against bytecode before acting on it._\n`;
writeFileSync(`${OUT_DIR}/atropa-summary.md`, md);
console.error(`[pull] wrote ${OUT_DIR}/atropa-live.json and ${OUT_DIR}/atropa-summary.md`);
console.error(`[pull] family=${summary.mintIntoLpFamily} armed=${summary.mintIntoLpArmed} alive=${summary.contractsAlive}/${summary.tokensQueried}`);

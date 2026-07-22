#!/usr/bin/env node
import { readJson, writeJson, nowIso, normalizeAddress } from "./lib/io.mjs";
import { TOKENS_FILE, RAW_FILE, MAX_CONCURRENCY, DISCOVERY_DEPTH, MAX_DISCOVERED } from "./lib/config.mjs";
import { ethCall, getCode, mapConcurrent } from "./lib/rpc.mjs";
import { SELECTORS, decodeString, decodeUint, decodeAddress } from "./lib/abi.mjs";
import { extractPush4Selectors, extractPush20Addresses, bytecodeFingerprint } from "./lib/bytecode.mjs";
import { getSourceAndAbi } from "./lib/explorer.mjs";

const seed = readJson(TOKENS_FILE).tokens || [];
const known = new Map(seed.map(t => [t.address.toLowerCase(), { ...t, address:t.address.toLowerCase(), discovery:[{type:"seed_catalogue", evidence:TOKENS_FILE}] }]));

async function probe(address) {
  const [code, nameRaw, symbolRaw, decimalsRaw, supplyRaw, ownerRaw, implRaw, token0Raw, token1Raw, parent1, parent2, multiplierRaw, countRaw, explorer] = await Promise.all([
    getCode(address), ethCall(address, SELECTORS.name), ethCall(address, SELECTORS.symbol), ethCall(address, SELECTORS.decimals),
    ethCall(address, SELECTORS.totalSupply), ethCall(address, SELECTORS.owner), ethCall(address, SELECTORS.implementation),
    ethCall(address, SELECTORS.token0), ethCall(address, SELECTORS.token1), ethCall(address, SELECTORS.parent),
    ethCall(address, SELECTORS.Parent), ethCall(address, SELECTORS.multiplier), ethCall(address, SELECTORS.count), getSourceAndAbi(address)
  ]);
  const parent = decodeAddress(parent1) || decodeAddress(parent2);
  const result = {
    address, code: code || null, codeSize: code && code !== "0x" ? (code.length - 2) / 2 : 0,
    fingerprint: bytecodeFingerprint(code), selectors: extractPush4Selectors(code), embeddedAddresses: extractPush20Addresses(code, address),
    metadata: { name:decodeString(nameRaw), symbol:decodeString(symbolRaw), decimals:decimalsRaw ? Number(decodeUint(decimalsRaw)) : null, totalSupply:supplyRaw ? decodeUint(supplyRaw)?.toString() : null },
    probes: { owner:decodeAddress(ownerRaw), implementation:explorer?.implementation || decodeAddress(implRaw), token0:decodeAddress(token0Raw), token1:decodeAddress(token1Raw), parent, multiplier:multiplierRaw ? decodeUint(multiplierRaw)?.toString() : null, registryCount:countRaw ? Number(decodeUint(countRaw)) : null },
    explorer
  };
  return result;
}

let frontier = [...known.keys()];
const scanned = new Map();
for (let depth = 0; depth <= DISCOVERY_DEPTH && frontier.length; depth++) {
  console.error(`[scan] depth=${depth} frontier=${frontier.length} known=${known.size}`);
  const results = await mapConcurrent(frontier, MAX_CONCURRENCY, probe);
  const next = [];
  for (let i=0;i<frontier.length;i++) {
    const address = frontier[i];
    const result = results[i];
    if (!result || result.error) { scanned.set(address, { address, error:result?.error || "probe failed" }); continue; }
    scanned.set(address, result);
    if (depth === DISCOVERY_DEPTH) continue;
    const discoveries = [result.probes.parent, result.probes.implementation, result.probes.token0, result.probes.token1, ...result.embeddedAddresses].map(normalizeAddress).filter(Boolean);
    for (const found of discoveries) {
      if (known.size >= MAX_DISCOVERED) break;
      if (!known.has(found)) {
        known.set(found, { address:found, discovery:[{type:"contract_reference", from:address, depth:depth+1}] });
        next.push(found);
      } else {
        known.get(found).discovery.push({type:"contract_reference", from:address, depth:depth+1});
      }
    }
  }
  frontier = [...new Set(next)];
}

const contracts = [...known.values()].map(item => ({ ...item, ...(scanned.get(item.address) || {}) }));
writeJson(RAW_FILE, { generatedAt:nowIso(), safety:"READ_ONLY", seedCount:seed.length, discoveredCount:contracts.length-seed.length, contracts });
console.error(`[scan] wrote ${contracts.length} contracts to ${RAW_FILE}`);

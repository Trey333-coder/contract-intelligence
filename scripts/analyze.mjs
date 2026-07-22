#!/usr/bin/env node
import { readJson, writeJson, writeText, nowIso } from "./lib/io.mjs";
import { RAW_FILE, ANALYSIS_FILE, RELATIONSHIPS_FILE } from "./lib/config.mjs";
import { KNOWN_SIGNATURES } from "./lib/abi.mjs";
import { classifyContract, riskSignals } from "./lib/classify.mjs";
import { analyzeUnicode } from "./lib/unicode.mjs";

const raw = readJson(RAW_FILE);
const contracts = [];
const relationships = [];
const byFingerprint = new Map();
for (const c of raw.contracts || []) {
  const selectorDetails = (c.selectors || []).map(selector => ({ selector:`0x${selector}`, signature:KNOWN_SIGNATURES[selector] || null, confidence:KNOWN_SIGNATURES[selector] ? "verified_dictionary" : "unknown" }));
  const classification = classifyContract(c.selectors || [], c.probes || {});
  const risks = riskSignals(c.selectors || [], c.probes || {});
  const displayName = c.metadata?.name || c.name || null;
  const displaySymbol = c.metadata?.symbol || c.symbol || null;
  const analysis = {
    address:c.address, seed:{ name:c.name || null, symbol:c.symbol || null, initialSupplySnapshot:c.initialSupplySnapshot ?? null },
    metadata:{ ...c.metadata, nameAnalysis:analyzeUnicode(displayName), symbolAnalysis:analyzeUnicode(displaySymbol) },
    classification, selectorDetails, probes:c.probes || {}, risks,
    bytecode:{ size:c.codeSize || 0, fingerprint:c.fingerprint || null, embeddedAddresses:c.embeddedAddresses || [] },
    source:{ verified:Boolean(c.explorer?.verified), contractName:c.explorer?.contractName || null, compilerVersion:c.explorer?.compilerVersion || null, proxy:Boolean(c.explorer?.proxy) },
    discovery:c.discovery || [], errors:c.error ? [c.error] : [],
    conclusions:{
      technical:`${classification.family} (${classification.confidence} confidence)`,
      metadata: displayName || displaySymbol ? "Unicode metadata decoded; semantic translation requires language/reference dictionary." : "No readable token metadata returned.",
      verificationBoundary:"Selectors and successful eth_call probes are evidence, but unverified bytecode does not reveal original variable names or every execution condition."
    }
  };
  contracts.push(analysis);
  if (c.fingerprint) { if (!byFingerprint.has(c.fingerprint)) byFingerprint.set(c.fingerprint, []); byFingerprint.get(c.fingerprint).push(c.address); }
  const edges = [["parent",c.probes?.parent],["implementation",c.probes?.implementation],["token0",c.probes?.token0],["token1",c.probes?.token1]];
  for (const [type,to] of edges) if (to) relationships.push({ from:c.address, to, type, evidence:"successful eth_call", confidence:"high" });
  for (const to of c.embeddedAddresses || []) relationships.push({ from:c.address, to, type:"bytecode_reference", evidence:"PUSH20 constant", confidence:"low" });
}
for (const [fingerprint, addresses] of byFingerprint) if (addresses.length > 1) {
  for (let i=1;i<addresses.length;i++) relationships.push({ from:addresses[0], to:addresses[i], type:"bytecode_family", evidence:fingerprint, confidence:"medium" });
}
writeJson(ANALYSIS_FILE, { generatedAt:nowIso(), safety:"READ_ONLY", summary:{ contracts:contracts.length, verifiedSource:contracts.filter(c=>c.source.verified).length, familyCounts:Object.fromEntries([...new Set(contracts.map(c=>c.classification.family))].map(f=>[f,contracts.filter(c=>c.classification.family===f).length])) }, contracts });
writeJson(RELATIONSHIPS_FILE, { generatedAt:nowIso(), relationships });

for (const c of contracts) {
  const name = c.metadata.name || c.seed.name || "Unknown";
  const md = `# ${name}\n\n- Address: \`${c.address}\`\n- Classification: **${c.classification.family}** (${c.classification.confidence})\n- Verified source: **${c.source.verified ? "yes" : "no"}**\n- Bytecode size: **${c.bytecode.size} bytes**\n\n## Metadata\n\n- Name: ${c.metadata.name ?? "-"}\n- Symbol: ${c.metadata.symbol ?? "-"}\n- Decimals: ${c.metadata.decimals ?? "-"}\n- Total supply raw: ${c.metadata.totalSupply ?? "-"}\n- Scripts: ${(c.metadata.nameAnalysis.scripts || []).join(", ") || "-"}\n\n## Evidence\n\n${c.classification.evidence.map(e=>`- ${e}`).join("\n") || "- No family-specific evidence."}\n\n## Functions/selectors\n\n${c.selectorDetails.map(s=>`- \`${s.selector}\` — ${s.signature || "unknown"}`).join("\n") || "- None extracted."}\n\n## Relationships\n\n- Parent: ${c.probes.parent || "-"}\n- Implementation: ${c.probes.implementation || "-"}\n- Token0: ${c.probes.token0 || "-"}\n- Token1: ${c.probes.token1 || "-"}\n\n## Risk signals\n\n${c.risks.map(r=>`- **${r.level.toUpperCase()} ${r.code}:** ${r.detail}`).join("\n") || "- No dictionary-based risk signal detected. This is not a safety guarantee."}\n\n## Verification boundary\n\n${c.conclusions.verificationBoundary}\n`;
  writeText(`reports/${c.address}.md`, md);
}
console.error(`[analyze] wrote ${contracts.length} analyses and ${relationships.length} relationships`);

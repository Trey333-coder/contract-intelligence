#!/usr/bin/env node
import { readJson, writeJson, writeText, nowIso } from "./lib/io.mjs";
import { RAW_FILE, ANALYSIS_FILE, RELATIONSHIPS_FILE } from "./lib/config.mjs";
import { KNOWN_SIGNATURES } from "./lib/abi.mjs";
import { classifyContract, riskSignals } from "./lib/classify.mjs";
import { analyzeUnicode } from "./lib/unicode.mjs";
import { abiSignatureSet, resolveUnknownSelectors, chooseSelectorSignature } from "./lib/selector-resolver.mjs";

const SELECTOR_CACHE_FILE = process.env.SELECTOR_CACHE_FILE || "data/selector-cache.json";
const raw = readJson(RAW_FILE);
const selectorCache = readJson(SELECTOR_CACHE_FILE, {});
const unknown = [];
for (const c of raw.contracts || []) for (const selector of c.selectors || []) if (!KNOWN_SIGNATURES[selector] && !selectorCache[selector]) unknown.push(selector);
await resolveUnknownSelectors(unknown, selectorCache);
writeJson(SELECTOR_CACHE_FILE, selectorCache);

const contracts = [];
const relationships = [];
const byFingerprint = new Map();
for (const c of raw.contracts || []) {
  const abiSet = abiSignatureSet(c.explorer?.abi);
  const sourceFunctionSignatures = [...abiSet].sort();
  const selectorDetails = (c.selectors || []).map(selector => ({
    selector:`0x${selector}`,
    ...chooseSelectorSignature(selector, KNOWN_SIGNATURES[selector] || null, abiSet, selectorCache[selector])
  }));
  const classification = classifyContract(c.selectors || [], c.probes || {});
  const risks = riskSignals(c.selectors || [], c.probes || {});
  const displayName = c.metadata?.name || c.name || null;
  const displaySymbol = c.metadata?.symbol || c.symbol || null;
  const nameAnalysis = analyzeUnicode(displayName);
  const symbolAnalysis = analyzeUnicode(displaySymbol);
  const unresolvedCount = selectorDetails.filter(s=>!s.signature).length;
  const analysis = {
    address:c.address, seed:{ name:c.name || null, symbol:c.symbol || null, initialSupplySnapshot:c.initialSupplySnapshot ?? null },
    metadata:{ ...c.metadata, nameAnalysis, symbolAnalysis },
    classification, selectorDetails, sourceFunctionSignatures, probes:c.probes || {}, risks,
    bytecode:{ size:c.codeSize || 0, fingerprint:c.fingerprint || null, embeddedAddresses:c.embeddedAddresses || [] },
    source:{ verified:Boolean(c.explorer?.verified), contractName:c.explorer?.contractName || null, compilerVersion:c.explorer?.compilerVersion || null, proxy:Boolean(c.explorer?.proxy), abiFunctionCount:sourceFunctionSignatures.length },
    discovery:c.discovery || [], errors:c.error ? [c.error] : [],
    conclusions:{
      technical:`${classification.family} (${classification.confidence} confidence)`,
      metadata:nameAnalysis.meaningHint || symbolAnalysis.meaningHint || (displayName || displaySymbol ? "Unicode metadata identified; meaning remains unverified where no language/reference match exists." : "No readable token metadata returned."),
      selectors:`${selectorDetails.length-unresolvedCount}/${selectorDetails.length} selectors resolved; ABI matches outrank public selector candidates.`,
      verificationBoundary:"Verified ABI matches are strong evidence. Public selector databases can be ambiguous, and unverified bytecode does not reveal every execution condition."
    }
  };
  contracts.push(analysis);
  if (c.fingerprint) { if (!byFingerprint.has(c.fingerprint)) byFingerprint.set(c.fingerprint, []); byFingerprint.get(c.fingerprint).push(c.address); }
  for (const [type,to] of [["parent",c.probes?.parent],["implementation",c.probes?.implementation],["token0",c.probes?.token0],["token1",c.probes?.token1]]) if (to) relationships.push({from:c.address,to,type,evidence:"successful eth_call",confidence:"high"});
  for (const to of c.embeddedAddresses || []) relationships.push({from:c.address,to,type:"bytecode_reference",evidence:"PUSH20 constant",confidence:"low"});
}
for (const [fingerprint, addresses] of byFingerprint) if (addresses.length > 1) for (let i=1;i<addresses.length;i++) relationships.push({from:addresses[0],to:addresses[i],type:"bytecode_family",evidence:fingerprint,confidence:"medium"});

writeJson(ANALYSIS_FILE,{generatedAt:nowIso(),safety:"READ_ONLY",summary:{contracts:contracts.length,verifiedSource:contracts.filter(c=>c.source.verified).length,resolvedSelectors:contracts.reduce((n,c)=>n+c.selectorDetails.filter(s=>s.signature).length,0),unresolvedSelectors:contracts.reduce((n,c)=>n+c.selectorDetails.filter(s=>!s.signature).length,0),familyCounts:Object.fromEntries([...new Set(contracts.map(c=>c.classification.family))].map(f=>[f,contracts.filter(c=>c.classification.family===f).length]))},contracts});
writeJson(RELATIONSHIPS_FILE,{generatedAt:nowIso(),relationships});

for (const c of contracts) {
  const name=c.metadata.name||c.seed.name||"Unknown";
  const na=c.metadata.nameAnalysis;
  const md=`# ${name}\n\n- Address: \`${c.address}\`\n- Classification: **${c.classification.family}** (${c.classification.confidence})\n- Verified source: **${c.source.verified?"yes":"no"}**\n- Bytecode size: **${c.bytecode.size} bytes**\n\n## Metadata intelligence\n\n- Original name: ${c.metadata.name??"-"}\n- Normalized name: ${na.normalized||"-"}\n- Transliteration: ${na.transliteration||"-"}\n- Meaning hint: ${na.meaningHint||"-"}\n- Script(s): ${(na.scripts||[]).join(", ")||"-"}\n- Safe code-point fallback: ${na.safeFallback}\n- Symbol: ${c.metadata.symbol??"-"}\n- Decimals: ${c.metadata.decimals??"-"}\n- Total supply raw: ${c.metadata.totalSupply??"-"}\n\n## Evidence\n\n${c.classification.evidence.map(e=>`- ${e}`).join("\n")||"- No family-specific evidence."}\n\n## Runtime selectors\n\n${c.selectorDetails.map(s=>`- \`${s.selector}\` — ${s.signature||"unknown"} (${s.confidence}${s.source?`; ${s.source}`:""})${s.candidates?.length>1?` candidates: ${s.candidates.join(" | ")}`:""}`).join("\n")||"- None extracted."}\n\n## Verified ABI functions\n\n${c.sourceFunctionSignatures.map(s=>`- \`${s}\``).join("\n")||"- No verified ABI available."}\n\n## Relationships\n\n- Parent: ${c.probes.parent||"-"}\n- Implementation: ${c.probes.implementation||"-"}\n- Token0: ${c.probes.token0||"-"}\n- Token1: ${c.probes.token1||"-"}\n\n## Risk signals\n\n${c.risks.map(r=>`- **${r.level.toUpperCase()} ${r.code}:** ${r.detail}`).join("\n")||"- No dictionary-based risk signal detected. This is not a safety guarantee."}\n\n## Verification boundary\n\n${c.conclusions.verificationBoundary}\n`;
  writeText(`reports/${c.address}.md`,md);
}
console.error(`[analyze] wrote ${contracts.length} analyses and ${relationships.length} relationships`);

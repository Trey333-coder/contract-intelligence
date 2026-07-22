import { REQUEST_TIMEOUT_MS } from "./config.mjs";

const API = process.env.SELECTOR_API || "https://www.4byte.directory/api/v1/signatures/";
const MAX_LOOKUPS = Math.max(0, Math.min(2000, Number(process.env.MAX_SELECTOR_LOOKUPS || 500)));
const CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.SELECTOR_CONCURRENCY || 4)));

export function canonicalAbiSignature(item) {
  if (!item || item.type !== "function" || !item.name) return null;
  const types = (item.inputs || []).map(input => canonicalType(input)).join(",");
  return `${item.name}(${types})`;
}

function canonicalType(input) {
  const type = String(input?.type || "");
  if (!type.startsWith("tuple")) return type;
  const suffix = type.slice("tuple".length);
  const inner = (input.components || []).map(canonicalType).join(",");
  return `(${inner})${suffix}`;
}

export function abiSignatureSet(abi) {
  return new Set((Array.isArray(abi) ? abi : []).map(canonicalAbiSignature).filter(Boolean));
}

async function lookupOne(selector) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = new URL(API);
    url.searchParams.set("hex_signature", `0x${selector}`);
    const response = await fetch(url, { signal:controller.signal, headers:{accept:"application/json"} });
    if (!response.ok) return [];
    const json = await response.json();
    return [...new Set((json?.results || []).map(r => r.text_signature).filter(Boolean))].slice(0, 12);
  } catch { return []; }
  finally { clearTimeout(timer); }
}

export async function resolveUnknownSelectors(selectors, cache = {}) {
  const unique = [...new Set(selectors)].filter(s => !cache[s]).slice(0, MAX_LOOKUPS);
  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      const selector = unique[cursor++];
      const candidates = await lookupOne(selector);
      cache[selector] = { candidates, source:"4byte.directory", checkedAt:new Date().toISOString() };
    }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY, unique.length)}, worker));
  return cache;
}

export function chooseSelectorSignature(selector, knownSignature, abiSet, cacheEntry) {
  const candidates = [...new Set([knownSignature, ...(cacheEntry?.candidates || [])].filter(Boolean))];
  const abiMatches = candidates.filter(c => abiSet.has(c));
  if (abiMatches.length === 1) return { signature:abiMatches[0], confidence:"verified_abi", source:"verified explorer ABI", candidates };
  if (knownSignature) return { signature:knownSignature, confidence:abiSet.has(knownSignature)?"verified_abi":"verified_dictionary", source:"local signature dictionary", candidates };
  if (candidates.length === 1) return { signature:candidates[0], confidence:"public_database", source:cacheEntry?.source || "public selector database", candidates };
  return { signature:null, confidence:candidates.length?"ambiguous":"unknown", source:cacheEntry?.source || null, candidates };
}

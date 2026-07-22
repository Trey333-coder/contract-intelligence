import { normalizeAddress } from "./io.mjs";

export function extractPush4Selectors(bytecode) {
  const clean = String(bytecode || "").replace(/^0x/, "").toLowerCase();
  const selectors = new Set();
  for (let i = 0; i + 10 <= clean.length; i += 2) {
    if (clean.slice(i, i + 2) === "63") selectors.add(clean.slice(i + 2, i + 10));
  }
  return [...selectors].sort();
}

export function extractPush20Addresses(bytecode, selfAddress = null) {
  const clean = String(bytecode || "").replace(/^0x/, "").toLowerCase();
  const self = normalizeAddress(selfAddress);
  const addresses = new Set();
  for (let i = 0; i + 42 <= clean.length; i += 2) {
    if (clean.slice(i, i + 2) !== "73") continue;
    const candidate = normalizeAddress("0x" + clean.slice(i + 2, i + 42));
    if (!candidate || candidate === self || /^0x0{40}$/.test(candidate)) continue;
    addresses.add(candidate);
  }
  return [...addresses].sort();
}

export function bytecodeFingerprint(bytecode) {
  const clean = String(bytecode || "").replace(/^0x/, "").toLowerCase();
  if (!clean) return null;
  // Normalize common immutable/address pushes to group related runtime variants.
  const normalized = clean.replace(/73[0-9a-f]{40}/g, "73" + "0".repeat(40));
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}-${clean.length / 2}`;
}

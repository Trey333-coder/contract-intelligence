export const RPCS = (process.env.PULSE_RPC || [
  "https://rpc-pulsechain.g4mm4.io",
  "https://pulsechain-rpc.publicnode.com",
  "https://rpc.pulsechain.com"
].join(",")).split(",").map(s => s.trim()).filter(Boolean);

export const EXPLORER_API = process.env.EXPLORER_API || "https://api.scan.pulsechain.com/api";
export const TOKENS_FILE = process.env.TOKENS_FILE || "data/atropa-tokens.json";
export const RAW_FILE = process.env.RAW_FILE || "data/contracts-raw.json";
export const ANALYSIS_FILE = process.env.ANALYSIS_FILE || "data/contracts-analysis.json";
export const RELATIONSHIPS_FILE = process.env.RELATIONSHIPS_FILE || "data/relationships.json";
export const SITE_DATA_FILE = process.env.SITE_DATA_FILE || "public/contracts.json";
export const MAX_CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.CONCURRENCY || 4)));
export const DISCOVERY_DEPTH = Math.max(0, Math.min(3, Number(process.env.DISCOVERY_DEPTH || 1)));
export const MAX_DISCOVERED = Math.max(292, Math.min(10000, Number(process.env.MAX_DISCOVERED || 1500)));
export const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.REQUEST_TIMEOUT_MS || 15000));

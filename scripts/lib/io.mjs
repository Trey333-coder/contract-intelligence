import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function readJson(path, fallback = null) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { if (fallback !== null) return fallback; throw error; }
}
export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v, 2) + "\n");
}
export function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}
export function nowIso() { return new Date().toISOString(); }
export function normalizeAddress(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^0x[0-9a-fA-F]{40}$/);
  return m ? value.toLowerCase() : null;
}

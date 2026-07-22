#!/usr/bin/env node
import { readJson, writeJson } from "./lib/io.mjs";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { ANALYSIS_FILE, RELATIONSHIPS_FILE, SITE_DATA_FILE } from "./lib/config.mjs";
import { functionGlossary } from "./lib/function-key.mjs";
const analysis = readJson(ANALYSIS_FILE);
const graph = readJson(RELATIONSHIPS_FILE, {relationships:[]});
writeJson(SITE_DATA_FILE, { ...analysis, relationships:graph.relationships });
writeJson("public/function-key.json", {generatedAt:new Date().toISOString(), entries:functionGlossary()});
console.error(`[build] wrote ${SITE_DATA_FILE}`);

if (existsSync("reports")) {
  mkdirSync("public/reports", { recursive: true });
  cpSync("reports", "public/reports", { recursive: true, force: true });
  console.error("[build] copied reports into public/reports");
}

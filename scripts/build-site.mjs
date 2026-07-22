#!/usr/bin/env node
import { readJson, writeJson } from "./lib/io.mjs";
import { ANALYSIS_FILE, RELATIONSHIPS_FILE, SITE_DATA_FILE } from "./lib/config.mjs";
const analysis = readJson(ANALYSIS_FILE);
const graph = readJson(RELATIONSHIPS_FILE, {relationships:[]});
writeJson(SITE_DATA_FILE, { ...analysis, relationships:graph.relationships });
console.error(`[build] wrote ${SITE_DATA_FILE}`);

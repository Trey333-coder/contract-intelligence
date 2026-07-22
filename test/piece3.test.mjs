import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("Piece 3 compact UI controls and workbook resource are packaged", () => {
  const html = readFileSync("public/index.html", "utf8");
  const js = readFileSync("public/app.js", "utf8");
  assert.match(html, /id="pageSize"/);
  assert.match(html, /Download ecosystem workbook/);
  assert.match(js, /renderExact/);
  assert.match(js, /panelBuilders/);
  assert.match(js, /atropa-live\.json/);
  assert.ok(existsSync("public/downloads/Atropa_Ecosystem_v2_live_pull_ready.xlsx"));
});

test("Live workflow is read-only and publishes web data", () => {
  const yml = readFileSync(".github/workflows/atropa-live-pull.yml", "utf8");
  assert.match(yml, /node scripts\/atropa-live-pull\.mjs/);
  assert.match(yml, /cp data\/atropa-live\.json public\/atropa-live\.json/);
  assert.doesNotMatch(yml, /private.?key|sendTransaction|approve\(/i);
});

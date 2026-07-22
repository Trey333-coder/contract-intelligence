import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { explainFunction, functionGlossary } from "../scripts/lib/function-key.mjs";

test("function key explains common ERC20 and Atropa functions",()=>{
  assert.match(explainFunction("transfer(address,uint256)","verified_abi").effect,/Moves tokens/);
  assert.match(explainFunction("Claim(uint256)","verified_abi").caution,/approval|output/i);
  assert.ok(functionGlossary().length >= 30);
});

test("Piece 4 UI includes visible search and function key",()=>{
  const html=readFileSync("public/index.html","utf8");
  const js=readFileSync("public/app.js","utf8");
  assert.match(html,/id="searchButton"/);
  assert.match(html,/id="functionKeyButton"/);
  assert.match(html,/Contract Function Key/);
  assert.match(js,/functionInfo/);
  assert.match(js,/renderFunctionKey/);
});

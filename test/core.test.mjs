import test from "node:test";
import assert from "node:assert/strict";
import { extractPush4Selectors, extractPush20Addresses, bytecodeFingerprint } from "../scripts/lib/bytecode.mjs";
import { decodeString, decodeAddress, decodeUint } from "../scripts/lib/abi.mjs";
import { classifyContract } from "../scripts/lib/classify.mjs";
import { analyzeUnicode } from "../scripts/lib/unicode.mjs";

test("extracts PUSH4 selectors",()=>assert.deepEqual(extractPush4Selectors("0x63a9059cbb146318160ddd"),["18160ddd","a9059cbb"]));
test("extracts PUSH20 addresses",()=>assert.deepEqual(extractPush20Addresses("0x73"+"11".repeat(20)),["0x"+"11".repeat(20)]));
test("normalizes bytecode fingerprints",()=>assert.equal(bytecodeFingerprint("0x73"+"11".repeat(20)),bytecodeFingerprint("0x73"+"22".repeat(20))));
test("decodes address and uint",()=>{assert.equal(decodeAddress("0x"+"0".repeat(24)+"12".repeat(20)),"0x"+"12".repeat(20));assert.equal(decodeUint("0x"+"0".repeat(63)+"a"),10n)});
test("classifies AMM pair",()=>assert.equal(classifyContract(["0dfe1681","d21220a7","0902f1ac","022c0d9f"]).family,"amm_pair"));
test("detects mixed Unicode",()=>assert.equal(analyzeUnicode("LEGAL 法").mixedScript,true));

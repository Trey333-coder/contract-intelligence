import test from "node:test";
import assert from "node:assert/strict";
import { analyzeUnicode } from "../scripts/lib/unicode.mjs";
import { abiSignatureSet, chooseSelectorSignature, canonicalAbiSignature } from "../scripts/lib/selector-resolver.mjs";

test("decodes Thaana lol reading",()=>{const a=analyzeUnicode("ލޮލް");assert.equal(a.transliteration,"lol");assert.match(a.meaningHint,/lol/i);assert.ok(a.scripts.includes("Thaana"));});
test("normalizes circled Hangul",()=>assert.equal(analyzeUnicode("㉾").normalized,"우"));
test("canonicalizes tuple ABI signatures",()=>assert.equal(canonicalAbiSignature({type:"function",name:"f",inputs:[{type:"tuple[]",components:[{type:"address"},{type:"uint256"}]}]}),"f((address,uint256)[])"));
test("ABI match outranks public candidates",()=>{const abi=abiSignatureSet([{type:"function",name:"foo",inputs:[{type:"uint256"}]}]);const r=chooseSelectorSignature("12345678",null,abi,{source:"test",candidates:["bar()","foo(uint256)"]});assert.equal(r.signature,"foo(uint256)");assert.equal(r.confidence,"verified_abi");});

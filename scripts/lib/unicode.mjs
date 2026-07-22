const SCRIPT_TESTS = [
  ["Latin", /\p{Script=Latin}/u], ["Greek", /\p{Script=Greek}/u], ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Arabic", /\p{Script=Arabic}/u], ["Hebrew", /\p{Script=Hebrew}/u], ["Han/CJK", /\p{Script=Han}/u],
  ["Hangul", /\p{Script=Hangul}/u], ["Thai", /\p{Script=Thai}/u], ["Devanagari", /\p{Script=Devanagari}/u]
];
export function analyzeUnicode(value) {
  const text = String(value || "");
  const scripts = SCRIPT_TESTS.filter(([, test]) => test.test(text)).map(([name]) => name);
  const codePoints = [...text].slice(0, 32).map(ch => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
  const privateUse = [...text].some(ch => { const n = ch.codePointAt(0); return (n>=0xE000&&n<=0xF8FF)||(n>=0xF0000&&n<=0xFFFFD)||(n>=0x100000&&n<=0x10FFFD); });
  return { normalized: text.normalize("NFKC"), scripts, codePoints, privateUse, mixedScript: scripts.length > 1 };
}

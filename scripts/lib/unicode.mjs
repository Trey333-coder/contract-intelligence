const SCRIPT_TESTS = [
  ["Latin", /\p{Script=Latin}/u], ["Greek", /\p{Script=Greek}/u], ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Arabic", /\p{Script=Arabic}/u], ["Thaana", /\p{Script=Thaana}/u], ["Hebrew", /\p{Script=Hebrew}/u],
  ["Syriac", /\p{Script=Syriac}/u], ["Han/CJK", /\p{Script=Han}/u], ["Hangul", /\p{Script=Hangul}/u],
  ["Hiragana", /\p{Script=Hiragana}/u], ["Katakana", /\p{Script=Katakana}/u], ["Thai", /\p{Script=Thai}/u],
  ["Lao", /\p{Script=Lao}/u], ["Devanagari", /\p{Script=Devanagari}/u], ["Bengali", /\p{Script=Bengali}/u],
  ["Armenian", /\p{Script=Armenian}/u], ["Georgian", /\p{Script=Georgian}/u], ["Braille", /[\u2800-\u28FF]/u]
];

const EXACT_READINGS = Object.freeze({
  "ލޮލް": { transliteration:"lol", meaning:"A Thaana-script rendering that reads approximately ‘lol’." },
  "유": { transliteration:"yu", meaning:"Korean Hangul syllable ‘yu’; no single fixed meaning without a Hanja/context key." },
  "㉾": { transliteration:"u", meaning:"Circled Hangul IEUNG U; compatibility-normalizes to 우." },
  "問題": { transliteration:"wèntí", meaning:"Chinese: question or problem." },
  "问题": { transliteration:"wèntí", meaning:"Chinese: question or problem." },
  "ΠΝΕΥΜΑ": { transliteration:"pneuma", meaning:"Greek: spirit, breath, or wind." }
});

const GREEK = {Α:"A",Β:"B",Γ:"G",Δ:"D",Ε:"E",Ζ:"Z",Η:"E",Θ:"Th",Ι:"I",Κ:"K",Λ:"L",Μ:"M",Ν:"N",Ξ:"X",Ο:"O",Π:"P",Ρ:"R",Σ:"S",Τ:"T",Υ:"Y",Φ:"Ph",Χ:"Ch",Ψ:"Ps",Ω:"O",α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",ς:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
const CYRILLIC = {А:"A",Б:"B",В:"V",Г:"G",Д:"D",Е:"E",Ё:"Yo",Ж:"Zh",З:"Z",И:"I",Й:"Y",К:"K",Л:"L",М:"M",Н:"N",О:"O",П:"P",Р:"R",С:"S",Т:"T",У:"U",Ф:"F",Х:"Kh",Ц:"Ts",Ч:"Ch",Ш:"Sh",Щ:"Shch",Ы:"Y",Э:"E",Ю:"Yu",Я:"Ya"};

function basicTransliteration(text) {
  if (EXACT_READINGS[text]?.transliteration) return EXACT_READINGS[text].transliteration;
  let out = "";
  for (const ch of text) {
    const upper = CYRILLIC[ch.toUpperCase()];
    if (GREEK[ch]) out += GREEK[ch];
    else if (upper) out += ch === ch.toLowerCase() ? upper.toLowerCase() : upper;
    else if (ch.codePointAt(0) < 128) out += ch;
    else out += "";
  }
  return out.trim() || null;
}

export function analyzeUnicode(value) {
  const text = String(value || "");
  const normalized = text.normalize("NFKC");
  const scripts = SCRIPT_TESTS.filter(([, test]) => test.test(text)).map(([name]) => name);
  const characters = [...text].slice(0, 48).map(ch => ({ char:ch, codePoint:`U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4,"0")}` }));
  const privateUse = [...text].some(ch => { const n=ch.codePointAt(0); return (n>=0xE000&&n<=0xF8FF)||(n>=0xF0000&&n<=0xFFFFD)||(n>=0x100000&&n<=0x10FFFD); });
  const controls = [...text].filter(ch => /\p{Cc}|\p{Cf}/u.test(ch)).map(ch => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4,"0")}`);
  const exact = EXACT_READINGS[text] || EXACT_READINGS[normalized] || null;
  const transliteration = exact?.transliteration || basicTransliteration(text);
  return {
    original:text, normalized, normalizationChanged:normalized !== text, scripts, characters,
    codePoints:characters.map(c=>c.codePoint), privateUse, controls, mixedScript:scripts.length > 1,
    transliteration, meaningHint:exact?.meaning || null,
    safeFallback:characters.map(c=>c.codePoint).join(" ") || "(empty)"
  };
}

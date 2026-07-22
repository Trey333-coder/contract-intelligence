const strip0x = value => String(value || "").replace(/^0x/, "");
export const pad64 = value => strip0x(value).padStart(64, "0");
export const encodeAddress = address => pad64(address.toLowerCase());
export const encodeUint = value => pad64(BigInt(value).toString(16));
export const decodeUint = hex => !hex || hex === "0x" ? null : BigInt("0x" + strip0x(hex).slice(0, 64));
export const decodeBool = hex => decodeUint(hex) === 1n;
export const decodeAddress = hex => {
  const clean = strip0x(hex);
  return clean.length < 64 ? null : "0x" + clean.slice(24, 64).toLowerCase();
};
export const decodeString = hex => {
  try {
    const clean = strip0x(hex);
    if (!clean) return null;
    if (clean.length === 64) {
      const bytes = Buffer.from(clean, "hex");
      return bytes.toString("utf8").replace(/\0+$/g, "") || null;
    }
    const offset = Number(BigInt("0x" + clean.slice(0, 64))) * 2;
    const length = Number(BigInt("0x" + clean.slice(offset, offset + 64)));
    return Buffer.from(clean.slice(offset + 64, offset + 64 + length * 2), "hex").toString("utf8");
  } catch { return null; }
};

export const SELECTORS = Object.freeze({
  name: "0x06fdde03", symbol: "0x95d89b41", decimals: "0x313ce567", totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b", implementation: "0x5c60da1b", token0: "0x0dfe1681", token1: "0xd21220a7",
  factory: "0xc45a0155", getReserves: "0x0902f1ac", parent: "0xd8e895d7", Parent: "0x4061f95d",
  multiplier: "0x1df4f144", count: "0x06661abd", at: "0x28468a7b", get: "0x7fc3865b"
});

export const KNOWN_SIGNATURES = Object.freeze({
  "06fdde03":"name()", "95d89b41":"symbol()", "313ce567":"decimals()", "18160ddd":"totalSupply()",
  "70a08231":"balanceOf(address)", "a9059cbb":"transfer(address,uint256)", "23b872dd":"transferFrom(address,address,uint256)",
  "095ea7b3":"approve(address,uint256)", "dd62ed3e":"allowance(address,address)", "8da5cb5b":"owner()",
  "715018a6":"renounceOwnership()", "f2fde38b":"transferOwnership(address)", "40c10f19":"mint(address,uint256)",
  "42966c68":"burn(uint256)", "79cc6790":"burnFrom(address,uint256)", "0dfe1681":"token0()", "d21220a7":"token1()",
  "0902f1ac":"getReserves()", "022c0d9f":"swap(uint256,uint256,address,bytes)", "6a627842":"mint(address)",
  "89afcb44":"burn(address)", "c45a0155":"factory()", "5c60da1b":"implementation()", "3659cfe6":"upgradeTo(address)",
  "4f1ef286":"upgradeToAndCall(address,bytes)", "8456cb59":"pause()", "3f4ba83a":"unpause()",
  "06661abd":"count()", "28468a7b":"at(uint256)", "7fc3865b":"get(address)",
  "a0712d68":"mint(uint256)", "379607f5":"Claim(uint256)", "2e1a7d4d":"withdraw(uint256)"
});

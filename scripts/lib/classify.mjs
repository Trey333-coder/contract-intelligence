const hasAll = (set, values) => values.every(value => set.has(value));
const hasAny = (set, values) => values.some(value => set.has(value));

export function classifyContract(selectorList, probes = {}) {
  const s = new Set(selectorList);
  const evidence = [];
  let family = "unknown_contract";
  let confidence = "low";

  if (hasAll(s, ["0dfe1681", "d21220a7", "0902f1ac", "022c0d9f"])) {
    family = "amm_pair"; confidence = "high"; evidence.push("Uniswap-V2-compatible token0/token1/getReserves/swap selectors");
  } else if (hasAny(s, ["3659cfe6", "4f1ef286"]) || probes.implementation) {
    family = "upgradeable_proxy_or_implementation"; confidence = "medium"; evidence.push("upgrade or implementation evidence");
  } else if (hasAll(s, ["06661abd", "28468a7b", "7fc3865b"])) {
    family = "mint_into_lp_registry"; confidence = "high"; evidence.push("count/at/get registry selector trio");
  } else if (hasAll(s, ["06fdde03", "95d89b41", "18160ddd", "70a08231", "a9059cbb"])) {
    family = "erc20_token"; confidence = "high"; evidence.push("ERC-20 selector set");
  }

  if (probes.parent) evidence.push("parent address responded");
  if (probes.multiplier !== null && probes.multiplier !== undefined) evidence.push("multiplier responded");
  if (family === "erc20_token" && probes.parent && probes.multiplier !== null) {
    family = "atropa_minter_family_candidate"; confidence = "medium";
  }
  return { family, confidence, evidence };
}

export function riskSignals(selectorList, probes = {}) {
  const s = new Set(selectorList);
  const risks = [];
  if (hasAny(s, ["3659cfe6", "4f1ef286"])) risks.push({ level:"high", code:"UPGRADEABLE", detail:"Implementation may be changeable." });
  if (hasAny(s, ["40c10f19", "a0712d68"])) risks.push({ level:"medium", code:"MINT_PATH", detail:"Mint selector detected; authority and limits require source/storage review." });
  if (hasAny(s, ["8456cb59", "3f4ba83a"])) risks.push({ level:"medium", code:"PAUSABLE", detail:"Pause controls may restrict transfers or actions." });
  if (probes.owner && !/^0x0{40}$/.test(probes.owner)) risks.push({ level:"info", code:"OWNER_PRESENT", detail:`Owner/admin address responded: ${probes.owner}` });
  if (probes.registryCount > 0) risks.push({ level:"medium", code:"LP_REGISTRY_ARMED", detail:`Registry exposes ${probes.registryCount} configured pair(s).` });
  return risks;
}

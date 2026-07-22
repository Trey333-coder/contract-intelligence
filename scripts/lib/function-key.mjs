const KEY = {
  "name()": {category:"Metadata", access:"Anyone (read-only)", effect:"Returns the contract or token name.", caution:"Display metadata only; it does not prove identity or legitimacy."},
  "symbol()": {category:"Metadata", access:"Anyone (read-only)", effect:"Returns the short token symbol.", caution:"Symbols can be duplicated across different contracts."},
  "decimals()": {category:"Metadata", access:"Anyone (read-only)", effect:"Returns how raw integer token units are displayed as decimal amounts.", caution:"The on-chain value is authoritative for formatting this contract's units."},
  "totalSupply()": {category:"Supply", access:"Anyone (read-only)", effect:"Returns the current total supply recorded by the contract.", caution:"This is total supply, not necessarily circulating supply."},
  "balanceOf(address)": {category:"Balances", access:"Anyone (read-only)", effect:"Returns the token balance recorded for an address.", caution:"The returned value uses the token's raw units and decimals."},
  "allowance(address,address)": {category:"Approvals", access:"Anyone (read-only)", effect:"Returns how many tokens an owner has authorized a spender to use.", caution:"A large allowance permits the spender to transfer up to that amount, subject to contract rules."},
  "approve(address,uint256)": {category:"Approvals", access:"Token holder (state-changing)", effect:"Sets or replaces the amount a spender is allowed to transfer from the caller.", caution:"Approval does not move tokens immediately, but it grants spending authority."},
  "transfer(address,uint256)": {category:"Transfers", access:"Token holder (state-changing)", effect:"Moves tokens from the caller to another address.", caution:"Taxes, restrictions, pauses, or custom transfer logic may apply."},
  "transferFrom(address,address,uint256)": {category:"Transfers", access:"Approved spender (state-changing)", effect:"Moves tokens from one address to another using an allowance or other authorization.", caution:"Usually reduces allowance; custom contracts may behave differently."},
  "owner()": {category:"Administration", access:"Anyone (read-only)", effect:"Returns the address recognized as the owner or administrator.", caution:"Owner powers must be determined from the actual callable functions and source."},
  "transferOwnership(address)": {category:"Administration", access:"Usually current owner (state-changing)", effect:"Transfers administrative ownership to another address.", caution:"Changes who may control owner-restricted functions."},
  "renounceOwnership()": {category:"Administration", access:"Usually current owner (state-changing)", effect:"Sets ownership to no owner, commonly the zero address.", caution:"Often irreversible; verify implementation and pending-owner patterns."},
  "mint(address,uint256)": {category:"Supply", access:"Contract-defined authority (state-changing)", effect:"Creates tokens and credits them to an address.", caution:"Authority, caps, cost, and conditions must be read from verified code or behavior."},
  "mint(uint256)": {category:"Atropa / Supply", access:"Contract-defined caller (state-changing)", effect:"Requests creation of a specified amount under the contract's mint rules.", caution:"May require parent tokens, payment, multiplier cost, or other prerequisites."},
  "mint(address)": {category:"AMM / Supply", access:"Liquidity provider or contract-defined caller (state-changing)", effect:"Commonly mints LP tokens to an address after assets are deposited into a pair.", caution:"Exact behavior depends on the contract family; do not assume it is ordinary token minting."},
  "burn(uint256)": {category:"Supply", access:"Token holder or authorized caller (state-changing)", effect:"Destroys a specified amount of tokens under the contract's rules.", caution:"Burning generally cannot be reversed."},
  "burnFrom(address,uint256)": {category:"Supply", access:"Approved or privileged caller (state-changing)", effect:"Destroys tokens held by another address using allowance or authority.", caution:"Check who is permitted to burn another holder's tokens."},
  "burn(address)": {category:"AMM / Supply", access:"Liquidity holder or contract-defined caller (state-changing)", effect:"Commonly burns LP tokens and sends the underlying assets to an address.", caution:"Exact behavior depends on the pair or custom contract."},
  "Claim(uint256)": {category:"Atropa / Redemption", access:"Token holder (state-changing)", effect:"Requests a claim or redemption for the specified amount.", caution:"The required token, output asset, burn behavior, and approval path must be verified for this contract."},
  "withdraw(uint256)": {category:"Withdrawal", access:"Depositor or authorized caller (state-changing)", effect:"Withdraws a specified amount of an asset or recorded balance.", caution:"Asset type, fees, locks, and recipient rules depend on contract code."},
  "pause()": {category:"Administration", access:"Privileged caller (state-changing)", effect:"Activates the contract's paused state.", caution:"May block transfers or other operations depending on implementation."},
  "unpause()": {category:"Administration", access:"Privileged caller (state-changing)", effect:"Removes the paused state.", caution:"Scope depends on the contract implementation."},
  "implementation()": {category:"Proxy", access:"Anyone (read-only)", effect:"Returns the implementation address used by a proxy or upgrade pattern.", caution:"Analyze the implementation code as well as the proxy."},
  "upgradeTo(address)": {category:"Proxy", access:"Privileged caller (state-changing)", effect:"Changes the implementation address used by an upgradeable contract.", caution:"Can materially change future behavior while preserving the same contract address."},
  "upgradeToAndCall(address,bytes)": {category:"Proxy", access:"Privileged caller (state-changing)", effect:"Changes implementation and immediately executes initialization or migration data.", caution:"Powerful upgrade path; authorization and implementation must be reviewed."},
  "token0()": {category:"AMM Pair", access:"Anyone (read-only)", effect:"Returns the first asset address in a liquidity pair.", caution:"Token order affects reserve and swap calculations."},
  "token1()": {category:"AMM Pair", access:"Anyone (read-only)", effect:"Returns the second asset address in a liquidity pair.", caution:"Token order affects reserve and swap calculations."},
  "getReserves()": {category:"AMM Pair", access:"Anyone (read-only)", effect:"Returns the pair's recorded reserves and usually the last update timestamp.", caution:"Reserves are on-chain balances used by the AMM; price impact still depends on swap rules."},
  "swap(uint256,uint256,address,bytes)": {category:"AMM Pair", access:"Anyone meeting pair rules (state-changing)", effect:"Requests output amounts from a liquidity pair and sends them to a recipient.", caution:"Requires sufficient input, invariant compliance, and may enable flash-swap callbacks."},
  "factory()": {category:"AMM Pair", access:"Anyone (read-only)", effect:"Returns the factory that created or governs the pair.", caution:"Useful for confirming whether an address is a recognized LP pair."},
  "count()": {category:"Registry", access:"Anyone (read-only)", effect:"Returns the number of entries recorded by a registry-like contract.", caution:"The meaning of each entry is defined by the contract; the chain-returned count should be preserved as reported."},
  "at(uint256)": {category:"Registry", access:"Anyone (read-only)", effect:"Returns the registry entry address stored at a numeric index.", caution:"Index range and ordering come from the contract."},
  "get(address)": {category:"Registry", access:"Anyone (read-only)", effect:"Returns registry data associated with an address.", caution:"Return structure varies by contract family and should be decoded from verified ABI when available."},
  "parent()": {category:"Atropa Relationship", access:"Anyone (read-only)", effect:"Returns a parent or related contract address where implemented.", caution:"Relationship meaning must be confirmed from source or family behavior."},
  "Parent()": {category:"Atropa Relationship", access:"Anyone (read-only)", effect:"Returns a parent or related contract address using capitalized naming.", caution:"Relationship meaning must be confirmed from source or family behavior."},
  "multiplier()": {category:"Atropa Economics", access:"Anyone (read-only)", effect:"Returns a multiplier used by the contract's economic or minting logic.", caution:"The scale and application of the returned value depend on contract code."}
};

const baseName = signature => String(signature || "").replace(/^function\s+/, "").split("(")[0];
export function explainFunction(signature, confidence="unknown") {
  if (!signature) return {category:"Unknown", access:"Unknown", effect:"The function signature has not been resolved.", caution:"Do not infer behavior from the 4-byte selector alone.", explanationConfidence:"unknown"};
  const exact = KEY[signature];
  if (exact) return {...exact, explanationConfidence: confidence === "verified_abi" ? "verified signature + glossary" : "known signature glossary"};
  const name = baseName(signature);
  const lower = name.toLowerCase();
  let info;
  if (/^(get|is|has|can|view|read|quote|preview|calculate|compute)/.test(lower)) info={category:"Read / Calculation",access:"Likely read-only; verify ABI mutability",effect:`Reads or calculates data through ${name}.`,caution:"The exact return values and conditions require the ABI or source."};
  else if (/^(set|update|change|configure|config)/.test(lower)) info={category:"Configuration",access:"State-changing; authorization unknown",effect:`Changes contract configuration through ${name}.`,caution:"Verify caller restrictions and which storage values can change."};
  else if (/^(claim|redeem|withdraw|unstake)/.test(lower)) info={category:"Claim / Withdrawal",access:"State-changing; contract rules apply",effect:`Claims, redeems, or withdraws value through ${name}.`,caution:"Verify required approvals, input asset, recipient, and output calculation."};
  else if (/^(buy|sell|swap|trade)/.test(lower)) info={category:"Trading",access:"State-changing; market rules apply",effect:`Performs a trade-related action through ${name}.`,caution:"Verify token direction, taxes, slippage, recipient, and liquidity source."};
  else if (/^(add|register|connect|create|new)/.test(lower)) info={category:"Creation / Registry",access:"State-changing; authorization unknown",effect:`Adds, creates, connects, or registers data through ${name}.`,caution:"Verify who may call it and what persistent relationship is created."};
  else if (/^(remove|delete|disable|disconnect)/.test(lower)) info={category:"Removal / Registry",access:"State-changing; authorization unknown",effect:`Removes or disables data through ${name}.`,caution:"Verify whether removal is reversible and who controls it."};
  else info={category:"Custom Function",access:"Unknown until ABI mutability/source is inspected",effect:`Custom contract function named ${name}.`,caution:"Its name is a clue, not proof of internal behavior."};
  return {...info, explanationConfidence: confidence === "verified_abi" ? "verified name; meaning inferred" : "inferred from resolved signature"};
}

export function functionGlossary(){return Object.entries(KEY).map(([signature,value])=>({signature,...value,explanationConfidence:"curated glossary"}));}

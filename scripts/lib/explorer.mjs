import { EXPLORER_API, REQUEST_TIMEOUT_MS } from "./config.mjs";

async function request(params) {
  const url = new URL(EXPLORER_API);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function getSourceAndAbi(address) {
  const source = await request({ module:"contract", action:"getsourcecode", address });
  const item = Array.isArray(source?.result) ? source.result[0] : null;
  let abi = null;
  try { if (item?.ABI && item.ABI !== "Contract source code not verified") abi = JSON.parse(item.ABI); } catch {}
  return {
    verified: Boolean(item?.SourceCode && item.SourceCode !== ""),
    contractName: item?.ContractName || null,
    compilerVersion: item?.CompilerVersion || null,
    proxy: item?.Proxy === "1",
    implementation: item?.Implementation?.toLowerCase?.() || null,
    sourceCode: item?.SourceCode || null,
    abi
  };
}

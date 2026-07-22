import { RPCS, REQUEST_TIMEOUT_MS } from "./config.mjs";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let nextRpc = 0;
let requestId = 1;

async function post(url, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export async function rpc(method, params = []) {
  let lastError;
  for (let attempt = 0; attempt < RPCS.length * 2; attempt++) {
    const url = RPCS[nextRpc++ % RPCS.length];
    try {
      const result = await post(url, { jsonrpc: "2.0", id: requestId++, method, params });
      if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));
      return result.result;
    } catch (error) {
      lastError = error;
      await sleep(Math.min(2000, 250 * (attempt + 1)));
    }
  }
  throw lastError || new Error("All RPC endpoints failed");
}

export async function ethCall(to, data) {
  try { return await rpc("eth_call", [{ to, data }, "latest"]); }
  catch { return null; }
}
export async function getCode(address) {
  try { return await rpc("eth_getCode", [address, "latest"]); }
  catch { return null; }
}
export async function mapConcurrent(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try { output[i] = await fn(items[i], i); }
      catch (error) { output[i] = { error: error?.message || String(error) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

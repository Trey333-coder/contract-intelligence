# Atropa Contract Intelligence Bot

A **read-only** PulseChain discovery and contract-analysis project for the Atropa ecosystem.

## Safety boundary

- No signer or wallet connection
- No private keys
- No transactions, approvals, minting, claiming, sweeping, or selling
- No guessed parent, child, recipe, or sweep index is presented as verified
- Every relationship carries evidence and confidence

## What it does

1. Seeds discovery from `data/atropa-tokens.json` (292 known contracts).
2. Pulls runtime bytecode and safe `eth_call` probes.
3. Extracts function selectors and embedded `PUSH20` addresses.
4. Queries verified source/ABI from the configured explorer when available.
5. Discovers parents, proxy implementations, AMM pair tokens, and bytecode-linked contracts.
6. Classifies ERC-20, LP pair, registry, proxy, and Atropa-minter candidates.
7. Decodes Unicode metadata and flags mixed/private-use glyphs.
8. Builds evidence-based relationships, risk signals, JSON outputs, Markdown reports, and a searchable web UI.

## Run locally

```bash
npm test
npm run all
npm run serve
```

Open `http://localhost:4173`.

## Configuration

```bash
PULSE_RPC=https://your-rpc.example npm run all
DISCOVERY_DEPTH=0 npm run all
CONCURRENCY=4 npm run all
EXPLORER_API=https://api.scan.pulsechain.com/api npm run all
```

Discovery depth defaults to 1. Start with `0` for a faster seed-only scan.

## Generated outputs

- `data/contracts-raw.json` — direct RPC/explorer evidence
- `data/contracts-analysis.json` — normalized analysis
- `data/relationships.json` — evidence-bearing contract graph
- `reports/<address>.md` — readable per-contract reports
- `public/contracts.json` — UI dataset

## Verification labels

- **High:** successful standard call, verified source, or strong selector set
- **Medium:** bytecode-family or combined-selector inference
- **Low:** embedded-address or metadata-only inference
- **Unknown:** insufficient evidence

## Test checklist

1. Run `npm test`; all tests must pass.
2. Run `DISCOVERY_DEPTH=0 npm run all`.
3. Confirm `data/contracts-raw.json`, `data/contracts-analysis.json`, and `data/relationships.json` exist.
4. Confirm generated reports contain no transaction instructions.
5. Run `npm run serve` and search for `Atropa`, `LEGAL`, an address, `erc20_token`, and selector `a9059cbb`.
6. Check that unknown selectors remain labeled `unknown` rather than invented.
7. Check that every graph edge includes evidence and confidence.

## Current limitations

- Unverified bytecode cannot be perfectly converted back to original Solidity.
- Selector collisions are possible.
- Embedded `PUSH20` constants are clues, not definitive relationships.
- Exact V1/V2/V3/V4 and recipe classification requires verified family signatures/ABIs or confirmed contract behavior. The project intentionally fails closed until those dictionaries are added.

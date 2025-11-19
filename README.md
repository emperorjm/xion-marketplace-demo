# Xion Marketplace Console

Nest + React tooling to exercise the `asset` + `marketplace` CosmWasm contracts in this repo. It focuses on functionality over design and includes contract-aware forms, plugin management, and simple logging.

## Structure

```
ui/marketplace-console
├── package.json          # Nest server + static hosting for client build
├── src                   # Minimal Nest app (serve static + /api/health)
└── client                # Vite + React front-end with CosmJS
```

The Nest server only serves the compiled client bundle. All blockchain interactions happen in the browser via CosmJS.

## Getting Started

```bash
cd ui/marketplace-console
npm install                 # Nest dependencies
npm --prefix client install # client dependencies
npm run client:dev          # (runs client dev server via Vite)
# in another terminal you can start Nest once the client is built
npm run start:dev           # serves API + any pre-built assets on http://localhost:3000
```

To serve the React bundle through Nest, build the client first:

```bash
npm run client:build
npm run build
NODE_ENV=production npm start
```

For production-style testing:

```bash
npm run client:build
npm run build        # builds Nest into dist/
NODE_ENV=production npm start
```

## Using the Console

1. **Configure chain + contracts** – provide RPC endpoint, chain ID, gas price, Bech32 prefix, and (optionally) existing contract addresses.
2. **Connect a wallet** – use Keplr (preferred) or a development mnemonic. Never use production secrets.
3. **Instantiate contracts** – supply the stored code IDs to deploy fresh asset/marketplace instances (forms accept labels/admins and auto-update the config section if desired).
4. **Asset operations** – Mint NFTs, manage token approvals/operators, configure collection plugins, and use asset-extension flows (list/reserve/delist/buy).
5. **Monitor plugins & payouts** – Inspect collection plugins and snapshot balances for royalty + marketplace fee addresses (no polling required).
6. **Visualize inventory** – Use the gallery to query all tokens, owner-specific tokens, or only listed items and view metadata/placeholder imagery.
7. **Marketplace operations** – Cover every `ExecuteMsg` variant: create/cancel listings, buy/finalize sales, offers/collection offers, approvals queue, and config updates.
8. **Queries** – Run arbitrary smart queries against either contract (or a custom address) with a JSON payload builder.

Each submit logs the tx hash/result in the Execution Log for quick debugging.

## Notes

- The UI only targets the marketplace requirements for the asset contract (minting, approvals, plugin + listing extensions). Generic CW721 actions outside this scope were intentionally omitted.
- CosmJS runs fully client-side. Provide the RPC URL of your Xion node; REST is not needed.
- Plugin helpers support all variants defined in `contracts/asset/src/plugin.rs` (exact/min price, proof, not-before/after, timelock, royalty, marketplace/currency allowlists).
- Sale approvals in the marketplace use the dedicated forms (Approve/Reject).
- Because this lives outside Cargo workspaces, it will not interfere with Rust builds/tests.

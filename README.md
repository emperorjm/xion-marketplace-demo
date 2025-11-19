# Xion Marketplace Console

React + Vite application to exercise the `asset` + `marketplace` CosmWasm contracts. It focuses on functionality over design and includes contract-aware forms, plugin management, and simple logging.

## Structure

```
xion-marketplace-demo/
├── package.json          # Vite + React dependencies
├── vite.config.ts        # Vite configuration
├── src/                  # React application source
├── public/               # Static assets
└── index.html            # Entry HTML file
```

All blockchain interactions happen in the browser via CosmJS. No backend required.

## Getting Started

```bash
npm install              # Install dependencies
npm run dev             # Start dev server on http://localhost:5173
```

For production build:

```bash
npm run build           # Build for production (outputs to dist/)
npm run preview         # Preview production build locally
```

## Deployment

This is a static site that can be deployed to:
- **Vercel** (recommended): `vercel deploy`
- **Netlify**: Deploy the `dist/` folder
- **AWS S3 + CloudFront**
- **GitHub Pages**
- Any static hosting service

Simply deploy the `dist/` folder after running `npm run build`.

## Configuration

Copy `.env.example` to `.env.local` and configure:
- RPC endpoint
- Chain ID
- Contract addresses
- Gas price
- Bech32 prefix

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

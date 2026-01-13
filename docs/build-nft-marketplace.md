# Build an NFT Marketplace on XION

Learn how to build a full-featured NFT marketplace on XION with React, Express.js, and CosmWasm smart contracts. This guide covers everything from project setup to deployment.

## Overview

This guide walks you through building a production-ready NFT marketplace featuring:

- **Social login with gasless transactions** via Abstraxion
- **Dual data layer** with PostgreSQL indexer and RPC fallback
- **Complete marketplace functionality**: mint, list, buy, and offer management
- **Role-based UI** for admins, sellers, and buyers
- **REST API** for querying NFTs, listings, and activity

**Difficulty**: Intermediate
**Prerequisites**: Basic knowledge of React, TypeScript, and blockchain concepts

## Prerequisites

Before starting, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 8+ | Package management |
| Git | Any | Version control |

### Getting a XION Wallet

You'll need a XION testnet account with tokens for gas fees and testing purchases.

1. Visit the **XION Testnet Faucet**: https://faucet.xion.burnt.com
2. Enter your XION wallet address
3. Click **Request Tokens**
4. Wait for confirmation (tokens are in `uxion` - micro XION, where 1 XION = 1,000,000 uxion)

## Project Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/burnt-labs/xion-marketplace-demo.git
cd xion-marketplace-demo
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all frontend and backend dependencies including:
- React 18 with TypeScript
- Express.js for the API server
- CosmJS for blockchain interactions
- Abstraxion for wallet integration

### Step 3: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and configure the following variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_RPC_ENDPOINT` | XION node RPC URL | `https://rpc.xion-testnet-1.burnt.com:443` |
| `VITE_CHAIN_ID` | Chain identifier | `xion-testnet-2` |
| `VITE_GAS_PRICE` | Gas price with denomination | `0.025uxion` |
| `VITE_PREFIX` | Bech32 address prefix | `xion` |
| `VITE_DEFAULT_DENOM` | Default token denomination | `uxion` |
| `VITE_ABSTRAXION_TREASURY` | Treasury contract address | (required - see next section) |

### Step 4: Start Development Servers

```bash
npm run dev
```

This starts both the frontend and backend servers:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

You should see the marketplace dashboard with a wallet connection prompt.

<!-- Screenshot: Dashboard with Connect Wallet button -->

## Treasury Configuration (Gasless Transactions)

### Understanding Treasuries

Abstraxion uses treasury contracts to sponsor gas fees for your users, enabling gasless transactions. This creates a seamless Web2-like experience where users don't need to hold tokens for gas.

### Step 1: Access the Developer Portal

Navigate to the appropriate portal based on your target network:

- **Testnet**: https://dev.testnet2.burnt.com
- **Mainnet**: https://dev.burnt.com

### Step 2: Create a New Treasury

1. Click **"New treasury"** in the Dashboard
2. You'll see a form to configure your treasury

<!-- Screenshot: Treasury creation form -->

### Step 3: Configure Fee Grant (Allowance)

Configure at least one **Allowance Configuration**:

| Setting | Value | Description |
|---------|-------|-------------|
| Allowance Type | `Basic Allowance` | Type of fee grant |
| Spend Limit | `0.1` | Maximum XION per user (adjust as needed) |

Click **Save** after configuring.

### Step 4: Configure Permissions

Add permissions for the operations your app needs. For the marketplace, add these permissions:

| Permission Type | Authorization Type | Description |
|-----------------|-------------------|-------------|
| Instantiate a smart contract | Generic Authorization | Deploy new contracts |
| Execute a smart contract | Generic Authorization | Execute contract methods |

Click **Save** after adding each permission.

### Step 5: Configure Treasury Parameters

| Setting | Value |
|---------|-------|
| Redirect URL | `http://localhost:5173` (for local development) |
| Icon URL | URL to your app's icon |

### Step 6: Create and Fund the Treasury

1. Click **"Create"** to deploy the treasury contract
2. Copy the treasury contract address
3. Transfer XION tokens to the treasury address to cover gas fees for users

### Step 7: Update Your Environment

Add the treasury address to your `.env.local`:

```
VITE_ABSTRAXION_TREASURY=xion1your_treasury_address_here
```

Restart your development server for the changes to take effect.

For more details, see the [XION Treasury Documentation](https://docs.burnt.com/xion/developers/getting-started-advanced/gasless-ux-and-permission-grants/treasury-contracts).

## Smart Contract Deployment

### Understanding the Contracts

The marketplace uses two CosmWasm smart contracts:

| Contract | Code ID (Testnet) | Purpose |
|----------|-------------------|---------|
| Asset (CW721) | `1813` | NFT collection contract - handles minting, ownership, and metadata |
| Marketplace | `1814` | Trading logic - handles listings, purchases, and offers |

These code IDs are pre-deployed on XION testnet-2. You'll instantiate your own instances of these contracts.

### Step 1: Connect Your Wallet

1. Navigate to http://localhost:5173
2. Click **"Connect Wallet"**
3. Complete the Abstraxion login flow (Google, email, or other social login)

<!-- Screenshot: Abstraxion login modal -->

### Step 2: Select Admin Role

1. Locate the **role dropdown** in the navigation bar
2. Select **"Admin"**

This reveals admin-only features including contract deployment.

<!-- Screenshot: Role dropdown showing Admin selected -->

### Step 3: Deploy the Asset Contract

1. Navigate to the **Dashboard** (`/`)
2. In the **Admin Setup** section, click **"Deploy Contracts"**
3. Fill in the **Asset Contract** form:

| Field | Example Value | Description |
|-------|---------------|-------------|
| Code ID | `1813` | Pre-deployed CW721 code on testnet |
| Label | `My NFT Collection` | Human-readable identifier |
| Name | `Demo NFTs` | Collection display name |
| Symbol | `DEMO` | Short symbol (3-5 characters) |
| Minter | (your address) | Address allowed to mint new NFTs |
| Admin | (optional) | Address for contract migrations |

4. Click **"Deploy Asset Contract"**
5. Approve the transaction in your wallet
6. Wait for confirmation - the contract address will appear with a checkmark

<!-- Screenshot: Asset contract deployment form -->

### Step 4: Deploy the Marketplace Contract

1. In the same **Deploy Contracts** section, fill in the **Marketplace Contract** form:

| Field | Example Value | Description |
|-------|---------------|-------------|
| Code ID | `1814` | Pre-deployed marketplace code |
| Label | `My Marketplace` | Human-readable identifier |
| Fee Recipient | (your address) | Address receiving marketplace fees |
| Fee BPS | `200` | Fee in basis points (200 = 2%) |
| Listing Denom | `uxion` | Currency for listings |
| Admin | (optional) | Address for contract migrations |

2. Click **"Deploy Marketplace Contract"**
3. Approve the transaction

### Step 5: Accept Minter Ownership (If Required)

If minter ownership was transferred to your address:

1. Navigate to **Admin Panel** (`/admin`)
2. In the **Minter Ownership** section, click **"Accept Minter Ownership"**
3. Approve the transaction

Your contracts are now deployed and configured!

## Frontend Implementation

### Application Architecture

The frontend is built with React 18 and uses a component-based architecture:

```
src/
├── App.tsx                 # Main app with routing
├── main.tsx               # Entry point with Abstraxion setup
├── context/
│   └── CosmosProvider.tsx # Blockchain context and methods
├── app/
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx  # Home page with role-based views
│   │   ├── Explore.tsx    # Browse all NFTs
│   │   ├── Create.tsx     # Mint new NFTs
│   │   ├── Admin.tsx      # Contract management
│   │   └── Settings.tsx   # Configuration
│   └── components/        # Shared components
├── api/                   # API client and hooks
└── lib/                   # Utilities and types
```

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| Dashboard | `/` | Home page with role-based setup guides |
| Explore | `/explore` | Browse all NFTs with filtering |
| My Items | `/my-items` | View owned NFTs |
| Create | `/create` | Mint new NFTs (Seller/Admin) |
| Listings | `/listings` | Manage active listings |
| Offers | `/offers` | View and manage offers |
| Admin | `/admin` | Contract deployment and configuration |
| Settings | `/settings` | Configure contract addresses |

### Wallet Integration with Abstraxion

The app uses `@burnt-labs/abstraxion` for wallet integration. Here's how it's set up:

```tsx
// main.tsx
import { AbstraxionProvider } from '@burnt-labs/abstraxion';

const abstraxionConfig = {
  treasury: import.meta.env.VITE_ABSTRAXION_TREASURY,
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AbstraxionProvider config={abstraxionConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AbstraxionProvider>
  </React.StrictMode>
);
```

### Contract Interactions

The `CosmosProvider` context provides methods for blockchain interactions:

```tsx
// Using the context
import { useCosmos } from '../context/CosmosProvider';

function MintButton() {
  const { execute, config } = useCosmos();

  const handleMint = async () => {
    const msg = {
      mint: {
        token_id: 'my-nft-001',
        owner: userAddress,
        extension: {
          name: 'My NFT',
          description: 'A unique digital collectible',
          image: 'ipfs://...',
        },
      },
    };

    const result = await execute(config.assetContract, msg);
    console.log('Minted!', result.transactionHash);
  };

  return <button onClick={handleMint}>Mint NFT</button>;
}
```

#### Listing an NFT

```tsx
const listNFT = async (tokenId: string, priceInXion: number) => {
  const msg = {
    update_extension: {
      msg: {
        list: {
          token_id: tokenId,
          price: {
            amount: String(priceInXion * 1_000_000), // Convert to uxion
            denom: 'uxion',
          },
        },
      },
    },
  };

  await execute(config.assetContract, msg);
};
```

#### Buying an NFT

```tsx
const buyNFT = async (tokenId: string, price: string) => {
  const msg = {
    update_extension: {
      msg: {
        buy: {
          token_id: tokenId,
          recipient: buyerAddress,
        },
      },
    },
  };

  // Include payment with the transaction
  const funds = [{ denom: 'uxion', amount: price }];
  await execute(config.assetContract, msg, funds);
};
```

## Backend API Setup

### Architecture Overview

The Express.js backend provides a unified API for querying blockchain data:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Express Server  │────▶│   PostgreSQL    │
│    (React)      │     │    /api/*        │     │   (Indexer DB)  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 │ (automatic fallback)
                                 ▼
                        ┌─────────────────┐
                        │    XION RPC     │
                        │    (CosmJS)     │
                        └─────────────────┘
```

### Data Layer Strategy

The backend implements a dual data layer with automatic fallback:

| Source | When Used | Advantages |
|--------|-----------|------------|
| PostgreSQL Indexer | When `INDEXER_DB_URL` is configured | Fast queries, historical data, efficient pagination |
| RPC (CosmJS) | Fallback when indexer unavailable | No additional infrastructure required |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and configuration status |
| `/api/activity` | GET | Transaction history |
| `/api/listings` | GET | All active marketplace listings |
| `/api/nfts` | GET | All NFTs with listing status |
| `/api/nft/:tokenId` | GET | Details for a specific NFT |
| `/api/offers/:tokenId` | GET | Offers for a specific token |
| `/api/user/:address/listings` | GET | User's active listings |
| `/api/user/:address/nfts` | GET | User's owned NFTs |

### Response Format

All successful responses include the data source:

```json
{
  "data": [...],
  "source": "indexer" | "rpc",
  "timestamp": 1704931200000
}
```

### Enabling the PostgreSQL Indexer (Optional)

For production deployments with large transaction volumes:

1. Set up an indexer database using [daodao/argus](https://github.com/DA0-DA0/argus)
2. Configure the connection string:

```bash
INDEXER_DB_URL=postgres://user:password@localhost:5432/indexer_db
```

3. Restart the server

The backend will automatically use the indexer for faster queries.

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_RPC_ENDPOINT` | No | `https://rpc.xion-testnet-1.burnt.com:443` | XION RPC URL |
| `VITE_CHAIN_ID` | No | `xion-testnet-2` | Chain identifier |
| `VITE_GAS_PRICE` | No | `0.025uxion` | Gas price with denomination |
| `VITE_PREFIX` | No | `xion` | Bech32 address prefix |
| `VITE_DEFAULT_DENOM` | No | `uxion` | Default token denomination |
| `VITE_ASSET_CONTRACT` | No | - | Deployed NFT contract address |
| `VITE_MARKETPLACE_CONTRACT` | No | - | Deployed marketplace contract |
| `VITE_ASSET_CODE_ID` | No | `1813` | Code ID for asset deployment |
| `VITE_MARKETPLACE_CODE_ID` | No | `1814` | Code ID for marketplace deployment |
| `VITE_ABSTRAXION_TREASURY` | Yes | - | Treasury contract for gasless tx |
| `INDEXER_DB_URL` | No | - | PostgreSQL connection (optional) |
| `PORT` | No | `3001` | Express server port |

### Contract Code IDs

For XION testnet-2, use these pre-deployed code IDs:

| Contract | Code ID | Description |
|----------|---------|-------------|
| Asset (CW721) | `1813` | NFT collection with marketplace extensions |
| Marketplace | `1814` | Trading and offer management |

## Deployment

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Configure environment variables in the Vercel dashboard
4. Deploy

Vercel will automatically build and deploy on each push.

### Backend Deployment

For the Express backend, you can use:

- **Railway**: https://railway.app
- **Render**: https://render.com
- **Fly.io**: https://fly.io

Example Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist-server/ ./dist-server/
COPY dist/ ./dist/
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist-server/index.js"]
```

### Production Checklist

Before going to mainnet:

- [ ] Configure production RPC endpoint
- [ ] Set up PostgreSQL indexer (recommended for scale)
- [ ] Create and fund a mainnet treasury
- [ ] Deploy contracts to mainnet
- [ ] Update all contract addresses
- [ ] Enable HTTPS
- [ ] Configure proper CORS settings
- [ ] Set up monitoring and logging

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Caller is not minter" | Wrong minter address | Accept minter ownership in Admin Panel |
| "Insufficient funds" | Low wallet balance | Get tokens from testnet faucet |
| API returns empty data | Contracts not configured | Set contract addresses in Settings |
| Transaction pending | Network congestion | Wait and retry, check explorer |
| Wallet won't connect | Browser extension issue | Refresh page, clear cache |

### Debugging Tips

1. **Check the health endpoint**: `curl http://localhost:3001/api/health`
2. **View server logs**: The Express server logs data source and errors
3. **Use the Developer Console** (`/console`): Low-level contract interaction for debugging
4. **Check transaction on explorer**: Click "View Tx" on any activity item

## Next Steps

- Explore the [Developer Console](/console) for advanced contract interactions
- Review [Contract Message Examples](#contract-message-examples) in the main README
- Customize the UI for your brand
- Add additional features (auctions, collections, royalties)

## Resources

- [XION Documentation](https://docs.burnt.com/xion)
- [Abstraxion SDK](https://github.com/burnt-labs/abstraxion)
- [CosmWasm Documentation](https://docs.cosmwasm.com)
- [CosmJS Documentation](https://cosmos.github.io/cosmjs/)
- [XION Discord](https://discord.gg/burnt) - Community support

---

*Last updated: January 2026*

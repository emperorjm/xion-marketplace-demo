# XION Marketplace Demo

A full-featured NFT marketplace built on the XION blockchain with a React + Vite frontend. It provides both a user-friendly marketplace UI and a developer console for low-level contract interactions.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Deployment](#deployment)
4. [Configuration](#configuration)
5. [Backend Architecture](#backend-architecture)
6. [API Reference](#api-reference)
7. [Abstraxion Setup](#abstraxion-setup)
8. [Quick Reference](#quick-reference)
9. [Admin Guide](#admin-guide)
10. [Seller Guide](#seller-guide)
11. [Buyer Guide](#buyer-guide)
12. [Activity & History](#activity--history)
13. [Developer Console Reference](#developer-console-reference)
14. [Troubleshooting](#troubleshooting)
15. [Contract Message Examples](#contract-message-examples)
16. [Notes](#notes)

---

## Overview

The XION Marketplace Demo provides:

- **Marketplace UI** (`/`) - User-friendly interface for browsing, buying, and selling NFTs
- **Developer Console** (`/console`) - Low-level contract interaction for deployment and advanced operations
- **REST API** (`/api`) - Backend endpoints for querying NFTs, listings, offers, and activity

All blockchain interactions happen in the browser via CosmJS. The optional Express backend provides a data layer with PostgreSQL indexer support (falls back to RPC queries when unavailable).

### Getting Testnet Tokens

1. Visit the XION Testnet Faucet: https://faucet.xion.burnt.com
2. Enter your XION wallet address
3. Request tokens (you'll receive `uxion` - micro XION)

---

## Getting Started

### Project Structure

```
xion-marketplace-demo/
├── package.json          # Dependencies (React, Express, CosmJS, pg)
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # Frontend TypeScript config
├── tsconfig.server.json  # Backend TypeScript config
├── src/                  # React frontend application
│   ├── App.tsx           # Main app with routing
│   ├── app/              # Pages and components
│   │   ├── pages/        # Dashboard, Explore, Settings, Admin, etc.
│   │   └── components/   # Shared components (Layout, NFTCard, etc.)
│   ├── api/              # Frontend API client and hooks
│   ├── context/          # React context providers (CosmosProvider)
│   └── lib/              # Utilities and type definitions
├── server/               # Express API server
│   ├── index.ts          # Server entry point (port 3001)
│   ├── config.ts         # Server configuration
│   ├── types.ts          # Shared TypeScript types
│   ├── routes/           # API route handlers
│   ├── services/         # Data layer (indexer.ts, rpc.ts)
│   └── db/               # PostgreSQL connection pool
├── public/               # Static assets
└── index.html            # Entry HTML file
```

### Installation

```bash
npm install              # Install dependencies
npm run dev              # Start both frontend and backend dev servers
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

#### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend (Vite) and backend (Express) servers |
| `npm run dev:client` | Start only the frontend on http://localhost:5173 |
| `npm run dev:server` | Start only the backend API on http://localhost:3001 |

### Production Build

```bash
npm run build           # Build frontend for production (outputs to dist/)
npm run build:server    # Build backend for production (outputs to dist-server/)
npm run start           # Start production server (serves both API and static files)
```

---

## Deployment

This is a static site that can be deployed to:
- **Vercel** (recommended): `vercel deploy`
- **Netlify**: Deploy the `dist/` folder
- **AWS S3 + CloudFront**
- **GitHub Pages**
- Any static hosting service

Simply deploy the `dist/` folder after running `npm run build`.

---

## Configuration

Copy `.env.example` to `.env.local` and configure your environment.

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_RPC_ENDPOINT` | XION node RPC URL | `https://rpc.xion-testnet-1.burnt.com:443` |
| `VITE_CHAIN_ID` | Chain identifier | `xion-testnet-2` |
| `VITE_GAS_PRICE` | Gas price with denom | `0.025uxion` |
| `VITE_PREFIX` | Bech32 address prefix | `xion` |
| `VITE_DEFAULT_DENOM` | Default token denomination | `uxion` |
| `VITE_ASSET_CONTRACT` | Deployed NFT contract address | (set via UI) |
| `VITE_MARKETPLACE_CONTRACT` | Deployed marketplace contract address | (set via UI) |
| `VITE_ASSET_CODE_ID` | Code ID for asset contract deployment | `1813` |
| `VITE_MARKETPLACE_CODE_ID` | Code ID for marketplace deployment | `1814` |
| `VITE_ABSTRAXION_TREASURY` | Treasury contract for gasless transactions | (required) |

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `INDEXER_DB_URL` | PostgreSQL connection string for indexer | (none - uses RPC fallback) |
| `PORT` | Express server port | `3001` |

---

## Backend Architecture

The application includes an Express.js backend that provides a unified API for querying blockchain data.

### Data Layer Strategy

The backend implements a dual data layer with automatic fallback:

| Source | When Used | Advantages |
|--------|-----------|------------|
| **PostgreSQL Indexer** | When `INDEXER_DB_URL` is configured | Fast queries, historical data, efficient pagination |
| **RPC (CosmJS)** | Fallback when indexer unavailable | No additional infrastructure required |

### Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Express Server  │────▶│   PostgreSQL    │
│    (React)      │     │    /api/*        │     │   (Indexer DB)  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │                        │
                                 │ (automatic fallback)   │
                                 ▼                        │
                        ┌─────────────────┐               │
                        │    XION RPC     │◀──────────────┘
                        │    (CosmJS)     │
                        └─────────────────┘
```

### Fallback Behavior

1. Each API endpoint first checks if the indexer is available
2. If available, queries the PostgreSQL database
3. If unavailable or query fails, automatically falls back to RPC
4. Response includes `source` field indicating which data source was used

---

## API Reference

All API endpoints are prefixed with `/api` and return JSON responses.

### Response Format

All successful responses follow this structure:

```json
{
  "data": [...],
  "source": "indexer" | "rpc",
  "timestamp": 1704931200000
}
```

### Endpoints

#### GET /api/health

Health check and configuration status.

**Response:**

```json
{
  "status": "ok",
  "dataSource": "indexer",
  "indexerAvailable": true,
  "config": {
    "assetContract": "xion1abc...",
    "marketplaceContract": "xion1def...",
    "rpcEndpoint": "https://rpc.xion-testnet-1.burnt.com:443"
  },
  "timestamp": 1704931200000
}
```

---

#### GET /api/activity

Transaction history for the marketplace.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results (1-100) |
| `offset` | number | 0 | Pagination offset |
| `source` | string | - | Force `rpc` data source |
| `assetContract` | string | config value | Filter by asset contract |

**Response:**

```json
{
  "data": [
    {
      "id": "abc123",
      "type": "buy",
      "tokenId": "nft-001",
      "from": "xion1seller...",
      "to": "xion1buyer...",
      "price": "10000000",
      "denom": "uxion",
      "timestamp": 1704931200000,
      "txHash": "ABC123...",
      "blockHeight": 12345678
    }
  ],
  "source": "indexer",
  "timestamp": 1704931200000
}
```

**Activity Types:** `mint`, `list`, `delist`, `buy`, `offer`, `transfer`, `accept_offer`, `reject_offer`, `cancel_offer`, `price_update`, `admin`

---

#### GET /api/listings

All active marketplace listings.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | string | - | Force `rpc` data source |

**Response:**

```json
{
  "data": [
    {
      "tokenId": "nft-001",
      "seller": "xion1seller...",
      "price": "10000000",
      "denom": "uxion",
      "listedAt": 1704931200000,
      "txHash": "ABC123..."
    }
  ],
  "source": "indexer",
  "timestamp": 1704931200000
}
```

---

#### GET /api/nfts

All NFTs with their listing status.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max results (1-500) |
| `offset` | number | 0 | Pagination offset |
| `source` | string | - | Force `rpc` data source |
| `assetContract` | string | config value | Filter by asset contract |

**Response:**

```json
{
  "data": [
    {
      "tokenId": "nft-001",
      "name": "My NFT",
      "description": "A unique digital collectible",
      "image": "ipfs://...",
      "owner": "xion1owner...",
      "isListed": true,
      "price": "10000000",
      "denom": "uxion",
      "listedAt": 1704931200000
    }
  ],
  "source": "indexer",
  "timestamp": 1704931200000
}
```

---

#### GET /api/nft/:tokenId

Details for a specific NFT.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenId` | string | The NFT token ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | string | - | Force `rpc` data source |

**Response:**

```json
{
  "data": {
    "tokenId": "nft-001",
    "name": "My NFT",
    "description": "A unique digital collectible",
    "image": "ipfs://...",
    "owner": "xion1owner...",
    "tokenUri": "ipfs://metadata...",
    "mintedAt": 1704931200000,
    "mintTxHash": "ABC123..."
  },
  "source": "indexer",
  "timestamp": 1704931200000
}
```

**Error Response (404):**

```json
{
  "error": "NFT not found",
  "tokenId": "nft-001"
}
```

---

#### GET /api/offers/:tokenId

Offers for a specific token.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenId` | string | The NFT token ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | string | - | Force `rpc` data source |

**Response:**

```json
{
  "data": [
    {
      "offerId": "offer-001",
      "tokenId": "nft-001",
      "bidder": "xion1bidder...",
      "price": "15000000",
      "denom": "uxion",
      "createdAt": 1704931200000,
      "txHash": "ABC123..."
    }
  ],
  "source": "indexer",
  "timestamp": 1704931200000
}
```

---

#### GET /api/user/:address/listings

Active listings for a specific user.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | User's XION address |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | string | - | Force `rpc` data source |
| `assetContract` | string | config value | Filter by asset contract |

**Response:**

```json
{
  "data": [
    {
      "tokenId": "nft-001",
      "seller": "xion1seller...",
      "price": "10000000",
      "denom": "uxion",
      "listedAt": 1704931200000,
      "name": "My NFT",
      "image": "ipfs://..."
    }
  ],
  "source": "indexer",
  "timestamp": 1704931200000
}
```

---

#### GET /api/user/:address/nfts

NFTs owned by a specific user.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | User's XION address |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | string | - | Force `rpc` data source |
| `assetContract` | string | config value | Filter by asset contract |

**Response:**

```json
{
  "data": [
    {
      "tokenId": "nft-001",
      "name": "My NFT",
      "description": "A unique digital collectible",
      "image": "ipfs://...",
      "owner": "xion1owner..."
    }
  ],
  "source": "indexer",
  "timestamp": 1704931200000
}
```

---

## Abstraxion Setup

This app uses Abstraxion for wallet connection, providing social login (Google, email, etc.) with gasless transactions.

### Setting Up a Treasury Contract

Abstraxion requires a treasury contract to sponsor gas fees for your users. You can follow this [guide](https://docs.burnt.com/xion/developers/getting-started-advanced/gasless-ux-and-permission-grants/treasury-contracts) to help with setting up your treasury contract. The following list the basic steps required:

#### 1. Access the Developer Portal
- **Testnet**: https://dev.testnet2.burnt.com
- **Mainnet**: https://dev.burnt.com

#### 2. Create a Treasury
1. Click **"New treasury"** in the Dashboard
2. Configure a **Allowance Configuration (Fee Grant)** (at least one required):
   - Allowance Type: `Basic Allowance`
   - Spend Limit: `0.1` (adjust as needed)
   - Click the `Save` button
3. Configure a **Permissions** (at least one required):
   - Permission Type: `Instantiate a smart contract`
   - Authorization Type: `Generic Authorization`
   - Click the `Save` button
4. Configure **Treasury Params**:
   - Redirect Url : For localhost this would be `http://localhost:5173`
   - Icon Url: The URL of an icon that represents your app
5. Click **"Create"**

#### 3. Fund the Treasury
Transfer XION tokens to the treasury contract address so it can cover gas fees for users.

#### 4. Configure Your App
Add the treasury address to your `.env.local`:
```
VITE_ABSTRAXION_TREASURY=xion1your_treasury_address_here
```

For more details, see the [XION Treasury Documentation](https://docs.burnt.com/xion/developers/featured-guides/your-first-dapp/treasury-contracts).

---

## Quick Reference

> **Note:** URLs below are for local development. For production deployments (e.g., Vercel), replace `http://localhost:5173` with your deployed domain.

| Interface | URL | Purpose |
|-----------|-----|---------|
| Marketplace Home | `http://localhost:5173/` | Dashboard, role selection |
| Explore NFTs | `http://localhost:5173/explore` | Browse all NFTs |
| My Items | `http://localhost:5173/my-items` | View owned NFTs |
| Create NFT | `http://localhost:5173/create` | Mint new NFTs (Seller/Admin) |
| Manage Listings | `http://localhost:5173/listings` | View/manage your listings (Seller/Admin) |
| Offers | `http://localhost:5173/offers` | Manage offers |
| Admin Panel | `http://localhost:5173/admin` | Contract deployment & management (Admin only) |
| Activity | `http://localhost:5173/activity` | Transaction history |
| Settings | `http://localhost:5173/settings` | Configure contract addresses and network settings |
| Developer Console | `http://localhost:5173/console` | Contract deployment, advanced queries |

### Role System

The marketplace UI has three roles for testing different user perspectives:

| Role | Capabilities |
|------|-------------|
| **Buyer** | Browse, purchase, view owned items |
| **Seller** | All Buyer capabilities + Create NFTs, manage listings |
| **Admin** | All Seller capabilities + Contract management, configuration |

Switch roles using the dropdown in the navigation bar.

---

## Admin Guide

As an Admin, you're responsible for deploying contracts, configuring the marketplace, and managing ownership.

### Part 1: Contract Deployment

There are three ways to deploy contracts. Choose the method that best suits your needs:

| Method | Best For |
|--------|----------|
| **Dashboard Setup Flow** | First-time setup with guided steps |
| **Admin Panel** | Quick deployment with minimal UI |
| **Developer Console** | Advanced users, debugging, custom configurations |

> **Note on Code IDs:** The app pre-populates the default code IDs for XION testnet-2:
> - **Asset Contract Code ID:** `1813` (CW721 NFT contract)
> - **Marketplace Contract Code ID:** `1814` (Marketplace contract)
>
> These are pre-deployed contract codes on the XION testnet. For custom deployments or different networks, you can configure these via environment variables (`VITE_ASSET_CODE_ID` and `VITE_MARKETPLACE_CODE_ID`) in your `.env.local` file.

#### Option A: Dashboard Setup Flow (Recommended for First-Time Setup)

The Dashboard (`/`) provides a guided Admin Setup checklist for new installations.

##### Step 1: Access the Admin Setup

1. Navigate to `http://localhost:5173`
2. Select **"Admin"** from the role dropdown in the navbar
3. Scroll down to the **"Admin Setup"** section
4. You'll see a checklist with expandable steps

##### Step 2: Deploy Contracts

1. Click on **"Deploy Contracts"** to expand the deployment forms
2. You'll see two sub-forms: **Asset Contract** and **Marketplace Contract**

**Asset Contract Form:**

| Field | Description | Example |
|-------|-------------|---------|
| Code ID | The code ID for the CW721 asset contract | `1813` |
| Label | Human-readable label | `My NFT Collection` |
| Name | Display name for the collection | `XION Demo NFTs` |
| Symbol | Short symbol | `XDEMO` |
| Admin | (Optional) Admin for migrations | Your wallet address |
| Minter | Address allowed to mint NFTs | Your wallet address |

Click **"Deploy Asset Contract"** and approve the transaction. Once deployed, the contract address will be shown with a ✓.

**Marketplace Contract Form:**

| Field | Description | Example |
|-------|-------------|---------|
| Code ID | The code ID for marketplace contract | `1814` |
| Label | Human-readable label | `My Marketplace` |
| Admin | (Optional) Admin for migrations | Your wallet address |
| Fee Recipient | Address receiving marketplace fees | Your wallet address |
| Fee BPS | Fee in basis points (100 = 1%) | `200` (2%) |
| Listing Denom | Currency for listings | `uxion` |

Click **"Deploy Marketplace Contract"** and approve the transaction.

##### Step 3: Continue Setup

Once both contracts are deployed:
- The Deploy Contracts step will collapse automatically
- Contract addresses are auto-configured in the app
- Continue with **"Set Fees"** and **"Accept Minter Ownership"** steps

#### Option B: Admin Panel Deployment

The Admin Panel (`/admin`) also provides contract deployment forms.

##### Step 1: Access the Admin Panel

1. Navigate to `http://localhost:5173/admin`
2. Scroll to the **"Deploy Contracts"** section

##### Step 2: Deploy Asset Contract

1. Fill in the **Instantiate Asset Contract** form:
   - Code ID, Label, Name, Symbol, Admin (optional), Minter
2. Click **"Instantiate Asset Contract"**
3. Approve the transaction
4. The contract address is automatically saved to the app configuration

##### Step 3: Deploy Marketplace Contract

1. Fill in the **Instantiate Marketplace Contract** form:
   - Code ID, Label, Admin (optional), Fee Recipient, Fee BPS, Listing Denom
2. Click **"Instantiate Marketplace Contract"**
3. Approve the transaction
4. The contract address is automatically saved to the app configuration

#### Option C: Developer Console (Advanced)

The Developer Console (`/console`) provides the most control over contract deployment.

##### Step 1: Connect Your Wallet

1. Navigate to `http://localhost:5173/console`
2. Click **"Connect Wallet"** in the Wallet Panel
3. Approve the connection in your wallet

##### Step 2: Configure RPC Settings

In the **Config Panel**, verify or update:

| Field | Value |
|-------|-------|
| RPC Endpoint | `https://rpc.xion-testnet-2.burnt.com:443` |
| Chain ID | `xion-testnet-2` |
| Gas Price | `0.025uxion` |
| Prefix | `xion` |
| Default Denom | `uxion` |

##### Step 3: Deploy the Asset Contract

1. Scroll to **"Deploy Contracts"** section
2. Click **"Instantiate Asset Contract"**
3. Fill in the fields (same as above, plus additional options)
4. Check **"Use this address"** to auto-populate config
5. Click **Submit** and approve the transaction

##### Step 4: Deploy the Marketplace Contract

1. Click **"Instantiate Marketplace Contract"**
2. Fill in the fields (same as above, plus additional options like "Require Sale Approvals")
3. Check **"Use this address"** to auto-populate config
4. Click **Submit** and approve the transaction

#### Accept Minter Ownership (If Required)

After deploying the Asset Contract, if minter ownership was transferred to your address:

1. Go to Admin Panel (`/admin`) > **Minter Ownership** section
2. Click **"Accept Minter Ownership"**
3. Approve the transaction

Or via Developer Console:
1. Scroll to **"Asset Core"** section
2. Find **"Accept Minter Ownership"**
3. Click **Submit** (no additional fields needed)

### Part 2: Ongoing Management via Admin Panel

Once contracts are deployed, use the Admin Panel (`/admin`) for routine management.

#### Accessing the Admin Panel

1. Navigate to `http://localhost:5173`
2. Select **"Admin"** from the role dropdown in the navbar
3. Click **"Admin"** in the navigation menu

#### Deploy Additional Contracts

The Admin Panel includes a **Deploy Contracts** section if you need to deploy new contract instances:

- **Instantiate Asset Contract** - Deploy a new NFT collection contract
- **Instantiate Marketplace Contract** - Deploy a new marketplace contract

Both forms auto-configure the app with the new contract addresses after successful deployment.

#### Query Current Minter

1. In the **Minter Ownership** section, click **"Query Current Minter"**
2. The result shows the current minter address and any pending ownership transfer

#### Accept Minter Ownership

1. Click **"Accept Minter Ownership"**
2. Approve the transaction
3. You are now the authorized minter

#### Transfer Minter Ownership

1. Enter the new minter's address in the **"Transfer Minter Ownership To"** field
2. Click **"Transfer Ownership"**
3. The new minter must accept the transfer

#### Query Marketplace Config

1. In the **Marketplace Config** section, click **"Query Current Config"**
2. View current fee settings, recipient, and listing denom

#### Update Marketplace Config

1. Enter new **Fee Percentage** (e.g., `2.5` for 2.5%)
2. (Optional) Enter new **Fee Recipient** address
3. Click **"Update Config"**
4. Approve the transaction

#### View Contract Information

The **Contract Info** section displays:
- Asset Contract address (full address for easy copying)
- Marketplace Contract address (full address for easy copying)
- Your connected wallet address

The dashboard shows complete contract addresses without truncation, making it easy to copy and verify addresses.

---

## Seller Guide

As a Seller, you can create (mint) NFTs, list them for sale, and manage your inventory.

### Prerequisites

1. Connect your wallet
2. Have XION testnet tokens for gas fees
3. Switch to **"Seller"** role in the navbar dropdown

### Creating NFTs

#### Step 1: Navigate to Create Page

1. Go to `http://localhost:5173/create`
2. Or click **"Create"** in the navigation bar

#### Step 2: Fill in NFT Details

| Field | Required | Description |
|-------|----------|-------------|
| Token ID | Yes | Unique identifier (e.g., `nft-001`, `rare-sword-1`) |
| Name | No | Display name for the NFT |
| Description | No | Detailed description |
| Image URL | No | IPFS, Arweave, or HTTP URL to image |

#### Step 3: Preview and Mint

1. If you provided an Image URL, a preview will appear
2. Click **"Mint NFT"**
3. Approve the transaction in your wallet
4. Success message confirms the mint

### Managing Your Inventory

#### Viewing Your NFTs

1. Navigate to `http://localhost:5173/my-items`
2. All NFTs you own are displayed
3. Click **"Refresh"** to update the list

#### Viewing NFT Details

1. Click on any NFT card
2. The detail page shows:
   - Full-size image
   - Token ID
   - Description
   - Current listing status
   - Owner information

### Listing NFTs for Sale

#### Step 1: Navigate to Your NFT

1. Go to **My Items** (`/my-items`)
2. Click on the NFT you want to list

#### Step 2: List for Sale

1. Click **"List for Sale"** button (only visible for owned, unlisted NFTs)
2. Enter the price in XION (e.g., `10` for 10 XION)
3. Click **"List NFT"**
4. Approve the transaction

Your NFT is now listed on the marketplace!

### Managing Active Listings

Listings are stored on the blockchain and visible to all users across all devices and browsers.

#### Viewing Your Listings

1. Navigate to `http://localhost:5173/listings`
2. All your active listings are displayed with current prices

#### Updating Price

1. On the Listings page, click **"Update Price"** for any listing
2. Enter the new price
3. Confirm the change

#### Delisting an NFT

1. On the Listings page, click **"Delist"** for any listing
2. Approve the transaction
3. The NFT is removed from the marketplace but remains in your wallet

### Handling Offers

#### Viewing Incoming Offers

1. Navigate to `http://localhost:5173/offers`
2. Select the **"Incoming"** tab
3. View offers made on your NFTs

#### Accepting an Offer

1. Find the offer you want to accept
2. Click **"Accept"**
3. Approve the transaction
4. The NFT is transferred and you receive payment

#### Rejecting an Offer

1. Find the offer you want to reject
2. Click **"Reject"**
3. The offer is cancelled and funds returned to the bidder

---

## Buyer Guide

As a Buyer, you can browse NFTs, make purchases, and manage your collection.

### Prerequisites

1. Connect your wallet
2. Have XION testnet tokens for purchases and gas fees
3. Default role is **"Buyer"** (no change needed)

### Browsing NFTs

All NFT listings are queried directly from the blockchain, so you'll see the same listings as every other user.

#### Explore All NFTs

1. Navigate to `http://localhost:5173/explore`
2. View all NFTs in the collection

#### Filter by Status

Use the tabs to filter:
- **All NFTs** - Shows every NFT in the collection
- **Listed** - Shows only NFTs available for purchase

#### NFT Card Information

Each card displays:
- NFT image
- Name
- Price (if listed)
- Status (Listed/Not Listed/Owned)

### Viewing NFT Details

1. Click on any NFT card
2. The detail page shows:
   - Full-size image
   - Token ID and name
   - Description
   - Current price (if listed)
   - Owner address

### Purchasing an NFT

#### Step 1: Find a Listed NFT

1. Go to **Explore** (`/explore`)
2. Filter by **"Listed"** to see available NFTs
3. Click on the NFT you want to buy

#### Step 2: Complete Purchase

1. Review the NFT details and price
2. Click **"Buy Now"**
3. Approve the transaction in your wallet
4. Wait for confirmation

#### Step 3: Verify Purchase

1. Navigate to **My Items** (`/my-items`)
2. Your newly purchased NFT should appear
3. Click **"Refresh"** if it doesn't appear immediately

### Viewing Your Collection

1. Navigate to `http://localhost:5173/my-items`
2. All NFTs you own are displayed
3. Click any NFT to view details or list for sale

### Making Offers

#### Creating an Offer

Offers can be made on unlisted NFTs through the Developer Console or programmatically. The Marketplace UI focuses on direct purchases.

#### Managing Your Offers

1. Navigate to `http://localhost:5173/offers`
2. Select the **"Outgoing"** tab
3. View all offers you've made

#### Cancelling an Offer

1. Find the offer you want to cancel
2. Click **"Cancel"**
3. Your funds are returned to your wallet

---

## Activity & History

The Activity page (`/activity`) shows marketplace transaction history fetched from the backend API.

### Data Sources

Activity data is retrieved via the `/api/activity` endpoint, which supports two data sources:

| Source | Description |
|--------|-------------|
| **Indexer** | PostgreSQL database with complete historical data (when configured) |
| **RPC** | Direct blockchain queries (limited to recent transactions) |

The backend automatically falls back to RPC queries when the indexer is unavailable.

### Viewing Activity

1. Navigate to `http://localhost:5173/activity`
2. All marketplace transactions are displayed chronologically

### Activity Types

| Type | Description |
|------|-------------|
| Mint | NFT was created |
| List | NFT was listed for sale |
| Delist | NFT was removed from sale |
| Buy | NFT was purchased |
| Offer | Offer was made |
| Transfer | NFT was transferred |
| Accept Offer | Offer was accepted |
| Reject Offer | Offer was rejected |
| Cancel Offer | Offer was cancelled |
| Price Update | Listing price was changed |
| Admin | Administrative action |

### Filtering Activity

Use the tabs to filter by activity type (All, Mint, List, Buy, etc.)

### Viewing Transactions

- Each activity shows the token ID, addresses involved, and price
- Click **"View Tx"** to see the transaction on the XION explorer

---

## Developer Console Reference

The Developer Console (`/console`) provides direct access to contract functions.

### When to Use

- Initial contract deployment
- Advanced queries not available in the UI
- Debugging and testing
- Direct contract execution

### Sections Overview

| Section | Purpose |
|---------|---------|
| Config Panel | Set RPC endpoint, chain ID, contract addresses |
| Wallet Panel | Connect/disconnect wallet, view address |
| Deploy Contracts | Instantiate new asset or marketplace contracts |
| Asset Core | Mint NFTs, manage approvals, transfer ownership |
| Asset Listings | List, reserve, delist, buy NFTs via asset contract |
| Marketplace | Create listings, offers, and manage marketplace |
| Queries | Query contract state |
| Execution Log | View transaction results |

### Using the Console

1. **Configure chain + contracts** – provide RPC endpoint, chain ID, gas price, Bech32 prefix, and (optionally) existing contract addresses.
2. **Connect a wallet** – use Abstraxion for social login with gasless transactions.
3. **Instantiate contracts** – supply the stored code IDs to deploy fresh asset/marketplace instances (forms accept labels/admins and auto-update the config section if desired).
4. **Asset operations** – Mint NFTs, manage token approvals/operators, configure collection plugins, and use asset-extension flows (list/reserve/delist/buy).
5. **Monitor plugins & payouts** – Inspect collection plugins and snapshot balances for royalty + marketplace fee addresses (no polling required).
6. **Visualize inventory** – Use the gallery to query all tokens, owner-specific tokens, or only listed items and view metadata/placeholder imagery.
7. **Marketplace operations** – Cover every `ExecuteMsg` variant: create/cancel listings, buy/finalize sales, offers/collection offers, approvals queue, and config updates.
8. **Queries** – Run arbitrary smart queries against either contract (or a custom address) with a JSON payload builder.

Each submit logs the tx hash/result in the Execution Log for quick debugging.

### Common Operations

#### Query NFT Info

1. Go to **Queries** section
2. Select contract: Asset
3. Query type: `nft_info`
4. Enter Token ID
5. Click **Query**

#### Query All Tokens

1. Go to **Queries** section
2. Select contract: Asset
3. Query type: `all_tokens`
4. Click **Query**

#### Transfer NFT Directly

1. Go to **Asset Core** section
2. Click **"Transfer NFT"**
3. Enter Token ID and recipient address
4. Submit and approve transaction

---

## Troubleshooting

### Common Issues

#### "Caller is not minter" Error

**Cause:** Your wallet is not the authorized minter for the asset contract.

**Solution:**
1. The current minter must transfer ownership to your address
2. Accept the minter ownership via Admin Panel or Console

#### "Insufficient funds" Error

**Cause:** Your wallet doesn't have enough XION tokens.

**Solution:**
1. Visit the XION testnet faucet
2. Request more tokens
3. Wait for transaction confirmation before retrying

#### NFT Not Appearing After Purchase

**Cause:** Cache or timing issue.

**Solution:**
1. Click **"Refresh"** on the My Items page
2. Wait 10-15 seconds and refresh again
3. Check the Activity page for transaction status

#### Transaction Pending Forever

**Cause:** Network congestion or low gas.

**Solution:**
1. Check the transaction on XION explorer
2. If failed, retry with higher gas
3. Ensure wallet has sufficient balance

#### Wallet Won't Connect

**Cause:** Browser extension issue or wrong network.

**Solution:**
1. Refresh the page
2. Check that your wallet is on XION testnet
3. Try disconnecting and reconnecting
4. Clear browser cache if issues persist

### Getting Help

- XION Documentation: https://docs.burnt.com

---

## Contract Message Examples

### Mint NFT (Asset Contract)

```json
{
  "mint": {
    "token_id": "my-nft-001",
    "owner": "<your-wallet-address>",
    "extension": {
      "name": "My NFT",
      "description": "A unique digital collectible",
      "image": "https://example.com/image.png"
    }
  }
}
```

### List NFT (Asset Contract Extension)

```json
{
  "update_extension": {
    "msg": {
      "list": {
        "token_id": "my-nft-001",
        "price": {
          "amount": "10000000",
          "denom": "uxion"
        }
      }
    }
  }
}
```

### Buy NFT (Asset Contract Extension)

```json
{
  "update_extension": {
    "msg": {
      "buy": {
        "token_id": "my-nft-001",
        "recipient": "<buyer-address>"
      }
    }
  }
}
```

### Accept Minter Ownership

```json
{
  "update_minter_ownership": "accept_ownership"
}
```

---

## Notes

- The UI only targets the marketplace requirements for the asset contract (minting, approvals, plugin + listing extensions). Generic CW721 actions outside this scope were intentionally omitted.
- CosmJS runs fully client-side for blockchain transactions. Provide the RPC URL of your XION node; REST is not needed.
- The Express backend provides an optional data layer with PostgreSQL indexer support. Without `INDEXER_DB_URL` configured, the server falls back to RPC queries.
- To run your own indexer, see the [daodao/argus](https://github.com/DA0-DA0/argus) project for PostgreSQL indexer setup.
- Plugin helpers support all variants defined in `contracts/asset/src/plugin.rs` (exact/min price, proof, not-before/after, timelock, royalty, marketplace/currency allowlists).
- Sale approvals in the marketplace use the dedicated forms (Approve/Reject).

---

*Last updated: January 2026*

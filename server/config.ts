// Server configuration loaded from environment variables
import * as dotenv from 'dotenv';

// Load .env file (for local development)
dotenv.config();

export interface ServerConfig {
  // Indexer database connection (optional)
  indexerDbUrl: string | undefined;

  // RPC endpoint for fallback queries
  rpcEndpoint: string;

  // Contract addresses
  assetContract: string;
  marketplaceContract: string;

  // Server port
  port: number;

  // Default denomination
  defaultDenom: string;
}

export const config: ServerConfig = {
  indexerDbUrl: process.env.INDEXER_DB_URL,
  rpcEndpoint: process.env.VITE_RPC_ENDPOINT || 'https://rpc.xion-testnet-2.burnt.com:443',
  assetContract: process.env.VITE_ASSET_CONTRACT || '',
  marketplaceContract: process.env.VITE_MARKETPLACE_CONTRACT || '',
  port: parseInt(process.env.PORT || '3001', 10),
  defaultDenom: process.env.VITE_DEFAULT_DENOM || 'uxion',
};

export function logConfig(): void {
  console.log('Server configuration:');
  console.log(`  Port: ${config.port}`);
  console.log(`  Indexer DB: ${config.indexerDbUrl ? 'configured' : 'not configured (using RPC fallback)'}`);
  console.log(`  RPC Endpoint: ${config.rpcEndpoint}`);
  console.log(`  Asset Contract: ${config.assetContract || '(not set)'}`);
  console.log(`  Marketplace Contract: ${config.marketplaceContract || '(not set)'}`);
}

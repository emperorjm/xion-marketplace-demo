// Frontend API client for marketplace data
// Uses the Express backend which queries either indexer (PostgreSQL) or RPC (fallback)

export interface ActivityItem {
  id: string;
  type: 'mint' | 'list' | 'delist' | 'buy' | 'offer' | 'transfer' | 'accept_offer' | 'reject_offer' | 'cancel_offer' | 'price_update' | 'admin';
  tokenId: string;
  from?: string;
  to?: string;
  price?: string;
  denom?: string;
  timestamp: number;
  txHash?: string;
  description?: string;
  blockHeight?: number;
}

export interface ListingInfo {
  tokenId: string;
  seller: string;
  price: string;
  denom: string;
  listedAt: number;
  txHash?: string;
  // Optional NFT metadata (included when fetching user listings)
  name?: string;
  image?: string;
}

export interface OfferInfo {
  offerId: string;
  tokenId: string;
  bidder: string;
  price: string;
  denom: string;
  createdAt: number;
  txHash?: string;
}

export interface NFTDetails {
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  owner: string;
  tokenUri?: string;
  mintedAt?: number;
  mintTxHash?: string;
}

export interface NFTWithListingStatus extends NFTDetails {
  isListed: boolean;
  price?: string;
  denom?: string;
  listedAt?: number;
}

export interface ApiResponse<T> {
  data: T;
  source: 'indexer' | 'rpc';
  timestamp: number;
}

export interface HealthResponse {
  status: string;
  dataSource: 'indexer' | 'rpc';
  indexerAvailable: boolean;
  config: {
    assetContract: string | null;
    marketplaceContract: string | null;
    rpcEndpoint: string;
  };
  timestamp: number;
}

// API base URL - empty string uses the Vite proxy in development
const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Health check
  getHealth: async (): Promise<HealthResponse> => {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.json();
  },

  // Activity
  getActivity: (params?: { limit?: number; offset?: number; source?: 'indexer' | 'rpc'; assetContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.source) searchParams.set('source', params.source);
    if (params?.assetContract) searchParams.set('assetContract', params.assetContract);
    const query = searchParams.toString();
    return fetchApi<ActivityItem[]>(`/api/activity${query ? `?${query}` : ''}`);
  },

  // Listings
  getListings: (params?: { source?: 'indexer' | 'rpc'; assetContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set('source', params.source);
    if (params?.assetContract) searchParams.set('assetContract', params.assetContract);
    const query = searchParams.toString();
    return fetchApi<ListingInfo[]>(`/api/listings${query ? `?${query}` : ''}`);
  },

  // Offers for a token
  getOffers: (tokenId: string, params?: { source?: 'indexer' | 'rpc'; marketplaceContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set('source', params.source);
    if (params?.marketplaceContract) searchParams.set('marketplaceContract', params.marketplaceContract);
    const query = searchParams.toString();
    return fetchApi<OfferInfo[]>(`/api/offers/${encodeURIComponent(tokenId)}${query ? `?${query}` : ''}`);
  },

  // NFT details
  getNFT: (tokenId: string, params?: { source?: 'indexer' | 'rpc'; assetContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set('source', params.source);
    if (params?.assetContract) searchParams.set('assetContract', params.assetContract);
    const query = searchParams.toString();
    return fetchApi<NFTDetails>(`/api/nft/${encodeURIComponent(tokenId)}${query ? `?${query}` : ''}`);
  },

  // User's active listings
  getUserListings: (address: string, params?: { source?: 'indexer' | 'rpc'; assetContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set('source', params.source);
    if (params?.assetContract) searchParams.set('assetContract', params.assetContract);
    const query = searchParams.toString();
    return fetchApi<ListingInfo[]>(`/api/user/${encodeURIComponent(address)}/listings${query ? `?${query}` : ''}`);
  },

  // User's owned NFTs
  getUserNFTs: (address: string, params?: { source?: 'indexer' | 'rpc'; assetContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set('source', params.source);
    if (params?.assetContract) searchParams.set('assetContract', params.assetContract);
    const query = searchParams.toString();
    return fetchApi<NFTDetails[]>(`/api/user/${encodeURIComponent(address)}/nfts${query ? `?${query}` : ''}`);
  },

  // All NFTs with listing status (for Explore page)
  getAllNFTs: (params?: { limit?: number; offset?: number; source?: 'indexer' | 'rpc'; assetContract?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.source) searchParams.set('source', params.source);
    if (params?.assetContract) searchParams.set('assetContract', params.assetContract);
    const query = searchParams.toString();
    return fetchApi<NFTWithListingStatus[]>(`/api/nfts${query ? `?${query}` : ''}`);
  },
};

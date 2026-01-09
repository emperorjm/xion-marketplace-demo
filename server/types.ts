// Shared types for the API server

export type ActivityType =
  | 'mint'
  | 'list'
  | 'delist'
  | 'buy'
  | 'offer'
  | 'transfer'
  | 'accept_offer'
  | 'reject_offer'
  | 'cancel_offer'
  | 'price_update'
  | 'admin';

export interface ActivityItem {
  id: string;
  type: ActivityType;
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

// Map extraction names to activity types
export function extractionNameToActivityType(name: string): ActivityType | null {
  const mapping: Record<string, ActivityType> = {
    'marketplace/list-item': 'list',
    'marketplace/delist-item': 'delist',
    'marketplace/cancel-listing': 'delist',
    'marketplace/item-sold': 'buy',
    'marketplace/buy': 'buy',
    'marketplace/create-offer': 'offer',
    'marketplace/cancel-offer': 'cancel_offer',
    'marketplace/accept-offer': 'accept_offer',
    'marketplace/reject-offer': 'reject_offer',
    'marketplace/sale-approved': 'accept_offer',
    'marketplace/sale-rejected': 'reject_offer',
    'marketplace/pending-sale-created': 'offer',
    'asset/mint': 'mint',
    'asset/transfer_nft': 'transfer',
    'asset/transfer': 'transfer',
    'asset/send_nft': 'transfer',
    'asset/list': 'list',
    'asset/delist': 'delist',
    'asset/buy': 'buy',
  };

  return mapping[name] || null;
}

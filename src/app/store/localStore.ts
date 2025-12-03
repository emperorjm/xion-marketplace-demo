// localStorage management for marketplace demo

export type UserRole = 'buyer' | 'seller' | 'admin';

export interface NFTItem {
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  owner: string;
  collection: string;
}

export interface Listing {
  listingId: string;
  tokenId: string;
  seller: string;
  price: string;
  denom: string;
  createdAt: number;
}

export interface ListingInfo {
  tokenId: string;
  price: string;
  denom: string;
  listedAt: number;
}

export interface OfferInfo {
  offerId: string;
  tokenId: string;
  bidder: string;
  price: string;
  denom: string;
  createdAt: number;
}

export interface LocalStore {
  currentRole: UserRole;
  mockMode: boolean;
  nftMetadataCache: Record<string, NFTItem>;
  recentActivity: ActivityItem[];
  feesConfigured?: boolean;
  listings?: Record<string, ListingInfo>;
  offers?: Record<string, OfferInfo>;
}

export interface ActivityItem {
  id: string;
  type: 'mint' | 'list' | 'delist' | 'buy' | 'offer' | 'transfer' | 'accept_offer' | 'reject_offer' | 'cancel_offer' | 'price_update' | 'admin';
  tokenId: string;
  from?: string;
  to?: string;
  price?: string;
  timestamp: number;
  txHash?: string;
  description?: string;
}

const STORE_KEY = 'xion-marketplace-demo';

const defaultStore: LocalStore = {
  currentRole: 'buyer',
  mockMode: false,
  nftMetadataCache: {},
  recentActivity: [],
};

export function getStore(): LocalStore {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) {
      return { ...defaultStore, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to read localStorage:', e);
  }
  return defaultStore;
}

export function setStore(updates: Partial<LocalStore>): LocalStore {
  const current = getStore();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to write localStorage:', e);
  }
  return next;
}

export function clearStore(): void {
  localStorage.removeItem(STORE_KEY);
}

// Role management
export function getCurrentRole(): UserRole {
  return getStore().currentRole;
}

export function setCurrentRole(role: UserRole): void {
  setStore({ currentRole: role });
}

// Activity tracking
export function addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): void {
  const store = getStore();
  const newActivity: ActivityItem = {
    ...activity,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
  };
  setStore({
    recentActivity: [newActivity, ...store.recentActivity].slice(0, 50),
  });
}

export function getRecentActivity(): ActivityItem[] {
  return getStore().recentActivity;
}

export function clearRecentActivity(): void {
  setStore({ recentActivity: [] });
}

// NFT metadata cache
export function cacheNFTMetadata(tokenId: string, metadata: NFTItem): void {
  const store = getStore();
  setStore({
    nftMetadataCache: {
      ...store.nftMetadataCache,
      [tokenId]: metadata,
    },
  });
}

export function getCachedNFTMetadata(tokenId: string): NFTItem | undefined {
  return getStore().nftMetadataCache[tokenId];
}

// Fees configured tracking
export function setFeesConfigured(value: boolean): void {
  setStore({ feesConfigured: value });
}

export function getFeesConfigured(): boolean {
  return getStore().feesConfigured ?? false;
}

// Listing tracking
export function addListing(tokenId: string, price: string, denom: string): void {
  const store = getStore();
  setStore({
    listings: {
      ...store.listings,
      [tokenId]: { tokenId, price, denom, listedAt: Date.now() },
    },
  });
}

export function removeListing(tokenId: string): void {
  const store = getStore();
  const listings = { ...store.listings };
  delete listings[tokenId];
  setStore({ listings });
}

export function getListing(tokenId: string): ListingInfo | undefined {
  return getStore().listings?.[tokenId];
}

export function getAllListings(): ListingInfo[] {
  const listings = getStore().listings || {};
  return Object.values(listings);
}

// Offer tracking
export function addOffer(offerId: string, tokenId: string, bidder: string, price: string, denom: string): void {
  const store = getStore();
  setStore({
    offers: {
      ...store.offers,
      [offerId]: { offerId, tokenId, bidder, price, denom, createdAt: Date.now() },
    },
  });
}

export function removeOffer(offerId: string): void {
  const store = getStore();
  const offers = { ...store.offers };
  delete offers[offerId];
  setStore({ offers });
}

export function getOffer(offerId: string): OfferInfo | undefined {
  return getStore().offers?.[offerId];
}

export function getOffersByToken(tokenId: string): OfferInfo[] {
  const offers = getStore().offers || {};
  return Object.values(offers).filter(o => o.tokenId === tokenId);
}

export function getOffersByBidder(bidder: string): OfferInfo[] {
  const offers = getStore().offers || {};
  return Object.values(offers).filter(o => o.bidder === bidder);
}

export function getAllOffers(): OfferInfo[] {
  const offers = getStore().offers || {};
  return Object.values(offers);
}

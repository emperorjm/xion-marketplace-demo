import { Coin } from '@cosmjs/amino';
import { blake2s } from '@noble/hashes/blake2s';
import { utf8ToBytes } from '@noble/hashes/utils';

type Expiration =
  | { at_height: number }
  | { at_time: string }
  | { never: {} };

export const buildCoin = (amount?: string | boolean, denom?: string | boolean): Coin => {
  if (!amount || !denom) {
    throw new Error('Amount and denom are required');
  }
  const amountStr = typeof amount === 'string' ? amount.trim() : String(amount);
  const denomStr = typeof denom === 'string' ? denom.trim() : String(denom);
  if (!amountStr || !denomStr) {
    throw new Error('Amount and denom are required');
  }
  return {
    amount: amountStr,
    denom: denomStr,
  };
};

export const parseOptionalString = (value?: string | boolean): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const parseExpiration = (value?: string | boolean): Expiration | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const input = value.trim();
  if (!input) {
    return undefined;
  }
  if (input.toLowerCase() === 'never') {
    return { never: {} };
  }
  if (input.startsWith('height:')) {
    const h = Number(input.split('height:')[1]);
    if (Number.isNaN(h)) {
      throw new Error('Invalid height expiration');
    }
    return { at_height: h };
  }
  if (input.startsWith('time:')) {
    const t = input.split('time:')[1];
    if (!t) {
      throw new Error('Invalid time expiration');
    }
    return { at_time: t };
  }
  if (/^\d+$/.test(input)) {
    return { at_time: input };
  }
  throw new Error('Expiration must be never, height:<n>, time:<seconds> or raw seconds');
};

export const safeJsonParse = <T>(value?: string, fallback: T = {} as T): T => {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    throw new Error('Invalid JSON payload');
  }
};

export const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

export const parseList = (value?: string | boolean): string[] => {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export const resolveResourceUri = (uri?: string): string | undefined => {
  if (!uri) {
    return undefined;
  }
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`;
  }
  if (uri.startsWith('ipns://')) {
    return `https://ipfs.io/ipns/${uri.replace('ipns://', '')}`;
  }
  if (uri.startsWith('ar://')) {
    return `https://arweave.net/${uri.replace('ar://', '')}`;
  }
  return uri;
};

export const fetchJsonFromUri = async (uri?: string) => {
  const resolved = resolveResourceUri(uri);
  if (!resolved) {
    return undefined;
  }
  try {
    const response = await fetch(resolved);
    if (!response.ok) {
      return undefined;
    }
    return await response.json();
  } catch {
    return undefined;
  }
};

export const extractImageFromMetadata = (metadata?: Record<string, any>) => {
  if (!metadata) {
    return undefined;
  }
  return (
    metadata.image ||
    metadata.image_url ||
    metadata.imageUri ||
    metadata.animation_url ||
    metadata?.media?.image ||
    metadata?.properties?.image ||
    metadata?.content?.media?.url
  );
};

export const preloadImage = (url?: string): Promise<string | undefined> => {
  if (!url) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(undefined);
    img.src = url;
  });
};

export const shortenAddress = (address?: string, prefix = 6, suffix = 4) => {
  if (!address) {
    return '';
  }
  if (address.length <= prefix + suffix + 3) {
    return address;
  }
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`;
};

export const generateListingId = (collectionAddress: string, tokenId: string) => {
  const hasher = blake2s.create();
  hasher.update(utf8ToBytes(collectionAddress));
  hasher.update(utf8ToBytes(tokenId));
  const digest = hasher.digest();
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const pluginKeyNameMap: Record<string, string> = {
  exact_price: 'ExactPrice',
  minimum_price: 'MinimumPrice',
  requires_proof: 'RequiresProof',
  not_before: 'NotBefore',
  not_after: 'NotAfter',
  time_lock: 'TimeLock',
  royalty: 'Royalty',
  allowed_marketplaces: 'AllowedMarketplaces',
  allowed_currencies: 'AllowedCurrencies',
};

export const toPluginName = (raw?: string) => {
  if (!raw) {
    return undefined;
  }
  return pluginKeyNameMap[raw] ?? raw;
};

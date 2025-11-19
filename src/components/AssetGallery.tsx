import React, { useMemo, useState } from 'react';
import { useCosmos } from '../hooks/useCosmos';
import {
  extractImageFromMetadata,
  fetchJsonFromUri,
  generateListingId,
  preloadImage,
  randomId,
  resolveResourceUri,
  shortenAddress,
} from '../lib/helpers';

const PLACEHOLDER_IMAGE = '/assets/asset-placeholder.svg';

type GalleryMode = 'all' | 'owner' | 'listed';

interface GalleryItem {
  id: string;
  tokenId: string;
  name: string;
  owner?: string;
  image?: string;
  tokenUri?: string | null;
  listed?: boolean;
  listingId?: string;
  price?: string;
  denom?: string;
  seller?: string;
}

const modeOptions: { value: GalleryMode; label: string }[] = [
  { value: 'all', label: 'All Tokens' },
  { value: 'owner', label: 'Tokens by Owner' },
  { value: 'listed', label: 'Listed Tokens' },
];

export const AssetGallery: React.FC = () => {
  const { config, query } = useCosmos();
  const [mode, setMode] = useState<GalleryMode>('all');
  const [owner, setOwner] = useState('');
  const [limit, setLimit] = useState('20');
  const [startAfter, setStartAfter] = useState('');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limitNumber = useMemo(() => {
    const parsed = Number(limit);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [limit]);

  const fetchListingsMap = async (): Promise<Map<string, any>> => {
    const listingResponse = (await query(config.assetContract, {
      extension: {
        msg: {
          get_all_listings: {
            start_after: startAfter || undefined,
            limit: limitNumber,
          },
        },
      },
    })) as Array<any>;
    const map = new Map<string, any>();
    listingResponse?.forEach((listing) => {
      if (listing?.id) {
        map.set(listing.id, listing);
      }
    });
    return map;
  };

  const fetchMarketplaceListing = async (tokenId: string) => {
    if (!config.marketplaceContract) {
      return undefined;
    }
    const listingId = generateListingId(config.assetContract, tokenId);
    try {
      const listing = (await query(config.marketplaceContract, {
        listing: {
          listing_id: listingId,
        },
      })) as any;
      return listing;
    } catch (err) {
      console.warn('Unable to fetch marketplace listing', tokenId, err);
      return undefined;
    }
  };

  const fetchTokenIds = async (): Promise<{ tokenIds: string[]; listings?: Map<string, any> }> => {
    if (!config.assetContract) {
      throw new Error('Configure the asset contract address first');
    }
    if (mode === 'listed') {
      const listings = await fetchListingsMap();
      return { tokenIds: Array.from(listings.keys()), listings };
    }
    if (mode === 'owner') {
      if (!owner.trim()) {
        throw new Error('Provide an owner address');
      }
      const response = (await query(config.assetContract, {
        tokens: {
          owner: owner.trim(),
          start_after: startAfter || undefined,
          limit: limitNumber,
        },
      })) as { tokens: string[] };
      return { tokenIds: response.tokens ?? [] };
    }
    const response = (await query(config.assetContract, {
      all_tokens: {
        start_after: startAfter || undefined,
        limit: limitNumber,
      },
    })) as { tokens: string[] };
    return { tokenIds: response.tokens ?? [] };
  };

  const resolveImageData = async (tokenUri?: string | null, extension?: Record<string, any>) => {
    const extensionImage = extractImageFromMetadata(extension);
    if (extensionImage) {
      return resolveResourceUri(extensionImage) || extensionImage;
    }
    if (!tokenUri) {
      return undefined;
    }
    const metadata = await fetchJsonFromUri(tokenUri);
    if (!metadata) {
      return undefined;
    }
    const image = extractImageFromMetadata(metadata);
    return image ? resolveResourceUri(image) || image : undefined;
  };

  const loadAssets = async () => {
    if (!config.assetContract) {
      setError('Configure the asset contract address first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { tokenIds, listings } = await fetchTokenIds();
      const nextItems: GalleryItem[] = [];
      for (const tokenId of tokenIds) {
        try {
          const nft = (await query(config.assetContract, {
            all_nft_info: {
              token_id: tokenId,
              include_expired: false,
            },
          })) as any;
          const info = nft?.info ?? {};
          const access = nft?.access ?? {};
          const image = await resolveImageData(info.token_uri, info.extension);
          const hydratedImage = (await preloadImage(image)) ?? PLACEHOLDER_IMAGE;
          const listing = listings?.get(tokenId);
          const marketplaceListing = await fetchMarketplaceListing(tokenId);
          nextItems.push({
            id: randomId(),
            tokenId,
            name: info?.extension?.name || nft?.info?.name || `Token #${tokenId}`,
            owner: access.owner,
            image: hydratedImage,
            tokenUri: info.token_uri,
            listed: Boolean(listing),
            listingId:
              marketplaceListing?.id ?? (listing ? generateListingId(config.assetContract, tokenId) : undefined),
            price: listing?.price?.amount,
            denom: listing?.price?.denom,
            seller: listing?.seller,
          });
        } catch (tokenErr) {
          console.error('Failed to load token', tokenId, tokenErr);
        }
      }
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to query assets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="asset-gallery">
      <div className="section-header">
        <h2>Asset Gallery</h2>
        <span className="helper-text">Inspect NFTs and active listings</span>
      </div>
      <div className="action-card">
        <div className="flex-row">
          <div style={{ minWidth: '180px' }}>
            <label htmlFor="gallery-mode">Query Type</label>
            <select id="gallery-mode" value={mode} onChange={(event) => setMode(event.target.value as GalleryMode)}>
              {modeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gallery-limit">Limit</label>
            <input
              id="gallery-limit"
              type="number"
              min="1"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="gallery-start-after">Start After</label>
            <input
              id="gallery-start-after"
              value={startAfter}
              placeholder="token id"
              onChange={(event) => setStartAfter(event.target.value)}
            />
          </div>
          {mode === 'owner' && (
            <div style={{ flex: 1 }}>
              <label htmlFor="gallery-owner">Owner Address</label>
              <input
                id="gallery-owner"
                value={owner}
                placeholder="xion1..."
                onChange={(event) => setOwner(event.target.value)}
              />
            </div>
          )}
          <div className="wallet-actions" style={{ alignItems: 'flex-end' }}>
            <button className="primary" type="button" onClick={loadAssets} disabled={loading}>
              {loading ? 'Loading...' : 'Load Assets'}
            </button>
          </div>
        </div>
        {error && <p className="helper-text" style={{ color: '#b91c1c' }}>{error}</p>}
      </div>
      <div className="gallery-grid">
        {items.length === 0 && !loading && <p className="helper-text">No items yet. Run a query above.</p>}
        {items.map((item) => (
          <div key={item.id} className="asset-card">
            <div className="asset-image" style={{ backgroundImage: `url(${item.image || PLACEHOLDER_IMAGE})` }} />
            <div className="asset-title">{item.name || `Token #${item.tokenId}`}</div>
            <div className="asset-meta">
              <span>Token: {item.tokenId}</span>
              {item.owner && <span>Owner: {shortenAddress(item.owner)}</span>}
              {item.listed && (
                <span className="badge">
                  Listed {item.price && item.denom ? `· ${item.price}${item.denom}` : ''}
                </span>
              )}
              {item.listingId && (
                <span>
                  Listing ID: <code>{shortenAddress(item.listingId, 6, 6)}</code>{' '}
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}
                    onClick={() => navigator.clipboard?.writeText(item.listingId ?? '')}
                  >
                    Copy
                  </button>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

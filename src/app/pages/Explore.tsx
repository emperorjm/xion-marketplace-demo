import { useState, useEffect, useCallback } from 'react';
import { NFTCard } from '../components/NFTCard';
import { useCosmos } from '../../hooks/useCosmos';
import { fetchJsonFromUri, extractImageFromMetadata } from '../../lib/helpers';

interface NFTItem {
  tokenId: string;
  name: string;
  image?: string;
  owner?: string;
  isListed: boolean;
  price?: string;
  denom?: string;
}

export function Explore() {
  const { config, query } = useCosmos();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'listed'>('all');

  const loadNFTs = useCallback(async () => {
    if (!config.assetContract) {
      setLoading(false);
      setError('Asset contract not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all listings from blockchain first
      const listingsMap = new Map<string, { price: string; denom: string }>();
      try {
        const listingsResult = await query(config.assetContract, {
          extension: {
            msg: {
              get_all_listings: {
                start_after: undefined,
                limit: 100,
              },
            },
          },
        }) as Array<{ id: string; price?: { amount: string; denom: string } }>;

        if (Array.isArray(listingsResult)) {
          listingsResult.forEach((listing) => {
            if (listing?.id && listing?.price) {
              listingsMap.set(listing.id, {
                price: listing.price.amount,
                denom: listing.price.denom,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch listings from contract:', err);
      }

      // Query all tokens from the asset contract
      const tokensResult = await query(config.assetContract, {
        all_tokens: { limit: 100 },
      }) as { tokens: string[] };

      const tokens = tokensResult.tokens || [];

      // Fetch details for each token
      const nftPromises = tokens.map(async (tokenId: string) => {
        try {
          // Get NFT info
          const nftInfo = await query(config.assetContract, {
            nft_info: { token_id: tokenId },
          }) as { token_uri?: string; extension?: { name?: string; image?: string } };

          // Get owner info
          const ownerInfo = await query(config.assetContract, {
            owner_of: { token_id: tokenId },
          }) as { owner: string };

          // Check listing info from blockchain data
          let isListed = false;
          let price: string | undefined;
          let denom: string | undefined;

          const listing = listingsMap.get(tokenId);
          if (listing) {
            isListed = true;
            price = listing.price;
            denom = listing.denom;
          }

          // Get metadata
          let name = nftInfo.extension?.name || `Token #${tokenId}`;
          let image = nftInfo.extension?.image;

          if (nftInfo.token_uri && !image) {
            try {
              const metadata = await fetchJsonFromUri(nftInfo.token_uri);
              name = metadata.name || name;
              image = extractImageFromMetadata(metadata);
            } catch {
              // Ignore metadata fetch errors
            }
          }

          return {
            tokenId,
            name,
            image,
            owner: ownerInfo.owner,
            isListed,
            price,
            denom,
          };
        } catch (err) {
          console.error(`Error loading NFT ${tokenId}:`, err);
          return {
            tokenId,
            name: `Token #${tokenId}`,
            owner: undefined,
            isListed: false,
          };
        }
      });

      const loadedNfts = await Promise.all(nftPromises);
      setNfts(loadedNfts);
    } catch (err) {
      console.error('Error loading NFTs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }, [config.assetContract, query]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  const filteredNfts = filter === 'listed' ? nfts.filter((n) => n.isListed) : nfts;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Explore NFTs</h1>
          <p className="page-subtitle">Discover unique digital collectibles</p>
        </div>
        <button className="btn btn-secondary" onClick={loadNFTs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All NFTs ({nfts.length})
        </button>
        <button className={`tab ${filter === 'listed' ? 'active' : ''}`} onClick={() => setFilter('listed')}>
          Listed ({nfts.filter((n) => n.isListed).length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">Error Loading NFTs</div>
          <div className="empty-state-text">{error}</div>
          <button className="btn btn-primary" onClick={loadNFTs}>
            Try Again
          </button>
        </div>
      ) : filteredNfts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <div className="empty-state-title">No NFTs Found</div>
          <div className="empty-state-text">
            {filter === 'listed'
              ? 'No NFTs are currently listed for sale.'
              : 'No NFTs have been minted in this collection yet.'}
          </div>
        </div>
      ) : (
        <div className="nft-grid">
          {filteredNfts.map((nft) => (
            <NFTCard
              key={nft.tokenId}
              tokenId={nft.tokenId}
              name={nft.name}
              image={nft.image}
              isListed={nft.isListed}
              price={nft.price}
              denom={nft.denom}
            />
          ))}
        </div>
      )}
    </div>
  );
}

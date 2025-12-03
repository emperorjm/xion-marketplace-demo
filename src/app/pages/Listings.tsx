import { useState, useEffect, useCallback } from 'react';
import { NFTCard } from '../components/NFTCard';
import { useCosmos } from '../../hooks/useCosmos';
import { fetchJsonFromUri, extractImageFromMetadata, buildCoin } from '../../lib/helpers';
import { addActivity } from '../store/localStore';

interface ListedNFT {
  tokenId: string;
  name: string;
  image?: string;
  price: string;
  denom: string;
}

export function Listings() {
  const { config, query, execute, address, isConnected } = useCosmos();
  const [listings, setListings] = useState<ListedNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMyListings = useCallback(async () => {
    if (!config.assetContract || !address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get tokens owned by user
      const tokensResult = await query(config.assetContract, {
        tokens: { owner: address, limit: 100 },
      }) as { tokens: string[] };

      const tokens = tokensResult.tokens || [];
      const listedNfts: ListedNFT[] = [];

      for (const tokenId of tokens) {
        try {
          // Check if listed
          const listingInfo = await query(config.assetContract, {
            extension: { msg: { listing: { token_id: tokenId } } },
          }) as { price?: { amount: string; denom: string } };

          if (listingInfo?.price) {
            // Get NFT metadata
            const nftInfo = await query(config.assetContract, {
              nft_info: { token_id: tokenId },
            }) as { token_uri?: string; extension?: { name?: string; image?: string } };

            let name = nftInfo.extension?.name || `Token #${tokenId}`;
            let image = nftInfo.extension?.image;

            if (nftInfo.token_uri && !image) {
              try {
                const metadata = await fetchJsonFromUri(nftInfo.token_uri);
                name = metadata.name || name;
                image = extractImageFromMetadata(metadata);
              } catch {
                // Ignore
              }
            }

            listedNfts.push({
              tokenId,
              name,
              image,
              price: listingInfo.price.amount,
              denom: listingInfo.price.denom,
            });
          }
        } catch {
          // Not listed or error
        }
      }

      setListings(listedNfts);
    } catch (err) {
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  }, [config.assetContract, address, query]);

  useEffect(() => {
    if (isConnected) {
      loadMyListings();
    } else {
      setLoading(false);
    }
  }, [isConnected, loadMyListings]);

  const handleDelist = async (tokenId: string) => {
    setActionLoading(tokenId);
    try {
      const msg = {
        update_extension: {
          msg: { delist: { token_id: tokenId } },
        },
      };
      const result = await execute(config.assetContract, msg);

      addActivity({
        type: 'delist',
        tokenId,
        from: address,
        txHash: result.transactionHash,
      });

      loadMyListings();
    } catch (err) {
      console.error('Error delisting:', err);
      alert(err instanceof Error ? err.message : 'Failed to delist');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePrice = async (tokenId: string, newPrice: string) => {
    const priceInMicro = (parseFloat(newPrice) * 1_000_000).toString();
    setActionLoading(tokenId);
    try {
      const msg = {
        update_extension: {
          msg: {
            update_listing: {
              token_id: tokenId,
              price: buildCoin(priceInMicro, config.defaultDenom),
            },
          },
        },
      };
      const result = await execute(config.assetContract, msg);

      addActivity({
        type: 'price_update',
        tokenId,
        from: address,
        price: priceInMicro,
        txHash: result.transactionHash,
      });

      loadMyListings();
    } catch (err) {
      console.error('Error updating price:', err);
      alert(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (amount: string, denomination: string) => {
    const num = parseFloat(amount) / 1_000_000;
    return `${num.toLocaleString()} ${denomination.replace('u', '').toUpperCase()}`;
  };

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">My Listings</h1>
          <p className="page-subtitle">Manage your NFTs for sale</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">Connect your wallet to manage listings</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">My Listings</h1>
          <p className="page-subtitle">You have {listings.length} NFTs listed for sale</p>
        </div>
        <button className="btn btn-secondary" onClick={loadMyListings} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No Active Listings</div>
          <div className="empty-state-text">You don't have any NFTs listed for sale.</div>
        </div>
      ) : (
        <div className="nft-grid">
          {listings.map((nft) => (
            <div key={nft.tokenId} className="card">
              <NFTCard
                tokenId={nft.tokenId}
                name={nft.name}
                image={nft.image}
                price={nft.price}
                denom={nft.denom}
                isListed
              />
              <div className="card-body" style={{ borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Listed at {formatPrice(nft.price, nft.denom)}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const newPrice = prompt('Enter new price:');
                      if (newPrice) handleUpdatePrice(nft.tokenId, newPrice);
                    }}
                    disabled={actionLoading === nft.tokenId}
                  >
                    Update Price
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => handleDelist(nft.tokenId)}
                    disabled={actionLoading === nft.tokenId}
                  >
                    {actionLoading === nft.tokenId ? 'Delisting...' : 'Delist'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

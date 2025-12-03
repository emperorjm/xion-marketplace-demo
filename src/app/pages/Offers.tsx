import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCosmos } from '../../hooks/useCosmos';
import { fetchJsonFromUri, extractImageFromMetadata } from '../../lib/helpers';
import { addActivity } from '../store/localStore';

interface Offer {
  offerId: string;
  tokenId: string;
  name: string;
  image?: string;
  offerer: string;
  price: string;
  denom: string;
  type: 'incoming' | 'outgoing';
}

export function Offers() {
  const { config, query, execute, address, isConnected } = useCosmos();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const loadOffers = useCallback(async () => {
    if (!config.marketplaceContract || !address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Query offers made by user (outgoing)
      const outgoingResult = await query(config.marketplaceContract, {
        offers_by_bidder: { bidder: address, limit: 50 },
      }) as { offers: Array<{ offer_id: string; token_id: string; price: { amount: string; denom: string } }> };

      // Query offers on user's NFTs (incoming) - would need to iterate through user's tokens
      const tokensResult = await query(config.assetContract, {
        tokens: { owner: address, limit: 100 },
      }) as { tokens: string[] };

      const allOffers: Offer[] = [];

      // Process outgoing offers
      for (const offer of outgoingResult.offers || []) {
        try {
          const nftInfo = await query(config.assetContract, {
            nft_info: { token_id: offer.token_id },
          }) as { token_uri?: string; extension?: { name?: string; image?: string } };

          let name = nftInfo.extension?.name || `Token #${offer.token_id}`;
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

          allOffers.push({
            offerId: offer.offer_id,
            tokenId: offer.token_id,
            name,
            image,
            offerer: address,
            price: offer.price.amount,
            denom: offer.price.denom,
            type: 'outgoing',
          });
        } catch {
          // Ignore errors
        }
      }

      // Check for incoming offers on user's tokens
      for (const tokenId of tokensResult.tokens || []) {
        try {
          const offersResult = await query(config.marketplaceContract, {
            offers_by_token: { token_id: tokenId, limit: 50 },
          }) as { offers: Array<{ offer_id: string; bidder: string; price: { amount: string; denom: string } }> };

          for (const offer of offersResult.offers || []) {
            if (offer.bidder !== address) {
              const nftInfo = await query(config.assetContract, {
                nft_info: { token_id: tokenId },
              }) as { token_uri?: string; extension?: { name?: string; image?: string } };

              let name = nftInfo.extension?.name || `Token #${tokenId}`;
              let image = nftInfo.extension?.image;

              allOffers.push({
                offerId: offer.offer_id,
                tokenId,
                name,
                image,
                offerer: offer.bidder,
                price: offer.price.amount,
                denom: offer.price.denom,
                type: 'incoming',
              });
            }
          }
        } catch {
          // No offers or error
        }
      }

      setOffers(allOffers);
    } catch (err) {
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  }, [config.marketplaceContract, config.assetContract, address, query]);

  useEffect(() => {
    if (isConnected) {
      loadOffers();
    } else {
      setLoading(false);
    }
  }, [isConnected, loadOffers]);

  const handleAcceptOffer = async (offer: Offer) => {
    setActionLoading(offer.offerId);
    try {
      const msg = {
        accept_offer: { offer_id: offer.offerId },
      };
      const result = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'accept_offer',
        tokenId: offer.tokenId,
        from: address,
        to: offer.offerer,
        price: offer.price,
        txHash: result.transactionHash,
      });

      loadOffers();
    } catch (err) {
      console.error('Error accepting offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to accept offer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOffer = async (offer: Offer) => {
    setActionLoading(offer.offerId);
    try {
      const msg = {
        reject_offer: { offer_id: offer.offerId },
      };
      const result = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'reject_offer',
        tokenId: offer.tokenId,
        from: address,
        txHash: result.transactionHash,
      });

      loadOffers();
    } catch (err) {
      console.error('Error rejecting offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject offer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOffer = async (offer: Offer) => {
    setActionLoading(offer.offerId);
    try {
      const msg = {
        cancel_offer: { offer_id: offer.offerId },
      };
      const result = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'cancel_offer',
        tokenId: offer.tokenId,
        from: address,
        txHash: result.transactionHash,
      });

      loadOffers();
    } catch (err) {
      console.error('Error cancelling offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel offer');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (amount: string, denomination: string) => {
    const num = parseFloat(amount) / 1_000_000;
    return `${num.toLocaleString()} ${denomination.replace('u', '').toUpperCase()}`;
  };

  const filteredOffers = filter === 'all' ? offers : offers.filter((o) => o.type === filter);

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Offers</h1>
          <p className="page-subtitle">Manage your offers</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">Connect your wallet to view offers</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Offers</h1>
          <p className="page-subtitle">Manage incoming and outgoing offers</p>
        </div>
        <button className="btn btn-secondary" onClick={loadOffers} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({offers.length})
        </button>
        <button className={`tab ${filter === 'incoming' ? 'active' : ''}`} onClick={() => setFilter('incoming')}>
          Incoming ({offers.filter((o) => o.type === 'incoming').length})
        </button>
        <button className={`tab ${filter === 'outgoing' ? 'active' : ''}`} onClick={() => setFilter('outgoing')}>
          Outgoing ({offers.filter((o) => o.type === 'outgoing').length})
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📨</div>
          <div className="empty-state-title">No Offers</div>
          <div className="empty-state-text">
            {filter === 'incoming'
              ? 'No one has made offers on your NFTs yet.'
              : filter === 'outgoing'
              ? "You haven't made any offers yet."
              : 'No offers to display.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOffers.map((offer) => (
            <div key={offer.offerId} className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* NFT Image */}
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'var(--bg-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {offer.image ? (
                    <img src={offer.image} alt={offer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🖼️
                    </div>
                  )}
                </div>

                {/* Offer Info */}
                <div style={{ flex: 1 }}>
                  <Link to={`/app/item/${offer.tokenId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{offer.name}</h3>
                  </Link>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {offer.type === 'incoming' ? `Offer from ${offer.offerer.slice(0, 12)}...` : 'Your offer'}
                  </p>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '20px', fontWeight: '700' }}>{formatPrice(offer.price, offer.denom)}</p>
                  <span className={`nft-card-status ${offer.type === 'incoming' ? 'listed' : 'owned'}`}>
                    {offer.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {offer.type === 'incoming' ? (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAcceptOffer(offer)}
                        disabled={actionLoading === offer.offerId}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleRejectOffer(offer)}
                        disabled={actionLoading === offer.offerId}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCancelOffer(offer)}
                      disabled={actionLoading === offer.offerId}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCosmos } from '../../hooks/useCosmos';
import { fetchJsonFromUri, extractImageFromMetadata } from '../../lib/helpers';
import { getOffersByBidder, removeOffer } from '../store/localStore';

interface Offer {
  offerId: string;
  tokenId: string;
  name: string;
  image?: string;
  price: string;
  denom: string;
}

export function Offers() {
  const { config, query, execute, address, isConnected } = useCosmos();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allOffers: Offer[] = [];

      // Load offers from localStorage (only offers you've made)
      const localOffers = getOffersByBidder(address);
      for (const offer of localOffers) {
        let name = `Token #${offer.tokenId}`;
        let image: string | undefined;

        if (config.assetContract) {
          try {
            const nftInfo = await query(config.assetContract, {
              nft_info: { token_id: offer.tokenId },
            }) as { token_uri?: string; extension?: { name?: string; image?: string } };

            name = nftInfo.extension?.name || name;
            image = nftInfo.extension?.image;

            if (nftInfo.token_uri && !image) {
              try {
                const metadata = await fetchJsonFromUri(nftInfo.token_uri);
                name = metadata.name || name;
                image = extractImageFromMetadata(metadata);
              } catch {
                // Ignore
              }
            }
          } catch {
            // Ignore errors
          }
        }

        allOffers.push({
          offerId: offer.offerId,
          tokenId: offer.tokenId,
          name,
          image,
          price: offer.price,
          denom: offer.denom,
        });
      }

      setOffers(allOffers);
    } catch (err) {
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  }, [config.assetContract, address, query]);

  useEffect(() => {
    if (isConnected) {
      loadOffers();
    } else {
      setLoading(false);
    }
  }, [isConnected, loadOffers]);

  const handleCancelOffer = async (offer: Offer) => {
    const confirmed = window.confirm('Cancel your offer?');
    if (!confirmed) return;

    setActionLoading(offer.offerId);
    try {
      const msg = {
        cancel_offer: { offer_id: offer.offerId },
      };
      await execute(config.marketplaceContract, msg);

      // Remove offer from localStorage and update state
      removeOffer(offer.offerId);
      setOffers(prev => prev.filter(o => o.offerId !== offer.offerId));

      alert('Offer cancelled.');
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

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">My Offers</h1>
          <p className="page-subtitle">Offers you've made</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">Connect your wallet to view your offers</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">My Offers</h1>
          <p className="page-subtitle">Offers you've made (tracked locally in this browser)</p>
        </div>
        <button className="btn btn-secondary" onClick={loadOffers} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
        </div>
      ) : offers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📨</div>
          <div className="empty-state-title">No Offers</div>
          <div className="empty-state-text">
            You haven't made any offers yet. Browse NFTs and make offers from the item detail page.
          </div>
          <Link to="/explore" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Explore NFTs
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {offers.map((offer) => (
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
                  <Link to={`/item/${offer.tokenId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{offer.name}</h3>
                  </Link>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Your offer</p>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '20px', fontWeight: '700' }}>{formatPrice(offer.price, offer.denom)}</p>
                  <span className="nft-card-status owned">Pending</span>
                </div>

                {/* Actions */}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCancelOffer(offer)}
                  disabled={actionLoading === offer.offerId}
                >
                  {actionLoading === offer.offerId ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

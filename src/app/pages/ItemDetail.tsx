import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCosmos } from '../../hooks/useCosmos';
import { useRole } from '../hooks/useLocalStore';
import { fetchJsonFromUri, extractImageFromMetadata, buildCoin } from '../../lib/helpers';
import { addActivity, addListing, getListing, removeListing, addOffer, removeOffer, getOffersByToken } from '../store/localStore';

interface NFTDetails {
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  owner: string;
  isListed: boolean;
  price?: string;
  denom?: string;
}

interface OfferInfo {
  offerId: string;
  bidder: string;
  price: string;
  denom: string;
}

export function ItemDetail() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { config, query, execute, address, isConnected } = useCosmos();
  const { role } = useRole();
  const [nft, setNft] = useState<NFTDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [showListModal, setShowListModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offers, setOffers] = useState<OfferInfo[]>([]);

  const loadNFT = useCallback(async () => {
    if (!config.assetContract || !tokenId) return;

    setLoading(true);
    try {
      const nftInfo = await query(config.assetContract, {
        nft_info: { token_id: tokenId },
      }) as { token_uri?: string; extension?: { name?: string; description?: string; image?: string } };

      const ownerInfo = await query(config.assetContract, {
        owner_of: { token_id: tokenId },
      }) as { owner: string };

      let isListed = false;
      let price: string | undefined;
      let denom: string | undefined;

      // Check localStorage first for listing info
      const localListing = getListing(tokenId);
      if (localListing) {
        isListed = true;
        price = localListing.price;
        denom = localListing.denom;
      } else {
        // Try contract query as fallback
        try {
          const listingInfo = await query(config.assetContract, {
            extension: { msg: { listing: { token_id: tokenId } } },
          }) as { price?: { amount: string; denom: string } };

          if (listingInfo?.price) {
            isListed = true;
            price = listingInfo.price.amount;
            denom = listingInfo.price.denom;
          }
        } catch {
          // Not listed
        }
      }

      let name = nftInfo.extension?.name || `Token #${tokenId}`;
      let description = nftInfo.extension?.description;
      let image = nftInfo.extension?.image;

      if (nftInfo.token_uri && !image) {
        try {
          const metadata = await fetchJsonFromUri(nftInfo.token_uri);
          name = metadata.name || name;
          description = metadata.description || description;
          image = extractImageFromMetadata(metadata);
        } catch {
          // Ignore
        }
      }

      setNft({
        tokenId,
        name,
        description,
        image,
        owner: ownerInfo.owner,
        isListed,
        price,
        denom,
      });

      // Load offers for this NFT from localStorage
      // Note: Contract doesn't support listing offers by token, so we only show locally-tracked offers
      const localOffers = getOffersByToken(tokenId);
      setOffers(localOffers.map(o => ({
        offerId: o.offerId,
        bidder: o.bidder,
        price: o.price,
        denom: o.denom,
      })));
    } catch (err) {
      console.error('Error loading NFT:', err);
    } finally {
      setLoading(false);
    }
  }, [config.assetContract, tokenId, query]);

  useEffect(() => {
    loadNFT();
  }, [loadNFT]);

  const formatPrice = (amount: string, denomination: string) => {
    const num = parseFloat(amount) / 1_000_000;
    return `${num.toLocaleString()} ${denomination.replace('u', '').toUpperCase()}`;
  };

  const handleBuy = async () => {
    if (!nft?.isListed || !nft.price || !nft.denom) return;

    const confirmed = window.confirm(`Buy "${nft.name}" for ${formatPrice(nft.price, nft.denom)}?`);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const msg = {
        update_extension: {
          msg: { buy: { token_id: tokenId, recipient: address } },
        },
      };
      const funds = [buildCoin(nft.price, nft.denom)];
      const result = await execute(config.assetContract, msg, undefined, funds);

      addActivity({
        type: 'buy',
        tokenId: tokenId!,
        from: nft.owner,
        to: address,
        price: nft.price,
        txHash: result.transactionHash,
      });

      // Clear listing from localStorage after successful purchase
      removeListing(tokenId!);

      // Directly update state to show correct ownership and status
      setNft({
        ...nft,
        isListed: false,
        price: undefined,
        denom: undefined,
        owner: address!,
      });

      alert(`Successfully purchased "${nft.name}"!`);
    } catch (err) {
      console.error('Error buying:', err);
      alert(err instanceof Error ? err.message : 'Failed to buy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleList = async () => {
    if (!listPrice) return;

    setActionLoading(true);
    try {
      const priceInMicro = (parseFloat(listPrice) * 1_000_000).toString();
      const msg = {
        update_extension: {
          msg: {
            list: {
              token_id: tokenId,
              price: buildCoin(priceInMicro, config.defaultDenom),
            },
          },
        },
      };
      const result = await execute(config.assetContract, msg);

      addActivity({
        type: 'list',
        tokenId: tokenId!,
        from: address,
        price: priceInMicro,
        txHash: result.transactionHash,
      });

      // Store listing in localStorage for immediate UI update
      addListing(tokenId!, priceInMicro, config.defaultDenom);

      setShowListModal(false);
      setListPrice('');
      alert(`Successfully listed for ${listPrice} ${config.defaultDenom.replace('u', '').toUpperCase()}!`);
      loadNFT();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // If listing already exists on-chain, sync it to localStorage
      if (errorMsg.includes('Listing already exists')) {
        const priceInMicro = (parseFloat(listPrice) * 1_000_000).toString();
        addListing(tokenId!, priceInMicro, config.defaultDenom);
        setShowListModal(false);
        setListPrice('');
        loadNFT();
        return;
      }

      console.error('Error listing:', err);
      alert(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!offerAmount || !nft) return;

    const confirmed = window.confirm(
      `Make offer of ${offerAmount} ${config.defaultDenom.replace('u', '').toUpperCase()} for "${nft.name}"?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const priceInMicro = (parseFloat(offerAmount) * 1_000_000).toString();
      const price = buildCoin(priceInMicro, config.defaultDenom);
      const msg = {
        create_offer: {
          collection: config.assetContract,
          token_id: tokenId,
          price,
        },
      };
      const result = await execute(config.marketplaceContract, msg, undefined, [price]);

      // Generate offer ID from tx hash for localStorage tracking
      const offerId = `offer-${result.transactionHash.slice(0, 16)}`;

      addActivity({
        type: 'offer',
        tokenId: tokenId!,
        from: address,
        to: nft.owner,
        price: priceInMicro,
        txHash: result.transactionHash,
      });

      // Store offer in localStorage
      addOffer(offerId, tokenId!, address!, priceInMicro, config.defaultDenom);

      // Update offers state directly
      setOffers(prev => [...prev, {
        offerId,
        bidder: address!,
        price: priceInMicro,
        denom: config.defaultDenom,
      }]);

      setShowOfferModal(false);
      setOfferAmount('');
      alert('Offer submitted successfully!');
    } catch (err) {
      console.error('Error making offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to make offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOffer = async (offer: OfferInfo) => {
    const confirmed = window.confirm(
      `Accept offer of ${formatPrice(offer.price, offer.denom)} from ${offer.bidder.slice(0, 12)}...?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const msg = { accept_offer: { offer_id: offer.offerId } };
      const result = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'accept_offer',
        tokenId: tokenId!,
        from: address,
        to: offer.bidder,
        price: offer.price,
        txHash: result.transactionHash,
      });

      // Remove offer from localStorage and update state
      removeOffer(offer.offerId);
      setOffers(prev => prev.filter(o => o.offerId !== offer.offerId));

      // Update NFT state - owner is now the bidder
      if (nft) {
        setNft({ ...nft, owner: offer.bidder, isListed: false, price: undefined, denom: undefined });
      }

      alert('Offer accepted successfully!');
    } catch (err) {
      console.error('Error accepting offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to accept offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOffer = async (offer: OfferInfo) => {
    const confirmed = window.confirm('Reject this offer?');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const msg = { reject_offer: { offer_id: offer.offerId } };
      const result = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'reject_offer',
        tokenId: tokenId!,
        from: address,
        txHash: result.transactionHash,
      });

      // Remove offer from localStorage and update state
      removeOffer(offer.offerId);
      setOffers(prev => prev.filter(o => o.offerId !== offer.offerId));

      alert('Offer rejected.');
    } catch (err) {
      console.error('Error rejecting offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOffer = async (offer: OfferInfo) => {
    const confirmed = window.confirm('Cancel your offer?');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const msg = { cancel_offer: { offer_id: offer.offerId } };
      const result = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'cancel_offer',
        tokenId: tokenId!,
        from: address,
        txHash: result.transactionHash,
      });

      // Remove offer from localStorage and update state
      removeOffer(offer.offerId);
      setOffers(prev => prev.filter(o => o.offerId !== offer.offerId));

      alert('Offer cancelled.');
    } catch (err) {
      console.error('Error cancelling offer:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel offer');
    } finally {
      setActionLoading(false);
    }
  };

  const isOwner = nft?.owner === address;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-title">NFT Not Found</div>
        <Link to="/explore" className="btn btn-primary">
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/explore" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        ← Back to Explore
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Image */}
        <div>
          <div
            style={{
              aspectRatio: '1',
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {nft.image ? (
              <img src={nft.image} alt={nft.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '80px', opacity: 0.3 }}>🖼️</span>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>{nft.name}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Token ID: {nft.tokenId}</p>

          {nft.description && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Description</h3>
              <p style={{ color: 'var(--text-secondary)' }}>{nft.description}</p>
            </div>
          )}

          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {nft.isListed ? 'Current Price' : 'Status'}
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: '700' }}>
                    {nft.isListed && nft.price && nft.denom ? formatPrice(nft.price, nft.denom) : 'Not Listed'}
                  </p>
                </div>

                {isConnected && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {nft.isListed && !isOwner && (
                      <button className="btn btn-primary btn-lg" onClick={handleBuy} disabled={actionLoading}>
                        {actionLoading ? 'Buying...' : 'Buy Now'}
                      </button>
                    )}
                    {!isOwner && (
                      <button className="btn btn-secondary btn-lg" onClick={() => setShowOfferModal(true)} disabled={actionLoading}>
                        Make Offer
                      </button>
                    )}
                    {isOwner && !nft.isListed && (role === 'seller' || role === 'admin') && (
                      <button className="btn btn-primary btn-lg" onClick={() => setShowListModal(true)}>
                        List for Sale
                      </button>
                    )}
                    {isOwner && nft.isListed && (
                      <span className="nft-card-status listed" style={{ padding: '12px 20px', fontSize: '14px' }}>
                        Listed
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Owner</h3>
            <p style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              {nft.owner}
              {isOwner && <span style={{ color: 'var(--accent-green)', marginLeft: '8px' }}>(You)</span>}
            </p>
          </div>

          {/* Offers Section */}
          {offers.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Offers ({offers.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {offers.map((offer) => (
                  <div
                    key={offer.offerId}
                    className="card"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <div className="card-body" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {formatPrice(offer.price, offer.denom)}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {offer.bidder === address ? 'Your offer' : `${offer.bidder.slice(0, 12)}...${offer.bidder.slice(-6)}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isOwner && offer.bidder !== address && (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleAcceptOffer(offer)}
                              disabled={actionLoading}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleRejectOffer(offer)}
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {offer.bidder === address && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleCancelOffer(offer)}
                            disabled={actionLoading}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List Modal */}
      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">List NFT for Sale</h3>
              <button className="modal-close" onClick={() => setShowListModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Price ({config.defaultDenom.replace('u', '').toUpperCase()})</label>
                <input
                  type="number"
                  className="form-input"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowListModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleList} disabled={actionLoading || !listPrice}>
                {actionLoading ? 'Listing...' : 'List NFT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="modal-overlay" onClick={() => setShowOfferModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Make an Offer</h3>
              <button className="modal-close" onClick={() => setShowOfferModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Offer Amount ({config.defaultDenom.replace('u', '').toUpperCase()})</label>
                <input
                  type="number"
                  className="form-input"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              {nft?.isListed && nft.price && nft.denom && (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Listed price: {formatPrice(nft.price, nft.denom)}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOfferModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleMakeOffer} disabled={actionLoading || !offerAmount}>
                {actionLoading ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

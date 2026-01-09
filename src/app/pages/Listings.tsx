import { useState } from 'react';
import { NFTCard } from '../components/NFTCard';
import { useCosmos } from '../../hooks/useCosmos';
import { useUserListings } from '../../api/hooks';
import { removeListing } from '../store/localStore';

export function Listings() {
  const { config, execute, address, isConnected } = useCosmos();
  const { data: listings, loading, source, refetch } = useUserListings(address);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const dataSourceLabel = source === 'indexer' ? 'from indexer' : source === 'rpc' ? 'from blockchain' : '';

  const handleDelist = async (tokenId: string) => {
    const confirmed = window.confirm(`Are you sure you want to delist Token #${tokenId}?`);
    if (!confirmed) return;

    setActionLoading(tokenId);
    try {
      const msg = {
        update_extension: {
          msg: { delist: { token_id: tokenId } },
        },
      };
      await execute(config.assetContract, msg);

      // Clear listing from localStorage
      removeListing(tokenId);

      alert(`Successfully delisted Token #${tokenId}`);
      refetch();
    } catch (err) {
      console.error('Error delisting:', err);
      alert(err instanceof Error ? err.message : 'Failed to delist');
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
          <p className="page-subtitle">
            You have {listings.length} NFTs listed for sale
            {dataSourceLabel && <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>({dataSourceLabel})</span>}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={refetch} disabled={loading}>
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
                name={nft.name || `Token #${nft.tokenId}`}
                image={nft.image}
                price={nft.price}
                denom={nft.denom}
                isListed
              />
              <div className="card-body" style={{ borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Listed at {formatPrice(nft.price, nft.denom)}
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => handleDelist(nft.tokenId)}
                  disabled={actionLoading === nft.tokenId}
                >
                  {actionLoading === nft.tokenId ? 'Delisting...' : 'Delist'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

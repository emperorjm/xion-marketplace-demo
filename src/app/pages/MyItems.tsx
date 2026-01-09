import { NFTCard } from '../components/NFTCard';
import { useCosmos } from '../../hooks/useCosmos';
import { useUserNFTs } from '../../api/hooks';

export function MyItems() {
  const { address, isConnected } = useCosmos();
  const { data: nfts, loading, source, refetch } = useUserNFTs(address);

  const dataSourceLabel = source === 'indexer' ? 'from indexer' : source === 'rpc' ? 'from blockchain' : '';

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">My Items</h1>
          <p className="page-subtitle">View and manage your NFT collection</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">Connect your wallet to view your NFTs</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">My Items</h1>
          <p className="page-subtitle">
            You own {nfts.length} NFTs
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
      ) : nfts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <div className="empty-state-title">No NFTs Yet</div>
          <div className="empty-state-text">You don't own any NFTs in this collection yet.</div>
        </div>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => (
            <NFTCard key={nft.tokenId} tokenId={nft.tokenId} name={nft.name} image={nft.image} isOwned source={source} />
          ))}
        </div>
      )}
    </div>
  );
}

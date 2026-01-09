import { useState } from 'react';
import { NFTCard } from '../components/NFTCard';
import { useAllNFTs } from '../../api/hooks';

export function Explore() {
  const { data: nfts, loading, error, source, refetch } = useAllNFTs(100);
  const [filter, setFilter] = useState<'all' | 'listed'>('all');

  const dataSourceLabel = source === 'indexer' ? 'from indexer' : source === 'rpc' ? 'from blockchain' : '';

  const filteredNfts = filter === 'listed' ? nfts.filter((n) => n.isListed) : nfts;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Explore NFTs</h1>
          <p className="page-subtitle">
            Discover unique digital collectibles
            {dataSourceLabel && <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>({dataSourceLabel})</span>}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={refetch} disabled={loading}>
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
          <div className="empty-state-text">{error.message}</div>
          <button className="btn btn-primary" onClick={refetch}>
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
              source={source}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { NFTCard } from '../components/NFTCard';
import { useCosmos } from '../../hooks/useCosmos';
import { fetchJsonFromUri, extractImageFromMetadata } from '../../lib/helpers';

interface NFTItem {
  tokenId: string;
  name: string;
  image?: string;
}

export function MyItems() {
  const { config, query, address, isConnected } = useCosmos();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyNFTs = useCallback(async () => {
    if (!config.assetContract || !address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tokensResult = await query(config.assetContract, {
        tokens: { owner: address, limit: 100 },
      }) as { tokens: string[] };

      const tokens = tokensResult.tokens || [];

      const nftPromises = tokens.map(async (tokenId: string) => {
        try {
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

          return { tokenId, name, image };
        } catch {
          return { tokenId, name: `Token #${tokenId}` };
        }
      });

      const loadedNfts = await Promise.all(nftPromises);
      setNfts(loadedNfts);
    } catch (err) {
      console.error('Error loading NFTs:', err);
    } finally {
      setLoading(false);
    }
  }, [config.assetContract, address, query]);

  useEffect(() => {
    if (isConnected) {
      loadMyNFTs();
    } else {
      setLoading(false);
    }
  }, [isConnected, loadMyNFTs]);

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
          <p className="page-subtitle">You own {nfts.length} NFTs</p>
        </div>
        <button className="btn btn-secondary" onClick={loadMyNFTs} disabled={loading}>
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
            <NFTCard key={nft.tokenId} tokenId={nft.tokenId} name={nft.name} image={nft.image} isOwned />
          ))}
        </div>
      )}
    </div>
  );
}

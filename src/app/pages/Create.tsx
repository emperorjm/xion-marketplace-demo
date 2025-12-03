import { useState } from 'react';
import { useCosmos } from '../../hooks/useCosmos';
import { addActivity } from '../store/localStore';

export function Create() {
  const { config, execute, address, isConnected } = useCosmos();
  const [tokenId, setTokenId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.assetContract || !address) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const msg = {
        mint: {
          token_id: tokenId,
          owner: address,
          extension: {
            name: name || undefined,
            description: description || undefined,
            image: image || undefined,
          },
        },
      };

      const result = await execute(config.assetContract, msg);

      addActivity({
        type: 'mint',
        tokenId,
        to: address,
        txHash: result.transactionHash,
      });

      setSuccess(true);
      setTokenId('');
      setName('');
      setDescription('');
      setImage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint NFT');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Create NFT</h1>
          <p className="page-subtitle">Mint a new NFT in your collection</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">Connect your wallet to mint NFTs</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create NFT</h1>
        <p className="page-subtitle">Mint a new NFT in your collection</p>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleMint}>
              <div className="form-group">
                <label className="form-label">Token ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="e.g., 1, my-nft-001"
                  required
                />
                <p className="form-hint">Unique identifier for this NFT</p>
              </div>

              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome NFT"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A unique digital collectible..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                />
                <p className="form-hint">IPFS, Arweave, or HTTP URL</p>
              </div>

              {image && (
                <div className="form-group">
                  <label className="form-label">Preview</label>
                  <div
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <img
                      src={image}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
                </div>
              )}

              {success && (
                <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ color: 'var(--accent-green)', margin: 0 }}>NFT minted successfully!</p>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !tokenId}>
                {loading ? 'Minting...' : 'Mint NFT'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

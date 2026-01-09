import { useState } from 'react';
import { useCosmos } from '../../hooks/useCosmos';

export function Settings() {
  const { config, updateConfig } = useCosmos();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ [e.target.name]: e.target.value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure contract addresses to connect to a specific marketplace</p>
      </div>

      {saved && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--accent-green)',
          }}
        >
          <div className="card-body">
            <p style={{ color: 'var(--accent-green)', margin: 0 }}>Settings saved and will persist across page reloads.</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '600px' }}>
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Contract Addresses</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Enter the addresses of the deployed contracts you want to interact with.
            </p>

            <div className="form-group">
              <label className="form-label">Asset Contract (NFT Collection)</label>
              <input
                type="text"
                className="form-input"
                name="assetContract"
                value={config.assetContract}
                onChange={handleChange}
                placeholder="xion1..."
              />
              <p className="form-hint">The CW721 NFT contract address</p>
            </div>

            <div className="form-group">
              <label className="form-label">Marketplace Contract</label>
              <input
                type="text"
                className="form-input"
                name="marketplaceContract"
                value={config.marketplaceContract}
                onChange={handleChange}
                placeholder="xion1..."
              />
              <p className="form-hint">The marketplace contract for listings and trades</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-body">
            <button
              className="btn btn-secondary"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ marginBottom: showAdvanced ? '20px' : 0 }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>

            {showAdvanced && (
              <>
                <div className="form-group">
                  <label className="form-label">RPC Endpoint</label>
                  <input
                    type="text"
                    className="form-input"
                    name="rpcEndpoint"
                    value={config.rpcEndpoint}
                    onChange={handleChange}
                    placeholder="https://rpc.xion-testnet..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chain ID</label>
                  <input
                    type="text"
                    className="form-input"
                    name="chainId"
                    value={config.chainId}
                    onChange={handleChange}
                    placeholder="xion-testnet-2"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gas Price</label>
                  <input
                    type="text"
                    className="form-input"
                    name="gasPrice"
                    value={config.gasPrice}
                    onChange={handleChange}
                    placeholder="0.025uxion"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Denomination</label>
                  <input
                    type="text"
                    className="form-input"
                    name="defaultDenom"
                    value={config.defaultDenom}
                    onChange={handleChange}
                    placeholder="uxion"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-body">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Current Configuration</h3>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>Asset:</strong> {config.assetContract || 'Not set'}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Marketplace:</strong> {config.marketplaceContract || 'Not set'}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>RPC:</strong> {config.rpcEndpoint || 'Not set'}
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Chain:</strong> {config.chainId || 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

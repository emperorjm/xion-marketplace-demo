import { useState } from 'react';
import { useCosmos } from '../../hooks/useCosmos';
import { useRole } from '../hooks/useLocalStore';
import { addActivity, setFeesConfigured } from '../store/localStore';

export function Admin() {
  const { config, execute, query, address, isConnected } = useCosmos();
  const { role } = useRole();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states
  const [newMinter, setNewMinter] = useState('');
  const [feePercent, setFeePercent] = useState('');
  const [feeRecipient, setFeeRecipient] = useState('');
  const [useCustomAcceptContract, setUseCustomAcceptContract] = useState(false);
  const [customAcceptContract, setCustomAcceptContract] = useState('');

  const handleAcceptMinterOwnership = async () => {
    setLoading('accept-minter');
    setResult(null);
    try {
      const targetContract = useCustomAcceptContract && customAcceptContract
        ? customAcceptContract
        : config.assetContract;
      const msg = { update_minter_ownership: 'accept_ownership' };
      const res = await execute(targetContract, msg);

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        txHash: res.transactionHash,
        description: 'Accepted Minter Ownership',
      });

      setResult({ success: true, message: 'Minter ownership accepted!' });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to accept ownership' });
    } finally {
      setLoading(null);
    }
  };

  const handleTransferMinter = async () => {
    if (!newMinter) return;
    setLoading('transfer-minter');
    setResult(null);
    try {
      const msg = {
        update_minter_ownership: {
          transfer_ownership: { new_minter: newMinter },
        },
      };
      const res = await execute(config.assetContract, msg);

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        to: newMinter,
        txHash: res.transactionHash,
        description: 'Transferred Minter Ownership',
      });

      setResult({ success: true, message: `Minter ownership transfer initiated to ${newMinter}` });
      setNewMinter('');
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to transfer ownership' });
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateFees = async () => {
    if (!feePercent) return;
    setLoading('update-fees');
    setResult(null);
    try {
      // Query current config to get existing values
      const currentConfig = await query(config.marketplaceContract, { config: {} });

      // Convert fee percentage to basis points (2.5% → 250 bps)
      const feeBps = Math.round(parseFloat(feePercent) * 100);

      const msg = {
        update_config: {
          config: {
            manager: currentConfig.manager || address,
            fee_recipient: feeRecipient || currentConfig.fee_recipient || address,
            fee_bps: feeBps,
            sale_approvals: currentConfig.sale_approvals ?? false,
            listing_denom: currentConfig.listing_denom || config.defaultDenom,
          },
        },
      };
      const res = await execute(config.marketplaceContract, msg);

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        txHash: res.transactionHash,
        description: 'Updated Marketplace Config',
      });

      setFeesConfigured(true);
      setResult({ success: true, message: 'Marketplace fees updated!' });
      setFeePercent('');
      setFeeRecipient('');
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to update fees' });
    } finally {
      setLoading(null);
    }
  };

  const handleQueryMinter = async () => {
    setLoading('query-minter');
    setResult(null);
    try {
      const res = await query(config.assetContract, { get_minter_ownership: {} });
      setResult({ success: true, message: `Minter: ${JSON.stringify(res, null, 2)}` });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to query minter' });
    } finally {
      setLoading(null);
    }
  };

  const handleQueryConfig = async () => {
    setLoading('query-config');
    setResult(null);
    try {
      const res = await query(config.marketplaceContract, { config: {} });
      setResult({ success: true, message: `Config: ${JSON.stringify(res, null, 2)}` });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to query config' });
    } finally {
      setLoading(null);
    }
  };

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage contracts and settings</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">Connect your wallet to access admin functions</div>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage contracts and settings</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🚫</div>
          <div className="empty-state-title">Admin Access Required</div>
          <div className="empty-state-text">Switch to Admin role to access this page</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage contracts and settings</p>
      </div>

      {result && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${result.success ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          }}
        >
          <div className="card-body">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: result.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {result.message}
            </pre>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Minter Ownership */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Minter Ownership</h3>

            {/* Query Minter Sub-section */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Query Minter</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Check who currently owns minting rights
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleQueryMinter}
                disabled={loading === 'query-minter'}
              >
                {loading === 'query-minter' ? 'Querying...' : 'Query Current Minter'}
              </button>
            </div>

            {/* Accept Ownership Sub-section */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Accept Ownership</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Accept a pending minter ownership transfer
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '12px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <input
                  type="checkbox"
                  checked={useCustomAcceptContract}
                  onChange={(e) => setUseCustomAcceptContract(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--accent-green)',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Use custom contract address
                </span>
              </label>

              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={useCustomAcceptContract ? customAcceptContract : config.assetContract}
                  onChange={(e) => setCustomAcceptContract(e.target.value)}
                  disabled={!useCustomAcceptContract}
                  placeholder="xion1..."
                  style={{
                    opacity: useCustomAcceptContract ? 1 : 0.6,
                    fontSize: '12px'
                  }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleAcceptMinterOwnership}
                disabled={loading === 'accept-minter'}
              >
                {loading === 'accept-minter' ? 'Accepting...' : 'Accept Minter Ownership'}
              </button>
            </div>

            {/* Transfer Ownership Sub-section */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Transfer Ownership</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Transfer minting rights to another address
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newMinter}
                  onChange={(e) => setNewMinter(e.target.value)}
                  placeholder="xion1..."
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleTransferMinter}
                  disabled={loading === 'transfer-minter' || !newMinter}
                >
                  {loading === 'transfer-minter' ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Config */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Marketplace Config</h3>

            <button
              className="btn btn-secondary"
              onClick={handleQueryConfig}
              disabled={loading === 'query-config'}
              style={{ marginBottom: '20px' }}
            >
              {loading === 'query-config' ? 'Querying...' : 'Query Current Config'}
            </button>

            <div className="form-group">
              <label className="form-label">Fee Percentage (%)</label>
              <input
                type="number"
                className="form-input"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                placeholder="e.g., 2.5"
                step="0.1"
                min="0"
                max="100"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fee Recipient (optional)</label>
              <input
                type="text"
                className="form-input"
                value={feeRecipient}
                onChange={(e) => setFeeRecipient(e.target.value)}
                placeholder="xion1..."
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleUpdateFees}
              disabled={loading === 'update-fees' || !feePercent}
            >
              {loading === 'update-fees' ? 'Updating...' : 'Update Config'}
            </button>
          </div>
        </div>

        {/* Contract Info */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Contract Info</h3>

            <div className="form-group">
              <label className="form-label">Asset Contract</label>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {config.assetContract || 'Not configured'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Marketplace Contract</label>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {config.marketplaceContract || 'Not configured'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Connected Wallet</label>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {address}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

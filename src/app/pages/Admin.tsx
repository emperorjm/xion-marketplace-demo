import { useState } from 'react';
import { useCosmos } from '../../hooks/useCosmos';
import { useRole } from '../hooks/useLocalStore';
import { addActivity, setFeesConfigured } from '../store/localStore';

export function Admin() {
  const { config, updateConfig, execute, query, instantiate, address, isConnected } = useCosmos();
  const { role } = useRole();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for existing features
  const [newMinter, setNewMinter] = useState('');
  const [feePercent, setFeePercent] = useState('');
  const [feeRecipient, setFeeRecipient] = useState('');
  const [useCustomAcceptContract, setUseCustomAcceptContract] = useState(false);
  const [customAcceptContract, setCustomAcceptContract] = useState('');

  // Form states for Asset Contract instantiation
  const [assetCodeId, setAssetCodeId] = useState(import.meta.env.VITE_ASSET_CODE_ID || '');
  const [assetLabel, setAssetLabel] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetAdmin, setAssetAdmin] = useState('');
  const [assetMinter, setAssetMinter] = useState('');

  // Form states for Marketplace Contract instantiation
  const [marketplaceCodeId, setMarketplaceCodeId] = useState(import.meta.env.VITE_MARKETPLACE_CODE_ID || '');
  const [marketplaceLabel, setMarketplaceLabel] = useState('');
  const [marketplaceAdmin, setMarketplaceAdmin] = useState('');
  const [marketplaceFeeRecipient, setMarketplaceFeeRecipient] = useState('');
  const [marketplaceFeeBps, setMarketplaceFeeBps] = useState('200');
  const [marketplaceListingDenom, setMarketplaceListingDenom] = useState('uxion');

  const handleInstantiateAsset = async () => {
    if (!assetCodeId || !assetLabel || !assetName || !assetSymbol) {
      setResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    setLoading('instantiate-asset');
    setResult(null);
    try {
      const msg = {
        name: assetName,
        symbol: assetSymbol,
        collection_info_extension: {},
        minter: assetMinter || address || undefined,
        creator: address || undefined,
        withdraw_address: undefined,
      };

      const res = await instantiate(
        parseInt(assetCodeId),
        msg,
        assetLabel,
        { admin: assetAdmin || undefined }
      );

      // Update config with new contract address
      updateConfig({ assetContract: res.contractAddress });

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        txHash: res.transactionHash,
        description: 'Instantiated Asset Contract',
      });

      setResult({
        success: true,
        message: `Asset contract deployed!\n\nAddress: ${res.contractAddress}\nTx: ${res.transactionHash}`,
      });

      // Clear form
      setAssetCodeId('');
      setAssetLabel('');
      setAssetName('');
      setAssetSymbol('');
      setAssetAdmin('');
      setAssetMinter('');
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to instantiate asset contract' });
    } finally {
      setLoading(null);
    }
  };

  const handleInstantiateMarketplace = async () => {
    if (!marketplaceCodeId || !marketplaceLabel || !marketplaceFeeRecipient) {
      setResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    setLoading('instantiate-marketplace');
    setResult(null);
    try {
      const msg = {
        config: {
          manager: address,
          fee_recipient: marketplaceFeeRecipient,
          fee_bps: parseInt(marketplaceFeeBps) || 200,
          sale_approvals: false,
          listing_denom: marketplaceListingDenom || 'uxion',
        },
      };

      const res = await instantiate(
        parseInt(marketplaceCodeId),
        msg,
        marketplaceLabel,
        { admin: marketplaceAdmin || undefined }
      );

      // Update config with new contract address
      updateConfig({ marketplaceContract: res.contractAddress });

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        txHash: res.transactionHash,
        description: 'Instantiated Marketplace Contract',
      });

      setResult({
        success: true,
        message: `Marketplace contract deployed!\n\nAddress: ${res.contractAddress}\nTx: ${res.transactionHash}`,
      });

      // Clear form
      setMarketplaceCodeId('');
      setMarketplaceLabel('');
      setMarketplaceAdmin('');
      setMarketplaceFeeRecipient('');
      setMarketplaceFeeBps('200');
      setMarketplaceListingDenom('uxion');
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to instantiate marketplace contract' });
    } finally {
      setLoading(null);
    }
  };

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
      const currentConfig = await query(config.marketplaceContract, { config: {} }) as {
        manager?: string;
        fee_recipient?: string;
        sale_approvals?: boolean;
        listing_denom?: string;
      };

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
        {/* Deploy Contracts */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Deploy Contracts</h3>

            {/* Instantiate Asset Contract */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Instantiate Asset Contract</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Deploy a new NFT collection contract
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Code ID *</label>
                <input
                  type="number"
                  className="form-input"
                  value={assetCodeId}
                  onChange={(e) => setAssetCodeId(e.target.value)}
                  placeholder="e.g., 1813"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Label *</label>
                <input
                  type="text"
                  className="form-input"
                  value={assetLabel}
                  onChange={(e) => setAssetLabel(e.target.value)}
                  placeholder="My NFT Collection"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Collection Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="XION Demo NFTs"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Symbol *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={assetSymbol}
                    onChange={(e) => setAssetSymbol(e.target.value)}
                    placeholder="XDEMO"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Admin Address (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={assetAdmin}
                  onChange={(e) => setAssetAdmin(e.target.value)}
                  placeholder="xion1..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Minter Address (optional, defaults to you)</label>
                <input
                  type="text"
                  className="form-input"
                  value={assetMinter}
                  onChange={(e) => setAssetMinter(e.target.value)}
                  placeholder={address}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleInstantiateAsset}
                disabled={loading === 'instantiate-asset' || !assetCodeId || !assetLabel || !assetName || !assetSymbol}
                style={{ width: '100%' }}
              >
                {loading === 'instantiate-asset' ? 'Deploying...' : 'Deploy Asset Contract'}
              </button>
            </div>

            {/* Instantiate Marketplace Contract */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Instantiate Marketplace Contract</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Deploy a new marketplace contract
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Code ID *</label>
                <input
                  type="number"
                  className="form-input"
                  value={marketplaceCodeId}
                  onChange={(e) => setMarketplaceCodeId(e.target.value)}
                  placeholder="e.g., 1814"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Label *</label>
                <input
                  type="text"
                  className="form-input"
                  value={marketplaceLabel}
                  onChange={(e) => setMarketplaceLabel(e.target.value)}
                  placeholder="My Marketplace"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Admin Address (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={marketplaceAdmin}
                  onChange={(e) => setMarketplaceAdmin(e.target.value)}
                  placeholder="xion1..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Fee Recipient *</label>
                <input
                  type="text"
                  className="form-input"
                  value={marketplaceFeeRecipient}
                  onChange={(e) => setMarketplaceFeeRecipient(e.target.value)}
                  placeholder="xion1..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Fee BPS (100 = 1%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={marketplaceFeeBps}
                    onChange={(e) => setMarketplaceFeeBps(e.target.value)}
                    placeholder="200"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Listing Denom</label>
                  <input
                    type="text"
                    className="form-input"
                    value={marketplaceListingDenom}
                    onChange={(e) => setMarketplaceListingDenom(e.target.value)}
                    placeholder="uxion"
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleInstantiateMarketplace}
                disabled={loading === 'instantiate-marketplace' || !marketplaceCodeId || !marketplaceLabel || !marketplaceFeeRecipient}
                style={{ width: '100%' }}
              >
                {loading === 'instantiate-marketplace' ? 'Deploying...' : 'Deploy Marketplace Contract'}
              </button>
            </div>
          </div>
        </div>

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

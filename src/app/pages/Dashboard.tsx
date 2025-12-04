import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../hooks/useLocalStore';
import { useCosmos } from '../../hooks/useCosmos';
import { getFeesConfigured, getRecentActivity, addActivity } from '../store/localStore';

export function Dashboard() {
  const { role } = useRole();
  const { isConnected, address, config, updateConfig, instantiate } = useCosmos();

  // Deploy contracts form state
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // Asset contract form
  const [assetCodeId, setAssetCodeId] = useState(import.meta.env.VITE_ASSET_CODE_ID || '');
  const [assetLabel, setAssetLabel] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');

  // Marketplace contract form
  const [marketplaceCodeId, setMarketplaceCodeId] = useState(import.meta.env.VITE_MARKETPLACE_CODE_ID || '');
  const [marketplaceLabel, setMarketplaceLabel] = useState('');
  const [marketplaceFeeRecipient, setMarketplaceFeeRecipient] = useState('');
  const [marketplaceFeeBps, setMarketplaceFeeBps] = useState('200');

  const handleDeployAsset = async () => {
    if (!assetCodeId || !assetLabel || !assetName || !assetSymbol) {
      setDeployResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    setLoading('asset');
    setDeployResult(null);
    try {
      const msg = {
        name: assetName,
        symbol: assetSymbol,
        collection_info_extension: {},
        minter: address || undefined,
        creator: address || undefined,
        withdraw_address: undefined,
      };

      const res = await instantiate(parseInt(assetCodeId), msg, assetLabel, {});

      updateConfig({ assetContract: res.contractAddress });

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        txHash: res.transactionHash,
        description: 'Deployed Asset Contract',
      });

      setDeployResult({
        success: true,
        message: `Asset contract deployed: ${res.contractAddress.slice(0, 20)}...`,
      });

      // Clear form
      setAssetCodeId('');
      setAssetLabel('');
      setAssetName('');
      setAssetSymbol('');
    } catch (err) {
      setDeployResult({ success: false, message: err instanceof Error ? err.message : 'Failed to deploy' });
    } finally {
      setLoading(null);
    }
  };

  const handleDeployMarketplace = async () => {
    if (!marketplaceCodeId || !marketplaceLabel || !marketplaceFeeRecipient) {
      setDeployResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    setLoading('marketplace');
    setDeployResult(null);
    try {
      const msg = {
        config: {
          manager: address,
          fee_recipient: marketplaceFeeRecipient,
          fee_bps: parseInt(marketplaceFeeBps) || 200,
          sale_approvals: false,
          listing_denom: 'uxion',
        },
      };

      const res = await instantiate(parseInt(marketplaceCodeId), msg, marketplaceLabel, {});

      updateConfig({ marketplaceContract: res.contractAddress });

      addActivity({
        type: 'admin',
        tokenId: 'system',
        from: address,
        txHash: res.transactionHash,
        description: 'Deployed Marketplace Contract',
      });

      setDeployResult({
        success: true,
        message: `Marketplace contract deployed: ${res.contractAddress.slice(0, 20)}...`,
      });

      // Clear form
      setMarketplaceCodeId('');
      setMarketplaceLabel('');
      setMarketplaceFeeRecipient('');
      setMarketplaceFeeBps('200');
    } catch (err) {
      setDeployResult({ success: false, message: err instanceof Error ? err.message : 'Failed to deploy' });
    } finally {
      setLoading(null);
    }
  };

  const getWelcomeMessage = () => {
    switch (role) {
      case 'admin':
        return 'Manage your marketplace settings and monitor activity';
      case 'seller':
        return 'Create, list, and sell your NFTs';
      case 'buyer':
      default:
        return 'Discover and collect unique NFTs';
    }
  };

  const getQuickActions = () => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Configure Marketplace', to: '/admin', icon: '⚙️' },
          { label: 'View All Activity', to: '/activity', icon: '📊' },
          { label: 'Manage Listings', to: '/listings', icon: '📋' },
        ];
      case 'seller':
        return [
          { label: 'Create NFT', to: '/create', icon: '✨' },
          { label: 'My Listings', to: '/listings', icon: '📋' },
          { label: 'View Offers', to: '/offers', icon: '💰' },
        ];
      case 'buyer':
      default:
        return [
          { label: 'Explore NFTs', to: '/explore', icon: '🔍' },
          { label: 'My Collection', to: '/my-items', icon: '🖼️' },
          { label: 'Activity', to: '/activity', icon: '📜' },
        ];
    }
  };

  const getFlowSteps = () => {
    switch (role) {
      case 'admin':
        return [
          { step: 1, title: 'Connect Wallet', description: 'Connect your admin wallet to manage the marketplace', done: isConnected, expandable: false },
          { step: 2, title: 'Deploy Contracts', description: 'Instantiate asset and marketplace contracts', done: !!config.assetContract && !!config.marketplaceContract, expandable: true },
          { step: 3, title: 'Set Fees', description: 'Configure marketplace fees and listing denom', done: getFeesConfigured(), expandable: false, link: '/admin' },
          { step: 4, title: 'Monitor Activity', description: 'Track sales, listings, and offers', done: getRecentActivity().length > 0, expandable: false, link: '/activity' },
        ];
      case 'seller': {
        const activities = getRecentActivity();
        const hasMinted = activities.some(a => a.type === 'mint');
        const hasListed = activities.some(a => a.type === 'list');
        const hasSold = activities.some(a => a.type === 'buy' || a.type === 'accept_offer');
        return [
          { step: 1, title: 'Connect Wallet', description: 'Connect your wallet to start selling', done: isConnected, expandable: false },
          { step: 2, title: 'Create NFT', description: 'Mint a new NFT in your collection', done: hasMinted, expandable: false, link: '/create' },
          { step: 3, title: 'List for Sale', description: 'Set a price and list your NFT', done: hasListed, expandable: false, link: '/my-items' },
          { step: 4, title: 'Complete Sale', description: 'Accept offers or wait for buyers', done: hasSold, expandable: false, link: '/offers' },
        ];
      }
      case 'buyer':
      default:
        return [
          { step: 1, title: 'Connect Wallet', description: 'Connect your wallet to start buying', done: isConnected, expandable: false },
          { step: 2, title: 'Browse NFTs', description: 'Explore available NFTs in the marketplace', done: false, expandable: false, link: '/explore' },
          { step: 3, title: 'Buy or Make Offer', description: 'Purchase instantly or make an offer', done: false, expandable: false, link: '/explore' },
          { step: 4, title: 'View Collection', description: 'See your owned NFTs', done: false, expandable: false, link: '/my-items' },
        ];
    }
  };

  const handleStepClick = (step: number, expandable: boolean, link?: string) => {
    if (expandable) {
      setExpandedStep(expandedStep === step ? null : step);
      setDeployResult(null);
    } else if (link) {
      // Navigation handled by Link component
    }
  };

  const renderDeployContractsForm = () => (
    <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
      {deployResult && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          borderRadius: '8px',
          background: deployResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${deployResult.success ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          color: deployResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
          fontSize: '14px',
        }}>
          {deployResult.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Asset Contract */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontWeight: '500', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Asset Contract
            {config.assetContract && <span style={{ color: 'var(--accent-green)', fontSize: '14px' }}>✓</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {config.assetContract ? `Deployed: ${config.assetContract.slice(0, 16)}...` : 'Deploy your NFT collection contract'}
          </div>

          {!config.assetContract && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number"
                  className="form-input"
                  value={assetCodeId}
                  onChange={(e) => setAssetCodeId(e.target.value)}
                  placeholder="Code ID"
                  style={{ fontSize: '13px' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={assetLabel}
                  onChange={(e) => setAssetLabel(e.target.value)}
                  placeholder="Label"
                  style={{ fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Collection Name"
                  style={{ fontSize: '13px' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={assetSymbol}
                  onChange={(e) => setAssetSymbol(e.target.value)}
                  placeholder="Symbol"
                  style={{ fontSize: '13px' }}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleDeployAsset}
                disabled={loading === 'asset' || !assetCodeId || !assetLabel || !assetName || !assetSymbol}
                style={{ width: '100%', fontSize: '13px' }}
              >
                {loading === 'asset' ? 'Deploying...' : 'Deploy Asset Contract'}
              </button>
            </>
          )}
        </div>

        {/* Marketplace Contract */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontWeight: '500', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Marketplace Contract
            {config.marketplaceContract && <span style={{ color: 'var(--accent-green)', fontSize: '14px' }}>✓</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {config.marketplaceContract ? `Deployed: ${config.marketplaceContract.slice(0, 16)}...` : 'Deploy your marketplace contract'}
          </div>

          {!config.marketplaceContract && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number"
                  className="form-input"
                  value={marketplaceCodeId}
                  onChange={(e) => setMarketplaceCodeId(e.target.value)}
                  placeholder="Code ID"
                  style={{ fontSize: '13px' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={marketplaceLabel}
                  onChange={(e) => setMarketplaceLabel(e.target.value)}
                  placeholder="Label"
                  style={{ fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={marketplaceFeeRecipient}
                  onChange={(e) => setMarketplaceFeeRecipient(e.target.value)}
                  placeholder="Fee Recipient"
                  style={{ fontSize: '13px' }}
                />
                <input
                  type="number"
                  className="form-input"
                  value={marketplaceFeeBps}
                  onChange={(e) => setMarketplaceFeeBps(e.target.value)}
                  placeholder="Fee BPS (200 = 2%)"
                  style={{ fontSize: '13px' }}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleDeployMarketplace}
                disabled={loading === 'marketplace' || !marketplaceCodeId || !marketplaceLabel || !marketplaceFeeRecipient}
                style={{ width: '100%', fontSize: '13px' }}
              >
                {loading === 'marketplace' ? 'Deploying...' : 'Deploy Marketplace Contract'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome to XION Marketplace</h1>
        <p className="page-subtitle">{getWelcomeMessage()}</p>
      </div>

      {/* Connection Status */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Connection Status</div>
          <div className="stat-value" style={{ color: isConnected ? '#22c55e' : '#ef4444' }}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
          {isConnected && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'monospace' }}>
              {address?.slice(0, 16)}...
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Role</div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>{role}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Asset Contract</div>
          <div className="stat-value" style={{ fontSize: '14px', wordBreak: 'break-all' }}>
            {config.assetContract || 'Not Set'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marketplace Contract</div>
          <div className="stat-value" style={{ fontSize: '14px', wordBreak: 'break-all' }}>
            {config.marketplaceContract || 'Not Set'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {getQuickActions().map((action) => (
            <Link key={action.to} to={action.to} className="btn btn-secondary btn-lg">
              <span style={{ fontSize: '20px' }}>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Flow Steps */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          {role === 'admin' ? 'Admin Setup' : role === 'seller' ? 'Selling Flow' : 'Buying Flow'}
        </h2>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {getFlowSteps().map((item, index) => {
              const isExpanded = expandedStep === item.step && item.expandable;
              const StepWrapper = item.link && !item.expandable ? Link : 'div';
              const wrapperProps = item.link && !item.expandable ? { to: item.link } : {};

              return (
                <div key={item.step}>
                  <StepWrapper
                    {...wrapperProps}
                    onClick={() => handleStepClick(item.step, item.expandable || false, item.link)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '20px',
                      borderBottom: (index < getFlowSteps().length - 1 && !isExpanded) ? '1px solid var(--border-color)' : 'none',
                      cursor: item.expandable || item.link ? 'pointer' : 'default',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: item.done ? 'var(--accent-green)' : 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: item.done ? '#000' : 'var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {item.done ? '✓' : item.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.title}
                        {item.expandable && !item.done && (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.description}</div>
                    </div>
                  </StepWrapper>
                  {isExpanded && item.step === 2 && role === 'admin' && renderDeployContractsForm()}
                  {isExpanded && index < getFlowSteps().length - 1 && (
                    <div style={{ borderBottom: '1px solid var(--border-color)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dev Console Link */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>
          Need low-level contract access?
        </p>
        <Link to="/console" className="btn btn-ghost">
          Open Developer Console →
        </Link>
      </div>
    </div>
  );
}

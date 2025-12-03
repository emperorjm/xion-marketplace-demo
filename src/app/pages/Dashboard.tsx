import { Link } from 'react-router-dom';
import { useRole } from '../hooks/useLocalStore';
import { useCosmos } from '../../hooks/useCosmos';
import { getFeesConfigured, getRecentActivity } from '../store/localStore';

export function Dashboard() {
  const { role } = useRole();
  const { isConnected, address, config } = useCosmos();

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
          { step: 1, title: 'Connect Wallet', description: 'Connect your admin wallet to manage the marketplace', done: isConnected },
          { step: 2, title: 'Configure Contracts', description: 'Set asset and marketplace contract addresses', done: !!config.assetContract && !!config.marketplaceContract },
          { step: 3, title: 'Set Fees', description: 'Configure marketplace fees and listing denom', done: getFeesConfigured() },
          { step: 4, title: 'Monitor Activity', description: 'Track sales, listings, and offers', done: getRecentActivity().length > 0 },
        ];
      case 'seller': {
        const activities = getRecentActivity();
        const hasMinted = activities.some(a => a.type === 'mint');
        const hasListed = activities.some(a => a.type === 'list');
        const hasSold = activities.some(a => a.type === 'buy' || a.type === 'accept_offer');
        return [
          { step: 1, title: 'Connect Wallet', description: 'Connect your wallet to start selling', done: isConnected },
          { step: 2, title: 'Create NFT', description: 'Mint a new NFT in your collection', done: hasMinted },
          { step: 3, title: 'List for Sale', description: 'Set a price and list your NFT', done: hasListed },
          { step: 4, title: 'Complete Sale', description: 'Accept offers or wait for buyers', done: hasSold },
        ];
      }
      case 'buyer':
      default:
        return [
          { step: 1, title: 'Connect Wallet', description: 'Connect your wallet to start buying', done: isConnected },
          { step: 2, title: 'Browse NFTs', description: 'Explore available NFTs in the marketplace', done: false },
          { step: 3, title: 'Buy or Make Offer', description: 'Purchase instantly or make an offer', done: false },
          { step: 4, title: 'View Collection', description: 'See your owned NFTs', done: false },
        ];
    }
  };

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
            {getFlowSteps().map((item, index) => (
              <div
                key={item.step}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '20px',
                  borderBottom: index < getFlowSteps().length - 1 ? '1px solid var(--border-color)' : 'none',
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
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.description}</div>
                </div>
              </div>
            ))}
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

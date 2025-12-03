import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivity } from '../hooks/useLocalStore';

export function Activity() {
  const { activities, clearActivities } = useActivity();
  const [filter, setFilter] = useState<string>('all');

  const activityTypes = ['all', 'mint', 'list', 'delist', 'buy', 'offer', 'accept_offer', 'admin'];

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.type === filter);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'mint': return '🎨';
      case 'list': return '📋';
      case 'delist': return '❌';
      case 'buy': return '💰';
      case 'offer': return '📨';
      case 'accept_offer': return '✅';
      case 'reject_offer': return '🚫';
      case 'cancel_offer': return '↩️';
      case 'admin': return '⚙️';
      default: return '📝';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'mint': return 'Minted';
      case 'list': return 'Listed';
      case 'delist': return 'Delisted';
      case 'buy': return 'Purchased';
      case 'offer': return 'Offer Made';
      case 'accept_offer': return 'Offer Accepted';
      case 'reject_offer': return 'Offer Rejected';
      case 'cancel_offer': return 'Offer Cancelled';
      case 'price_update': return 'Price Updated';
      case 'admin': return 'Admin Action';
      default: return type;
    }
  };

  const formatPrice = (amount?: string) => {
    if (!amount) return '';
    const num = parseFloat(amount) / 1_000_000;
    return `${num.toLocaleString()} XION`;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">Your transaction history (stored locally)</p>
        </div>
        {activities.length > 0 && (
          <button className="btn btn-secondary" onClick={clearActivities}>
            Clear History
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {activityTypes.map((type) => (
          <button
            key={type}
            className={`tab ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? 'All' : getActivityLabel(type)}
            ({type === 'all' ? activities.length : activities.filter((a) => a.type === type).length})
          </button>
        ))}
      </div>

      {filteredActivities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <div className="empty-state-title">No Activity</div>
          <div className="empty-state-text">
            {filter === 'all'
              ? 'Your transaction history will appear here.'
              : `No ${getActivityLabel(filter).toLowerCase()} activities found.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}
                >
                  {getActivityIcon(activity.type)}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600' }}>{activity.description || getActivityLabel(activity.type)}</span>
                    {activity.tokenId !== 'system' && (
                      <Link
                        to={`/app/item/${activity.tokenId}`}
                        style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '14px' }}
                      >
                        Token #{activity.tokenId}
                      </Link>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {activity.from && (
                      <span>
                        From: {activity.from.slice(0, 12)}...
                        {activity.to && ` → To: ${activity.to.slice(0, 12)}...`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Time */}
                <div style={{ textAlign: 'right' }}>
                  {activity.price && (
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>{formatPrice(activity.price)}</p>
                  )}
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(activity.timestamp)}</p>
                </div>

                {/* Tx Link */}
                {activity.txHash && (
                  <a
                    href={`https://explorer.burnt.com/xion-testnet-1/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ flexShrink: 0 }}
                  >
                    View Tx
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

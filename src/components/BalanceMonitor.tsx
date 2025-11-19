import React, { useState } from 'react';
import { useCosmos } from '../hooks/useCosmos';
import { parseList, randomId } from '../lib/helpers';

interface BalanceEntry {
  id: string;
  label: string;
  address: string;
  amount: string;
  denom: string;
}

export const BalanceMonitor: React.FC = () => {
  const { config, getBalance } = useCosmos();
  const [royaltyAddress, setRoyaltyAddress] = useState('');
  const [marketplaceAddresses, setMarketplaceAddresses] = useState('');
  const [denom, setDenom] = useState(config.defaultDenom);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!denom.trim()) {
      setError('Denom is required');
      return;
    }
    const addresses = new Set<string>();
    if (royaltyAddress.trim()) {
      addresses.add(royaltyAddress.trim());
    }
    parseList(marketplaceAddresses).forEach((addr) => addresses.add(addr));
    if (!addresses.size) {
      setError('Provide at least one address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const entries: BalanceEntry[] = [];
      for (const addr of addresses) {
        try {
          const coin = await getBalance(addr, denom.trim());
          entries.push({
            id: randomId(),
            label:
              addr === royaltyAddress.trim()
                ? 'Royalty'
                : `Marketplace ${entries.filter((entry) => entry.label.startsWith('Marketplace')).length + 1}`,
            address: addr,
            amount: coin.amount.toString(),
            denom: coin.denom,
          });
        } catch (balanceErr) {
          console.error('Failed to fetch balance for', addr, balanceErr);
          entries.push({
            id: randomId(),
            label: 'Error',
            address: addr,
            amount: 'N/A',
            denom,
          });
        }
      }
      setBalances(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Royalty & Fee Balances</h2>
        <span className="helper-text">Inspect payout wallets without polling</span>
      </div>
      <div className="action-card">
        <div className="flex-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="royalty-address">Royalty Address</label>
            <input
              id="royalty-address"
              value={royaltyAddress}
              placeholder="xion1..."
              onChange={(event) => setRoyaltyAddress(event.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="marketplace-addresses">Marketplace Addresses</label>
            <textarea
              id="marketplace-addresses"
              value={marketplaceAddresses}
              placeholder="One per line or comma separated"
              onChange={(event) => setMarketplaceAddresses(event.target.value)}
              style={{ minHeight: '80px' }}
            />
          </div>
          <div style={{ width: '140px' }}>
            <label htmlFor="balance-denom">Denom</label>
            <input
              id="balance-denom"
              value={denom}
              onChange={(event) => setDenom(event.target.value)}
            />
          </div>
          <div className="wallet-actions" style={{ alignItems: 'flex-end' }}>
            <button className="primary" type="button" onClick={fetchBalances} disabled={loading}>
              {loading ? 'Fetching...' : 'Fetch Balances'}
            </button>
          </div>
        </div>
        {error && <p className="helper-text" style={{ color: '#b91c1c' }}>{error}</p>}
        {balances.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="balance-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Address</th>
                  <th>Amount</th>
                  <th>Denom</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.label}</td>
                    <td>{entry.address}</td>
                    <td>{entry.amount}</td>
                    <td>{entry.denom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

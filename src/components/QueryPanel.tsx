import React, { useState } from 'react';
import { useCosmos } from '../hooks/useCosmos';
import { LogEntry } from '../lib/types';
import { safeJsonParse, formatJson, randomId } from '../lib/helpers';

interface Props {
  addLog: (entry: LogEntry) => void;
}

export const QueryPanel: React.FC<Props> = ({ addLog }) => {
  const { config, query } = useCosmos();
  const [target, setTarget] = useState<'asset' | 'marketplace' | 'custom'>('asset');
  const [customAddress, setCustomAddress] = useState('');
  const [queryBody, setQueryBody] = useState('{\n  "config": {}\n}');
  const [result, setResult] = useState('');

  const resolveAddress = () => {
    if (target === 'asset') {
      return config.assetContract;
    }
    if (target === 'marketplace') {
      return config.marketplaceContract;
    }
    return customAddress;
  };

  const handleQuery = async () => {
    const address = resolveAddress();
    if (!address) {
      throw new Error('Provide a contract address');
    }
    const payload = safeJsonParse<Record<string, unknown>>(queryBody);
    const res = await query(address, payload);
    const formatted = formatJson(res);
    setResult(formatted);
    addLog({
      id: randomId(),
      title: 'Query',
      status: 'success',
      detail: `Queried ${address}`,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="query-panel">
      <h3>Ad-hoc Query</h3>
      <div className="flex-row">
        <div style={{ minWidth: '200px' }}>
          <label htmlFor="query-target">Contract</label>
          <select id="query-target" value={target} onChange={(event) => setTarget(event.target.value as typeof target)}>
            <option value="asset">Asset (config)</option>
            <option value="marketplace">Marketplace</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {target === 'custom' && (
          <div style={{ flex: 1 }}>
            <label htmlFor="custom-address">Contract Address</label>
            <input
              id="custom-address"
              value={customAddress}
              placeholder="xion1..."
              onChange={(event) => setCustomAddress(event.target.value)}
            />
          </div>
        )}
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <label htmlFor="query-body">Query JSON</label>
        <textarea
          id="query-body"
          value={queryBody}
          onChange={(event) => setQueryBody(event.target.value)}
        />
      </div>
      <button
        className="primary"
        type="button"
        style={{ marginTop: '0.75rem' }}
        onClick={async () => {
          try {
            await handleQuery();
          } catch (err) {
            addLog({
              id: randomId(),
              title: 'Query',
              status: 'error',
              detail: err instanceof Error ? err.message : 'Query failed',
              timestamp: new Date().toISOString(),
            });
          }
        }}
      >
        Run Query
      </button>
      {result && (
        <pre style={{ marginTop: '0.75rem', background: '#0f172a', color: '#e2e8f0', padding: '0.75rem', borderRadius: '8px', overflow: 'auto' }}>
          {result}
        </pre>
      )}
    </div>
  );
};

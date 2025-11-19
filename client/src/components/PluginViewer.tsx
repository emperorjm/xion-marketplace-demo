import React, { useState } from 'react';
import { useCosmos } from '../hooks/useCosmos';
import { randomId, toPluginName } from '../lib/helpers';

interface PluginEntry {
  id: string;
  name: string;
  raw: Record<string, unknown>;
}

export const PluginViewer: React.FC = () => {
  const { config, query } = useCosmos();
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = async () => {
    if (!config.assetContract) {
      setError('Configure the asset contract address first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = (await query(config.assetContract, {
        extension: {
          msg: {
            get_collection_plugins: {},
          },
        },
      })) as Array<Record<string, unknown>>;
      const entries = (response || []).map((plugin) => ({
        id: randomId(),
        name: toPluginName(Object.keys(plugin)[0]) || 'Unknown',
        raw: plugin,
      }));
      setPlugins(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Collection Plugins</h2>
        <button className="secondary" type="button" onClick={fetchPlugins} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      {error && <p className="helper-text" style={{ color: '#b91c1c' }}>{error}</p>}
      {plugins.length === 0 && !loading && <p className="helper-text">No plugins found yet.</p>}
      <div className="plugin-viewer">
        {plugins.map((plugin) => (
          <div key={plugin.id} className="plugin-card">
            <strong>{plugin.name}</strong>
            <pre>{JSON.stringify(plugin.raw, null, 2)}</pre>
          </div>
        ))}
      </div>
    </section>
  );
};

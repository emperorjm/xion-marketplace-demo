import React, { useEffect, useMemo, useState } from 'react';
import { useCosmos } from '../hooks/useCosmos';
import { buildCoin, parseExpiration, parseList, randomId, toPluginName } from '../lib/helpers';
import { LogEntry } from '../lib/types';

const pluginOptions = [
  { value: 'ExactPrice', label: 'Exact Price' },
  { value: 'MinimumPrice', label: 'Minimum Price' },
  { value: 'RequiresProof', label: 'Requires Proof' },
  { value: 'NotBefore', label: 'Not Before' },
  { value: 'NotAfter', label: 'Not After' },
  { value: 'TimeLock', label: 'Time Lock' },
  { value: 'Royalty', label: 'Royalty' },
  { value: 'AllowedMarketplaces', label: 'Allowed Marketplaces' },
  { value: 'AllowedCurrencies', label: 'Allowed Currencies' },
] as const;

type PluginType = (typeof pluginOptions)[number]['value'];

type PluginDraft = {
  id: string;
  type: PluginType;
  values: Record<string, string>;
};


const pluginFieldMap: Record<PluginType, { name: string; label: string; placeholder?: string; helper?: string }[]> = {
  ExactPrice: [
    { name: 'amount', label: 'Amount', placeholder: '1000000' },
    { name: 'denom', label: 'Denom', placeholder: 'uxion' },
  ],
  MinimumPrice: [
    { name: 'amount', label: 'Amount', placeholder: '1000000' },
    { name: 'denom', label: 'Denom', placeholder: 'uxion' },
  ],
  RequiresProof: [
    {
      name: 'proof',
      label: 'Proof (base64 or hex)',
      placeholder: 'Zm9vYmFy',
      helper: 'Hex strings are auto-converted to base64',
    },
  ],
  NotBefore: [
    {
      name: 'expiration',
      label: 'Expiration',
      placeholder: 'time:1700000000',
      helper: 'Use never, height:<n>, time:<seconds> or raw seconds',
    },
  ],
  NotAfter: [
    {
      name: 'expiration',
      label: 'Expiration',
      placeholder: 'height:1500000',
      helper: 'Use never, height:<n>, time:<seconds> or raw seconds',
    },
  ],
  TimeLock: [
    { name: 'seconds', label: 'Lock Duration Seconds', placeholder: '3600' },
  ],
  Royalty: [
    { name: 'bps', label: 'Royalty BPS', placeholder: '500' },
    { name: 'recipient', label: 'Recipient Address', placeholder: 'xion1...' },
  ],
  AllowedMarketplaces: [
    {
      name: 'marketplaces',
      label: 'Marketplace Addresses',
      placeholder: 'addr1, addr2',
      helper: 'Comma or newline separated addresses',
    },
  ],
  AllowedCurrencies: [
    {
      name: 'currencies',
      label: 'Currencies',
      placeholder: '1000000 uxion\n500000 uusdc',
      helper: 'One per line formatted as "amount denom"',
    },
  ],
};

interface Props {
  addLog: (entry: LogEntry) => void;
}

const hexToBase64 = (value: string) => {
  const normalized = value.replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = normalized.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
  const binary = bytes.map((byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
};

const normalizeProof = (value: string) => {
  if (/^[0-9a-fA-F]+$/.test(value.replace(/^0x/i, '')) && value.replace(/^0x/i, '').length % 2 === 0) {
    return hexToBase64(value);
  }
  return value;
};

const serializePlugin = (plugin: PluginDraft) => {
  const typeKey = plugin.type
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
  const values = plugin.values;
  switch (plugin.type) {
    case 'ExactPrice':
      return { [typeKey]: { amount: buildCoin(values.amount, values.denom) } };
    case 'MinimumPrice':
      return { [typeKey]: { amount: buildCoin(values.amount, values.denom) } };
    case 'RequiresProof':
      return { [typeKey]: { proof: normalizeProof(values.proof) } };
    case 'NotBefore':
    case 'NotAfter':
      return { [typeKey]: { time: parseExpiration(values.expiration) } };
    case 'TimeLock':
      return { [typeKey]: { time: Number(values.seconds) } };
    case 'Royalty':
      return { [typeKey]: { bps: Number(values.bps), recipient: values.recipient } };
    case 'AllowedMarketplaces':
      return { [typeKey]: { marketplaces: parseList(values.marketplaces) } };
    case 'AllowedCurrencies':
      return {
        [typeKey]: {
          denoms: values.currencies
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [amount, denom] = line.split(/\s+/);
              return buildCoin(amount, denom);
            }),
        },
      };
    default:
      return { [typeKey]: {} };
  }
};

export const PluginManager: React.FC<Props> = ({ addLog }) => {
  const { execute, query, config, isConnected } = useCosmos();
  const [selectedType, setSelectedType] = useState<PluginType>('ExactPrice');
  const [plugins, setPlugins] = useState<PluginDraft[]>([]);
  const [removeTargets, setRemoveTargets] = useState<string[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({ amount: '', denom: '' });
  const [availablePlugins, setAvailablePlugins] = useState<string[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(false);

  const fields = useMemo(() => pluginFieldMap[selectedType], [selectedType]);

  const refreshAvailablePlugins = async () => {
    if (!config.assetContract) {
      setAvailablePlugins([]);
      return;
    }
    setLoadingPlugins(true);
    try {
      const response = (await query(config.assetContract, {
        extension: {
          msg: {
            get_collection_plugins: {},
          },
        },
      })) as Array<Record<string, unknown>>;
      const names =
        response
          ?.map((plugin) => toPluginName(Object.keys(plugin)[0]))
          .filter((name): name is string => Boolean(name)) ?? [];
      setAvailablePlugins(names);
    } catch (err) {
      console.warn('Failed to fetch existing plugins', err);
    } finally {
      setLoadingPlugins(false);
    }
  };

  useEffect(() => {
    refreshAvailablePlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.assetContract]);

  const resetForm = () => {
    const defaults: Record<string, string> = {};
    pluginFieldMap[selectedType].forEach((field) => {
      defaults[field.name] = '';
    });
    setFormValues(defaults);
  };

  const handleAddPlugin = () => {
    pluginFieldMap[selectedType].forEach((field) => {
      if (!formValues[field.name]) {
        throw new Error(`Missing field ${field.label}`);
      }
    });
    const newPlugin: PluginDraft = {
      id: `${selectedType}-${randomId()}`,
      type: selectedType,
      values: formValues,
    };
    setPlugins((prev) => [...prev, newPlugin]);
    resetForm();
  };

  const executeSet = async () => {
    if (!config.assetContract) {
      throw new Error('Set the asset contract address first');
    }
    if (!plugins.length) {
      throw new Error('Add at least one plugin');
    }
    const payload = {
      update_extension: {
        msg: {
          set_collection_plugin: {
            plugins: plugins.map(serializePlugin),
          },
        },
      },
    };
    const result = await execute(config.assetContract, payload);
    addLog({
      id: randomId(),
      title: 'Set Plugins',
      status: 'success',
      detail: `Set ${plugins.length} plugins`,
      txHash: result.transactionHash,
      timestamp: new Date().toISOString(),
    });
    setPlugins([]);
  };

  const executeRemove = async () => {
    if (!config.assetContract) {
      throw new Error('Set the asset contract address first');
    }
    if (!removeTargets.length) {
      throw new Error('Provide plugin names to remove');
    }
    const payload = {
      update_extension: {
        msg: {
          remove_collection_plugin: {
            plugins: removeTargets,
          },
        },
      },
    };
    const result = await execute(config.assetContract, payload);
    addLog({
      id: randomId(),
      title: 'Remove Plugins',
      status: 'success',
      detail: `Removed ${removeTargets.join(', ')}`,
      txHash: result.transactionHash,
      timestamp: new Date().toISOString(),
    });
    setRemoveTargets([]);
    refreshAvailablePlugins();
  };

  return (
    <section>
      <div className="section-header">
        <h2>Collection Plugins</h2>
        <span className="helper-text">Configure marketplace-specific gating rules</span>
      </div>
      <div className="action-card">
        <div className="flex-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="plugin-type">Plugin Type</label>
            <select
              id="plugin-type"
              value={selectedType}
              onChange={(event) => {
                setSelectedType(event.target.value as PluginType);
                setFormValues({});
              }}
            >
              {pluginOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={`plugin-${field.name}`}>{field.label}</label>
            <input
              id={`plugin-${field.name}`}
              value={formValues[field.name] ?? ''}
              placeholder={field.placeholder}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))
              }
            />
            {field.helper && <p className="helper-text">{field.helper}</p>}
          </div>
        ))}
        <button
          className="secondary"
          type="button"
          onClick={() => {
            try {
              handleAddPlugin();
            } catch (err) {
              addLog({
                id: randomId(),
                title: 'Plugin Draft Error',
                status: 'error',
                detail: err instanceof Error ? err.message : 'Failed to add plugin',
                timestamp: new Date().toISOString(),
              });
            }
          }}
          disabled={!isConnected}
        >
          Add Plugin to Batch
        </button>
        <ul className="plugin-list">
          {plugins.map((plugin) => (
            <li key={plugin.id}>
              <strong>{plugin.type}</strong> — {JSON.stringify(plugin.values)}
            </li>
          ))}
          {!plugins.length && <li>No draft plugins queued.</li>}
        </ul>
        <div className="wallet-actions">
          <button
            className="primary"
            type="button"
            onClick={async () => {
              try {
                await executeSet();
              } catch (err) {
                addLog({
                  id: randomId(),
                  title: 'Set Plugins',
                  status: 'error',
                  detail: err instanceof Error ? err.message : 'Failed to set plugins',
                  timestamp: new Date().toISOString(),
                });
              }
            }}
            disabled={!isConnected || !plugins.length}
          >
            Set Plugins
          </button>
          <button className="secondary" type="button" onClick={() => setPlugins([])}>
            Clear Drafts
          </button>
          <button
            className="secondary"
            type="button"
            onClick={refreshAvailablePlugins}
            disabled={loadingPlugins}
          >
            {loadingPlugins ? 'Refreshing…' : 'Refresh Plugin List'}
          </button>
        </div>
        <div>
          <label htmlFor="remove-plugins">Remove Plugins (select one or more)</label>
          <select
            id="remove-plugins"
            multiple
            value={removeTargets}
            onChange={(event) =>
              setRemoveTargets(Array.from(event.target.selectedOptions).map((option) => option.value))
            }
            style={{ minHeight: '120px' }}
          >
            {availablePlugins.length === 0 && <option disabled>No plugins discovered</option>}
            {availablePlugins.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            className="primary"
            type="button"
            style={{ marginTop: '0.5rem' }}
            onClick={async () => {
              try {
                await executeRemove();
              } catch (err) {
                addLog({
                  id: randomId(),
                  title: 'Remove Plugins',
                  status: 'error',
                  detail: err instanceof Error ? err.message : 'Failed to remove plugins',
                  timestamp: new Date().toISOString(),
                });
              }
            }}
            disabled={!isConnected}
          >
            Remove Plugins
          </button>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { useCosmos } from '../hooks/useCosmos';

export const ConfigPanel: React.FC = () => {
  const { config, updateConfig } = useCosmos();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ [event.target.name]: event.target.value });
  };

  return (
    <div className="config-panel">
      <h3>Chain & Contract Configuration</h3>
      <p className="helper-text">
        Provide the RPC endpoint, chain id, gas price, and deployed contract addresses. Updates
        apply instantly.
      </p>
      <div className="config-grid">
        <div>
          <label htmlFor="rpcEndpoint">RPC Endpoint</label>
          <input
            id="rpcEndpoint"
            name="rpcEndpoint"
            value={config.rpcEndpoint}
            placeholder="https://rpc.xion-testnet..."
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="chainId">Chain ID</label>
          <input
            id="chainId"
            name="chainId"
            value={config.chainId}
            placeholder="xion-testnet-1"
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="gasPrice">Gas Price</label>
          <input
            id="gasPrice"
            name="gasPrice"
            value={config.gasPrice}
            placeholder="0.025uxion"
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="prefix">Bech32 Prefix</label>
          <input id="prefix" name="prefix" value={config.prefix} placeholder="xion" onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="assetContract">Asset Contract Address</label>
          <input
            id="assetContract"
            name="assetContract"
            value={config.assetContract}
            placeholder="xion1..."
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="marketplaceContract">Marketplace Contract Address</label>
          <input
            id="marketplaceContract"
            name="marketplaceContract"
            value={config.marketplaceContract}
            placeholder="xion1..."
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="defaultDenom">Default Denom</label>
          <input
            id="defaultDenom"
            name="defaultDenom"
            value={config.defaultDenom}
            placeholder="uxion"
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
};

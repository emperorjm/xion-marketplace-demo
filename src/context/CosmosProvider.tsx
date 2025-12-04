import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Coin } from '@cosmjs/amino';
import { useAbstraxionAccount, useAbstraxionSigningClient } from '@burnt-labs/abstraxion';
import { ASSET_CONTRACT, MARKETPLACE_CONTRACT } from '../generated-env';

export interface CosmosConfig {
  rpcEndpoint: string;
  chainId: string;
  gasPrice: string;
  prefix: string;
  assetContract: string;
  marketplaceContract: string;
  defaultDenom: string;
}

export interface CosmosContextValue {
  config: CosmosConfig;
  updateConfig: (patch: Partial<CosmosConfig>) => void;
  address: string;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  connectAbstraxion: () => void;
  disconnect: () => void;
  execute: (
    contract: string,
    msg: Record<string, unknown>,
    memo?: string,
    funds?: readonly Coin[],
  ) => Promise<import('@cosmjs/cosmwasm-stargate').ExecuteResult>;
  query: (contract: string, msg: Record<string, unknown>) => Promise<unknown>;
  instantiate: (
    codeId: number,
    msg: Record<string, unknown>,
    label: string,
    options?: {
      admin?: string;
      memo?: string;
      funds?: readonly Coin[];
    },
  ) => Promise<{ contractAddress: string; transactionHash: string }>;
  getBalance: (address: string, denom: string) => Promise<Coin>;
}

const defaultConfig: CosmosConfig = {
  rpcEndpoint: import.meta.env.VITE_RPC_ENDPOINT || '',
  chainId: import.meta.env.VITE_CHAIN_ID || '',
  gasPrice: import.meta.env.VITE_GAS_PRICE || '0.025uxion',
  prefix: import.meta.env.VITE_PREFIX || 'xion',
  // Use values from virtual:env-config to bypass shell env override
  assetContract: ASSET_CONTRACT || '',
  marketplaceContract: MARKETPLACE_CONTRACT || '',
  defaultDenom: import.meta.env.VITE_DEFAULT_DENOM || 'uxion',
};

const CosmosContext = createContext<CosmosContextValue | undefined>(undefined);

export const CosmosProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [config, setConfig] = useState<CosmosConfig>(defaultConfig);
  const [queryClient, setQueryClient] = useState<CosmWasmClient | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Abstraxion hooks
  const { data: abstraxionAccount, isConnected: isAbstraxionConnected } = useAbstraxionAccount();
  const { client: abstraxionClient, logout: abstraxionLogout } = useAbstraxionSigningClient();

  // Determine active address and client from Abstraxion
  const address = abstraxionAccount?.bech32Address || '';
  const signingClient = abstraxionClient;
  const isConnected = isAbstraxionConnected && Boolean(abstraxionClient);

  useEffect(() => {
    setQueryClient(null);
  }, [config.rpcEndpoint]);

  const updateConfig = useCallback((patch: Partial<CosmosConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const connectAbstraxion = useCallback(() => {
    // Abstraxion connection is handled by the modal
  }, []);

  const disconnect = useCallback(() => {
    abstraxionLogout?.();
  }, [abstraxionLogout]);

  const ensureQueryClient = useCallback(async () => {
    if (signingClient) {
      return signingClient;
    }
    if (queryClient) {
      return queryClient;
    }
    if (!config.rpcEndpoint) {
      throw new Error('RPC endpoint is required for queries');
    }
    const client = await CosmWasmClient.connect(config.rpcEndpoint);
    setQueryClient(client);
    return client;
  }, [config.rpcEndpoint, queryClient, signingClient]);

  const execute = useCallback<CosmosContextValue['execute']>(
    async (contract, msg, memo, funds = []) => {
      if (!signingClient || !address) {
        throw new Error('Connect a wallet before executing transactions');
      }
      return signingClient.execute(address, contract, msg, 'auto', memo, funds);
    },
    [address, signingClient],
  );

  const instantiate = useCallback<CosmosContextValue['instantiate']>(
    async (codeId, msg, label, options = {}) => {
      if (!signingClient || !address) {
        throw new Error('Connect a wallet before instantiating contracts');
      }
      const result = await signingClient.instantiate(
        address,
        codeId,
        msg,
        label,
        'auto',
        {
          admin: options.admin,
          memo: options.memo,
          funds: options.funds,
        },
      );
      return {
        contractAddress: result.contractAddress,
        transactionHash: result.transactionHash,
      };
    },
    [address, signingClient],
  );

  const query = useCallback<CosmosContextValue['query']>(
    async (contract, msg) => {
      const client = await ensureQueryClient();
      return client.queryContractSmart(contract, msg);
    },
    [ensureQueryClient],
  );

  const getBalance = useCallback<CosmosContextValue['getBalance']>(
    async (addr, denom) => {
      const client = await ensureQueryClient();
      return client.getBalance(addr, denom);
    },
    [ensureQueryClient],
  );

  const value = useMemo<CosmosContextValue>(
    () => ({
      config,
      updateConfig,
      address,
      isConnected,
      loading,
      error,
      connectAbstraxion,
      disconnect,
      execute,
      query,
      instantiate,
      getBalance,
    }),
    [
      address,
      config,
      connectAbstraxion,
      disconnect,
      error,
      execute,
      getBalance,
      instantiate,
      isConnected,
      loading,
      query,
      updateConfig,
    ],
  );

  return <CosmosContext.Provider value={value}>{children}</CosmosContext.Provider>;
};

export const useCosmosContext = () => {
  const ctx = useContext(CosmosContext);
  if (!ctx) {
    throw new Error('useCosmosContext must be used inside CosmosProvider');
  }
  return ctx;
};

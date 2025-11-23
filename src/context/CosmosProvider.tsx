import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { OfflineSigner } from '@cosmjs/proto-signing';
import { Coin } from '@cosmjs/amino';
import { useAbstraxionAccount, useAbstraxionSigningClient } from '@burnt-labs/abstraxion';

export type WalletType = 'abstraxion' | 'keplr' | null;

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
  walletType: WalletType;
  connectAbstraxion: () => void;
  connectKeplr: () => Promise<void>;
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
  assetContract: import.meta.env.VITE_ASSET_CONTRACT || '',
  marketplaceContract: import.meta.env.VITE_MARKETPLACE_CONTRACT || '',
  defaultDenom: import.meta.env.VITE_DEFAULT_DENOM || 'uxion',
};

const CosmosContext = createContext<CosmosContextValue | undefined>(undefined);

declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSignerAuto: (chainId: string) => Promise<OfflineSigner>;
    };
  }
}

export const CosmosProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [config, setConfig] = useState<CosmosConfig>(defaultConfig);
  const [keplrSigningClient, setKeplrSigningClient] = useState<SigningCosmWasmClient | null>(null);
  const [queryClient, setQueryClient] = useState<CosmWasmClient | null>(null);
  const [keplrAddress, setKeplrAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);

  // Abstraxion hooks
  const { data: abstraxionAccount, isConnected: isAbstraxionConnected } = useAbstraxionAccount();
  const { client: abstraxionClient, logout: abstraxionLogout } = useAbstraxionSigningClient();

  // Determine active address and client based on wallet type
  const address = walletType === 'abstraxion'
    ? (abstraxionAccount?.bech32Address || '')
    : keplrAddress;

  const signingClient = walletType === 'abstraxion'
    ? abstraxionClient
    : keplrSigningClient;

  const isConnected = walletType === 'abstraxion'
    ? isAbstraxionConnected && Boolean(abstraxionClient)
    : Boolean(keplrSigningClient && keplrAddress);

  // Auto-detect Abstraxion connection
  useEffect(() => {
    if (isAbstraxionConnected && abstraxionClient && walletType !== 'keplr') {
      setWalletType('abstraxion');
    }
  }, [isAbstraxionConnected, abstraxionClient, walletType]);

  useEffect(() => {
    setQueryClient(null);
  }, [config.rpcEndpoint]);

  const updateConfig = useCallback((patch: Partial<CosmosConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const connectWithSigner = useCallback(
    async (signer: OfflineSigner) => {
      setLoading(true);
      setError(null);
      try {
        if (!config.rpcEndpoint || !config.chainId) {
          throw new Error('RPC endpoint and chain ID are required');
        }
        const [account] = await signer.getAccounts();
        const client = await SigningCosmWasmClient.connectWithSigner(
          config.rpcEndpoint,
          signer,
          {
            gasPrice: GasPrice.fromString(config.gasPrice),
          },
        );
        setKeplrSigningClient(client);
        setKeplrAddress(account.address);
        setWalletType('keplr');
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [config],
  );

  const connectAbstraxion = useCallback(() => {
    // Abstraxion connection is handled by the modal - this just sets the wallet type preference
    setWalletType('abstraxion');
  }, []);

  const connectKeplr = useCallback(async () => {
    if (!window.keplr) {
      throw new Error('Keplr is not available in this browser');
    }
    await window.keplr.enable(config.chainId);
    const signer = await window.keplr.getOfflineSignerAuto(config.chainId);
    await connectWithSigner(signer);
  }, [config.chainId, connectWithSigner]);

  const disconnect = useCallback(() => {
    if (walletType === 'abstraxion') {
      abstraxionLogout?.();
    }
    setKeplrSigningClient(null);
    setKeplrAddress('');
    setWalletType(null);
  }, [walletType, abstraxionLogout]);

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
      walletType,
      connectAbstraxion,
      connectKeplr,
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
      connectKeplr,
      disconnect,
      error,
      execute,
      getBalance,
      instantiate,
      isConnected,
      loading,
      query,
      updateConfig,
      walletType,
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

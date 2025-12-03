import { useCallback, useMemo, useState } from 'react';
import { useCosmos } from './hooks/useCosmos';
import { ConfigPanel } from './components/ConfigPanel';
import { WalletPanel } from './components/WalletPanel';
import { AssetGallery } from './components/AssetGallery';
import { BalanceMonitor } from './components/BalanceMonitor';
import { PluginManager } from './components/PluginManager';
import { PluginViewer } from './components/PluginViewer';
import { QueryPanel } from './components/QueryPanel';
import { ExecutionLog } from './components/ExecutionLog';
import { ActionSection } from './components/sections/ActionSection';
import { ActionDefinition, LogEntry } from './lib/types';
import {
  buildCoin,
  parseExpiration,
  parseOptionalString,
  safeJsonParse,
  randomId,
} from './lib/helpers';

export function ConsoleApp() {
  const { config, execute, instantiate, isConnected, updateConfig, address } = useCosmos();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'> & Partial<Pick<LogEntry, 'id' | 'timestamp'>>) => {
    const next: LogEntry = {
      id: entry.id ?? randomId(),
      timestamp: entry.timestamp ?? new Date().toISOString(),
      ...entry,
    } as LogEntry;
    setLogs((prev) => [next, ...prev].slice(0, 50));
  }, []);

  const runWithLog = useCallback(
    async (
      title: string,
      executor: () => Promise<{ txHash?: string; detail?: string }>,
    ) => {
      try {
        const result = await executor();
        addLog({
          title,
          status: 'success',
          detail: result.detail ?? 'Success',
          txHash: result.txHash,
        });
        return { txHash: result.txHash, message: result.detail };
      } catch (err) {
        addLog({
          title,
          status: 'error',
          detail: err instanceof Error ? err.message : 'Action failed',
        });
        throw err;
      }
    },
    [addLog],
  );

  const assetContractMissing = !config.assetContract;
  const marketplaceMissing = !config.marketplaceContract;
  const ownerClientUnavailable = !config.rpcEndpoint;

  const instantiationActions: ActionDefinition[] = useMemo(
    () => [
      {
        key: 'instantiate-asset',
        title: 'Instantiate Asset Contract',
        description: 'Deploys the asset (cw721-based) contract',
        fields: [
          { name: 'codeId', label: 'Asset Code ID', type: 'number', defaultValue: import.meta.env.VITE_ASSET_CODE_ID || '' },
          { name: 'label', label: 'Instantiate Label', type: 'text' },
          { name: 'admin', label: 'Admin Address (optional)', type: 'text', required: false },
          { name: 'name', label: 'Collection Name', type: 'text' },
          { name: 'symbol', label: 'Collection Symbol', type: 'text' },
          { name: 'minter', label: 'Minter Address', type: 'text', required: false },
          { name: 'creator', label: 'Creator Address', type: 'text', required: false },
          {
            name: 'withdrawAddress',
            label: 'Withdraw Address',
            type: 'text',
            required: false,
          },
          {
            name: 'collectionInfoExtension',
            label: 'Collection Info Extension JSON',
            type: 'textarea',
            defaultValue: '{}',
            required: false,
          },
          {
            name: 'useAsAsset',
            label: 'Use this address in the config panel',
            type: 'checkbox',
            defaultValue: true,
            required: false,
          },
        ],
        disabled: !isConnected,
        disabledReason: 'Connect your wallet to instantiate contracts',
        onSubmit: (values) =>
          runWithLog('Instantiate Asset', async () => {
            const codeId = Number(values.codeId);
            if (!Number.isInteger(codeId)) {
              throw new Error('Code ID must be an integer');
            }
            if (!values.label) {
              throw new Error('Label is required');
            }
            const msg = {
              name: values.name as string,
              symbol: values.symbol as string,
              collection_info_extension: safeJsonParse(
                values.collectionInfoExtension as string,
                {},
              ),
              minter: parseOptionalString(values.minter as string),
              creator: parseOptionalString(values.creator as string),
              withdraw_address: parseOptionalString(values.withdrawAddress as string),
            };
            const admin = parseOptionalString(values.admin as string);
            const result = await instantiate(codeId, msg, values.label as string, { admin });
            if (values.useAsAsset) {
              updateConfig({ assetContract: result.contractAddress });
            }
            return {
              txHash: result.transactionHash,
              detail: `Asset contract at ${result.contractAddress}`,
            };
          }),
      },
      {
        key: 'instantiate-marketplace',
        title: 'Instantiate Marketplace Contract',
        description: 'Deploys the marketplace contract with your connected wallet as manager',
        fields: [
          { name: 'codeId', label: 'Marketplace Code ID', type: 'number', defaultValue: import.meta.env.VITE_MARKETPLACE_CODE_ID || '' },
          { name: 'label', label: 'Instantiate Label', type: 'text' },
          { name: 'admin', label: 'Admin Address (optional)', type: 'text', required: false },
          {
            name: 'feeRecipient',
            label: 'Fee Recipient',
            type: 'text',
            placeholder: 'xion1...',
          },
          {
            name: 'feeBps',
            label: 'Fee BPS',
            type: 'number',
            defaultValue: '200',
          },
          {
            name: 'saleApprovals',
            label: 'Require Sale Approvals',
            type: 'select',
            defaultValue: 'false',
            options: [
              { label: 'Disabled', value: 'false' },
              { label: 'Enabled', value: 'true' },
            ],
          },
          {
            name: 'listingDenom',
            label: 'Listing Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
          {
            name: 'useAsMarketplace',
            label: 'Use this address in the config panel',
            type: 'checkbox',
            defaultValue: true,
            required: false,
          },
        ],
        disabled: ownerClientUnavailable,
        disabledReason: ownerClientUnavailable ? 'Set the RPC endpoint first' : undefined,
        onSubmit: (values) =>
          runWithLog('Instantiate Marketplace', async () => {
            const codeId = Number(values.codeId);
            if (!Number.isInteger(codeId)) {
              throw new Error('Code ID must be an integer');
            }
            if (!values.label) {
              throw new Error('Label is required');
            }
            const feeBps = Number(values.feeBps);
            if (!Number.isFinite(feeBps)) {
              throw new Error('Fee BPS must be numeric');
            }
            const msg = {
              config: {
                manager: address,
                fee_recipient: values.feeRecipient as string,
                fee_bps: feeBps,
                sale_approvals:
                  (values.saleApprovals as string)?.toLowerCase() === 'true',
                listing_denom: (values.listingDenom as string) || config.defaultDenom,
              },
            };
            const admin = parseOptionalString(values.admin as string) ?? address;
            const result = await instantiate(codeId, msg, values.label as string, {
              admin,
            });
            if (values.useAsMarketplace) {
              updateConfig({ marketplaceContract: result.contractAddress });
            }
            return {
              txHash: result.transactionHash,
              detail: `Marketplace contract at ${result.contractAddress}`,
            };
          }),
      },
    ],
    [address, config.defaultDenom, instantiate, ownerClientUnavailable, runWithLog, updateConfig],
  );

  const assetActions: ActionDefinition[] = useMemo(
    () => [
      {
        key: 'mint-nft',
        title: 'Mint NFT',
        description: 'Direct mint via asset contract',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'owner', label: 'Owner Address', type: 'text' },
          { name: 'tokenUri', label: 'Token URI', type: 'text', required: false },
          {
            name: 'extension',
            label: 'Extension JSON',
            type: 'textarea',
            placeholder: '{\n  "name": "Demo"\n}',
            required: false,
          },
        ],
        disabled: !isConnected,
        disabledReason: 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Mint NFT', async () => {
            const msg = {
              mint: {
                token_id: values.tokenId,
                owner: values.owner,
                token_uri: parseOptionalString(values.tokenUri as string),
                extension: safeJsonParse(values.extension as string, {}),
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Minted ${values.tokenId}` };
          }),
      },
      {
        key: 'approve-token',
        title: 'Approve Token',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'spender', label: 'Spender', type: 'text' },
          {
            name: 'expiration',
            label: 'Expiration',
            type: 'text',
            placeholder: 'never | height:123 | time:1700',
            required: false,
          },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Approve Token', async () => {
            const expires = parseExpiration(values.expiration as string);
            const msg: Record<string, unknown> = {
              approve: {
                spender: values.spender,
                token_id: values.tokenId,
                ...(expires ? { expires } : {}),
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Approved ${values.tokenId}` };
          }),
      },
      {
        key: 'revoke-token',
        title: 'Revoke Token Approval',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'spender', label: 'Spender', type: 'text' },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Revoke Approval', async () => {
            const msg = {
              revoke: {
                spender: values.spender,
                token_id: values.tokenId,
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Revoked ${values.spender}` };
          }),
      },
      {
        key: 'operator-grant',
        title: 'Set Operator',
        fields: [
          { name: 'operator', label: 'Operator', type: 'text' },
          {
            name: 'expiration',
            label: 'Expiration',
            type: 'text',
            placeholder: 'never | height:123 | time:1700',
            required: false,
          },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Set Operator', async () => {
            const expires = parseExpiration(values.expiration as string);
            const msg = {
              approve_all: {
                operator: values.operator,
                ...(expires ? { expires } : {}),
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Operator ${values.operator}` };
          }),
      },
      {
        key: 'operator-revoke',
        title: 'Revoke Operator',
        fields: [{ name: 'operator', label: 'Operator', type: 'text' }],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Revoke Operator', async () => {
            const msg = {
              revoke_all: {
                operator: values.operator,
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Revoked ${values.operator}` };
          }),
      },
      {
        key: 'accept-minter-ownership',
        title: 'Accept Minter Ownership',
        description: 'Accept a pending minter ownership transfer',
        fields: [],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: () =>
          runWithLog('Accept Minter Ownership', async () => {
            const msg = {
              update_minter_ownership: 'accept_ownership',
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: 'Minter ownership accepted' };
          }),
      },
      {
        key: 'transfer-nft',
        title: 'Transfer NFT',
        description: 'Transfer an NFT to another address using your connected wallet.',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'recipient', label: 'Recipient Address', type: 'text' },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Transfer NFT', async () => {
            const msg = {
              transfer_nft: {
                recipient: values.recipient,
                token_id: values.tokenId,
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Transferred ${values.tokenId}` };
          }),
      },
    ],
    [assetContractMissing, config.assetContract, execute, isConnected, runWithLog],
  );

  const assetListingActions: ActionDefinition[] = useMemo(
    () => [
      {
        key: 'list-asset',
        title: 'List Asset',
        description: 'Calls asset extension list',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'priceAmount', label: 'Price Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
          {
            name: 'reserver',
            label: 'Reserved For (optional)',
            type: 'text',
            required: false,
          },
          {
            name: 'reservedUntil',
            label: 'Reserved Until (epoch seconds)',
            type: 'text',
            required: false,
          },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('List Asset', async () => {
            const reservation = values.reservedUntil
              ? {
                  reserved_until: values.reservedUntil,
                  ...(values.reserver ? { reserver: values.reserver } : {}),
                }
              : undefined;
            const msg = {
              update_extension: {
                msg: {
                  list: {
                    token_id: values.tokenId,
                    price: buildCoin(values.priceAmount as string, values.priceDenom as string),
                    ...(reservation ? { reservation } : {}),
                  },
                },
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Listed ${values.tokenId}` };
          }),
      },
      {
        key: 'reserve-asset',
        title: 'Reserve Asset',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'reserver', label: 'Reserver', type: 'text', required: false },
          {
            name: 'reservedUntil',
            label: 'Reserved Until (epoch seconds)',
            type: 'text',
          },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Reserve Asset', async () => {
            const msg = {
              update_extension: {
                msg: {
                  reserve: {
                    token_id: values.tokenId,
                    reservation: {
                      reserved_until: values.reservedUntil,
                      reserver: values.reserver || undefined,
                    },
                  },
                },
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Reserved ${values.tokenId}` };
          }),
      },
      {
        key: 'unreserve-asset',
        title: 'Unreserve Asset',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'delist', label: 'Also delist', type: 'checkbox', required: false },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Unreserve Asset', async () => {
            const msg = {
              update_extension: {
                msg: {
                  un_reserve: {
                    token_id: values.tokenId,
                    delist: Boolean(values.delist),
                  },
                },
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Unreserved ${values.tokenId}` };
          }),
      },
      {
        key: 'delist-asset',
        title: 'Delist Asset',
        fields: [{ name: 'tokenId', label: 'Token ID', type: 'text' }],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Delist Asset', async () => {
            const msg = {
              update_extension: {
                msg: {
                  delist: {
                    token_id: values.tokenId,
                  },
                },
              },
            };
            const res = await execute(config.assetContract, msg);
            return { txHash: res.transactionHash, detail: `Delisted ${values.tokenId}` };
          }),
      },
      {
        key: 'buy-asset',
        title: 'Buy Listed Asset',
        fields: [
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'recipient', label: 'Recipient Override', type: 'text', required: false },
          { name: 'priceAmount', label: 'Payment Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: assetContractMissing || !isConnected,
        disabledReason: assetContractMissing ? 'Set the asset contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Buy Asset', async () => {
            const msg = {
              update_extension: {
                msg: {
                  buy: {
                    token_id: values.tokenId,
                    recipient: values.recipient || undefined,
                  },
                },
              },
            };
            const funds = [buildCoin(values.priceAmount as string, values.priceDenom as string)];
            const res = await execute(config.assetContract, msg, undefined, funds);
            return { txHash: res.transactionHash, detail: `Bought ${values.tokenId}` };
          }),
      },
    ],
    [assetContractMissing, config.assetContract, config.defaultDenom, execute, isConnected, runWithLog],
  );

  const marketplaceActions: ActionDefinition[] = useMemo(
    () => [
      {
        key: 'market-list',
        title: 'Create Marketplace Listing',
        fields: [
          {
            name: 'collection',
            label: 'Collection',
            type: 'text',
            defaultValue: config.assetContract,
          },
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'priceAmount', label: 'Price Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Marketplace List', async () => {
            const msg = {
              list_item: {
                collection: values.collection || config.assetContract,
                token_id: values.tokenId,
                price: buildCoin(values.priceAmount as string, values.priceDenom as string),
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Listing ${values.tokenId}` };
          }),
      },
      {
        key: 'market-cancel',
        title: 'Cancel Listing',
        fields: [{ name: 'listingId', label: 'Listing ID', type: 'text' }],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Cancel Listing', async () => {
            const msg = {
              cancel_listing: {
                listing_id: values.listingId,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Cancelled ${values.listingId}` };
          }),
      },
      {
        key: 'market-buy',
        title: 'Buy Listing',
        fields: [
          { name: 'listingId', label: 'Listing ID', type: 'text' },
          { name: 'priceAmount', label: 'Price Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Buy Listing', async () => {
            const price = buildCoin(values.priceAmount as string, values.priceDenom as string);
            const msg = {
              buy_item: {
                listing_id: values.listingId,
                price,
              },
            };
            const res = await execute(config.marketplaceContract, msg, undefined, [price]);
            return { txHash: res.transactionHash, detail: `Purchased listing ${values.listingId}` };
          }),
      },
      {
        key: 'market-finalize',
        title: 'Finalize For Recipient',
        fields: [
          { name: 'listingId', label: 'Listing ID', type: 'text' },
          { name: 'recipient', label: 'Recipient', type: 'text' },
          { name: 'priceAmount', label: 'Price Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Finalize Sale', async () => {
            const price = buildCoin(values.priceAmount as string, values.priceDenom as string);
            const msg = {
              finalize_for: {
                listing_id: values.listingId,
                recipient: values.recipient,
                price,
              },
            };
            const res = await execute(config.marketplaceContract, msg, undefined, [price]);
            return { txHash: res.transactionHash, detail: `Finalized ${values.listingId}` };
          }),
      },
      {
        key: 'market-offer',
        title: 'Create Offer',
        fields: [
          {
            name: 'collection',
            label: 'Collection',
            type: 'text',
            defaultValue: config.assetContract,
          },
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'priceAmount', label: 'Offer Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Create Offer', async () => {
            const price = buildCoin(values.priceAmount as string, values.priceDenom as string);
            const msg = {
              create_offer: {
                collection: values.collection || config.assetContract,
                token_id: values.tokenId,
                price,
              },
            };
            const res = await execute(config.marketplaceContract, msg, undefined, [price]);
            return { txHash: res.transactionHash, detail: `Offer for ${values.tokenId}` };
          }),
      },
      {
        key: 'market-accept-offer',
        title: 'Accept Offer',
        fields: [
          { name: 'offerId', label: 'Offer ID', type: 'text' },
          {
            name: 'collection',
            label: 'Collection',
            type: 'text',
            defaultValue: config.assetContract,
          },
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'priceAmount', label: 'Match Price', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Accept Offer', async () => {
            const price = buildCoin(values.priceAmount as string, values.priceDenom as string);
            const msg = {
              accept_offer: {
                id: values.offerId,
                collection: values.collection || config.assetContract,
                token_id: values.tokenId,
                price,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Accepted offer ${values.offerId}` };
          }),
      },
      {
        key: 'market-cancel-offer',
        title: 'Cancel Offer',
        fields: [{ name: 'offerId', label: 'Offer ID', type: 'text' }],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Cancel Offer', async () => {
            const msg = {
              cancel_offer: {
                id: values.offerId,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Cancelled offer ${values.offerId}` };
          }),
      },
      {
        key: 'market-collection-offer',
        title: 'Collection Offer',
        fields: [
          {
            name: 'collection',
            label: 'Collection',
            type: 'text',
            defaultValue: config.assetContract,
          },
          { name: 'priceAmount', label: 'Offer Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Collection Offer', async () => {
            const price = buildCoin(values.priceAmount as string, values.priceDenom as string);
            const msg = {
              create_collection_offer: {
                collection: values.collection || config.assetContract,
                price,
              },
            };
            const res = await execute(config.marketplaceContract, msg, undefined, [price]);
            return { txHash: res.transactionHash, detail: `Collection offer ${values.collection}` };
          }),
      },
      {
        key: 'market-accept-co',
        title: 'Accept Collection Offer',
        fields: [
          { name: 'offerId', label: 'Collection Offer ID', type: 'text' },
          {
            name: 'collection',
            label: 'Collection',
            type: 'text',
            defaultValue: config.assetContract,
          },
          { name: 'tokenId', label: 'Token ID', type: 'text' },
          { name: 'priceAmount', label: 'Match Amount', type: 'text' },
          {
            name: 'priceDenom',
            label: 'Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Accept Collection Offer', async () => {
            const price = buildCoin(values.priceAmount as string, values.priceDenom as string);
            const msg = {
              accept_collection_offer: {
                id: values.offerId,
                collection: values.collection || config.assetContract,
                token_id: values.tokenId,
                price,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Accepted collection offer ${values.offerId}` };
          }),
      },
      {
        key: 'market-cancel-co',
        title: 'Cancel Collection Offer',
        fields: [{ name: 'offerId', label: 'Collection Offer ID', type: 'text' }],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Cancel Collection Offer', async () => {
            const msg = {
              cancel_collection_offer: {
                id: values.offerId,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Cancelled collection offer ${values.offerId}` };
          }),
      },
      {
        key: 'market-approve-sale',
        title: 'Approve Pending Sale',
        fields: [{ name: 'pendingId', label: 'Pending Sale ID', type: 'text' }],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Approve Sale', async () => {
            const msg = {
              approve_sale: {
                id: values.pendingId,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Approved ${values.pendingId}` };
          }),
      },
      {
        key: 'market-reject-sale',
        title: 'Reject Pending Sale',
        fields: [{ name: 'pendingId', label: 'Pending Sale ID', type: 'text' }],
        disabled: marketplaceMissing || !isConnected,
        disabledReason: marketplaceMissing ? 'Set the marketplace contract address' : 'Connect your wallet',
        onSubmit: (values) =>
          runWithLog('Reject Sale', async () => {
            const msg = {
              reject_sale: {
                id: values.pendingId,
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: `Rejected ${values.pendingId}` };
          }),
      },
      {
        key: 'market-update-config',
        title: 'Update Marketplace Config (owner-signed)',
        fields: [
          { name: 'feeRecipient', label: 'Fee Recipient', type: 'text' },
          { name: 'feeBps', label: 'Fee BPS', type: 'number', placeholder: '200' },
          {
            name: 'saleApprovals',
            label: 'Require Sale Approvals (true/false)',
            type: 'text',
            placeholder: 'true',
          },
          {
            name: 'listingDenom',
            label: 'Listing Denom',
            type: 'text',
            defaultValue: config.defaultDenom,
          },
        ],
        disabled: marketplaceMissing || ownerClientUnavailable,
        disabledReason: marketplaceMissing
          ? 'Set the marketplace contract address first'
          : ownerClientUnavailable
            ? 'Set the RPC endpoint first'
            : undefined,
        onSubmit: (values) =>
          runWithLog('Update Config', async () => {
            const msg = {
              update_config: {
                config: {
                  manager: address,
                  fee_recipient: values.feeRecipient,
                  fee_bps: Number(values.feeBps),
                  sale_approvals: (values.saleApprovals as string)?.toLowerCase() === 'true',
                  listing_denom: values.listingDenom || config.defaultDenom,
                },
              },
            };
            const res = await execute(config.marketplaceContract, msg);
            return { txHash: res.transactionHash, detail: 'Updated config' };
          }),
      },
    ],
    [
      address,
      config.assetContract,
      config.defaultDenom,
      config.marketplaceContract,
      execute,
      isConnected,
      marketplaceMissing,
      ownerClientUnavailable,
      runWithLog,
    ],
  );

  return (
    <div className="app-shell">
      <header>
        <h1>Xion Marketplace Console</h1>
        <p>Interact with asset + marketplace CosmWasm contracts for testing.</p>
      </header>
      <main>
      <section className="grid">
        <ConfigPanel />
        <WalletPanel />
      </section>
      <ActionSection
        title="Deploy Contracts"
        description="Instantiate fresh asset or marketplace contracts (provide code IDs)"
        actions={instantiationActions}
      />
      <ActionSection title="Asset Core" description="Mint and manage approvals" actions={assetActions} />
        <ActionSection title="Asset Listings" description="List, reserve, delist, and buy" actions={assetListingActions} />
        <PluginManager addLog={addLog} />
        <PluginViewer />
        <BalanceMonitor />
        <AssetGallery />
        <ActionSection title="Marketplace" description="List, trade, offers, and config" actions={marketplaceActions} />
        <section>
          <div className="section-header">
            <h2>Queries</h2>
          </div>
          <QueryPanel addLog={addLog} />
        </section>
        <section>
          <div className="section-header">
            <h2>Execution Log</h2>
          </div>
          <ExecutionLog entries={logs} />
        </section>
      </main>
    </div>
  );
}

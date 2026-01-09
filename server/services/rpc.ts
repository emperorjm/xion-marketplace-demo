// RPC fallback service - queries blockchain directly via CosmJS
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { config } from '../config.js';
import { ActivityItem, ListingInfo, OfferInfo, NFTDetails, NFTWithListingStatus } from '../types.js';

let rpcClient: CosmWasmClient | null = null;

async function getClient(): Promise<CosmWasmClient> {
  if (!rpcClient) {
    rpcClient = await CosmWasmClient.connect(config.rpcEndpoint);
  }
  return rpcClient;
}

export async function getActivityFromRpc(
  limit = 50,
  _offset = 0,
  assetContract?: string
): Promise<ActivityItem[]> {
  const client = await getClient();
  const contractAddress = assetContract || config.assetContract;

  if (!contractAddress) {
    console.log('No asset contract configured for activity search');
    return [];
  }

  try {
    // Search for transactions involving the contract
    const txs = await client.searchTx(`wasm._contract_address='${contractAddress}'`);

    const activities: ActivityItem[] = [];

    for (const tx of txs.slice(0, limit)) {
      // Parse events from transaction
      const txActivities = parseTransactionEvents(tx, contractAddress);
      activities.push(...txActivities);
    }

    // Sort by timestamp descending and limit results
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch activity from RPC:', error);
    return [];
  }
}

// Helper to parse transaction events into activity items
function parseTransactionEvents(
  tx: { hash: string; height: number; events: readonly { type: string; attributes: readonly { key: string; value: string }[] }[] },
  contractAddress: string
): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const txHash = tx.hash;
  const blockHeight = tx.height;
  // Approximate timestamp from block height (not exact, but reasonable for demo)
  const timestamp = Date.now() - (blockHeight * 6000); // ~6 sec per block approximation

  for (const event of tx.events) {
    // Skip events not related to our contract
    const contractAttr = event.attributes.find(
      a => a.key === '_contract_address' && a.value === contractAddress
    );
    if (event.type.startsWith('wasm') && !contractAttr) continue;

    const getAttr = (key: string) =>
      event.attributes.find(a => a.key === key)?.value;

    let activity: ActivityItem | null = null;

    switch (event.type) {
      case 'wasm-mint':
      case 'wasm': {
        const action = getAttr('action');
        if (action === 'mint' || event.type === 'wasm-mint') {
          const tokenId = getAttr('token_id');
          const owner = getAttr('owner') || getAttr('minter');
          if (tokenId) {
            activity = {
              id: `${txHash}-mint-${tokenId}`,
              type: 'mint',
              tokenId,
              to: owner,
              timestamp,
              txHash,
              blockHeight,
              description: `Minted Token #${tokenId}`,
            };
          }
        } else if (action === 'transfer_nft') {
          const tokenId = getAttr('token_id');
          const sender = getAttr('sender');
          const recipient = getAttr('recipient');
          if (tokenId) {
            activity = {
              id: `${txHash}-transfer-${tokenId}`,
              type: 'transfer',
              tokenId,
              from: sender,
              to: recipient,
              timestamp,
              txHash,
              blockHeight,
              description: `Transferred Token #${tokenId}`,
            };
          }
        } else if (action === 'list_token' || action === 'list') {
          const tokenId = getAttr('token_id');
          const price = getAttr('price');
          const seller = getAttr('seller');
          if (tokenId) {
            activity = {
              id: `${txHash}-list-${tokenId}`,
              type: 'list',
              tokenId,
              from: seller,
              price,
              denom: config.defaultDenom,
              timestamp,
              txHash,
              blockHeight,
              description: `Listed Token #${tokenId}`,
            };
          }
        } else if (action === 'delist_token' || action === 'delist' || action === 'cancel_listing') {
          const tokenId = getAttr('token_id');
          const seller = getAttr('seller');
          if (tokenId) {
            activity = {
              id: `${txHash}-delist-${tokenId}`,
              type: 'delist',
              tokenId,
              from: seller,
              timestamp,
              txHash,
              blockHeight,
              description: `Delisted Token #${tokenId}`,
            };
          }
        } else if (action === 'buy_token' || action === 'buy') {
          const tokenId = getAttr('token_id');
          const buyer = getAttr('buyer');
          const seller = getAttr('seller');
          const price = getAttr('price');
          if (tokenId) {
            activity = {
              id: `${txHash}-buy-${tokenId}`,
              type: 'buy',
              tokenId,
              from: seller,
              to: buyer,
              price,
              denom: config.defaultDenom,
              timestamp,
              txHash,
              blockHeight,
              description: `Purchased Token #${tokenId}`,
            };
          }
        }
        break;
      }
    }

    if (activity) {
      activities.push(activity);
    }
  }

  return activities;
}

export async function getListingsFromRpc(): Promise<ListingInfo[]> {
  const client = await getClient();
  const contractAddress = config.assetContract;

  if (!contractAddress) {
    console.log('No asset contract configured');
    return [];
  }

  try {
    // Query listings from asset contract extension
    const result = await client.queryContractSmart(contractAddress, {
      extension: {
        msg: {
          get_all_listings: {
            start_after: undefined,
            limit: 100,
          },
        },
      },
    });

    if (!Array.isArray(result)) {
      return [];
    }

    return result.map((listing: {
      id?: string;
      token_id?: string;
      seller?: string;
      price?: { amount?: string; denom?: string } | string;
    }): ListingInfo => ({
      tokenId: listing.id || listing.token_id || '',
      seller: listing.seller || '',
      price: typeof listing.price === 'object' ? listing.price?.amount || '' : listing.price || '',
      denom: typeof listing.price === 'object' ? listing.price?.denom || config.defaultDenom : config.defaultDenom,
      listedAt: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to query listings from RPC:', error);
    return [];
  }
}

export async function getOffersFromRpc(tokenId: string): Promise<OfferInfo[]> {
  // RPC doesn't have a query for offers by token
  // The asset contract only supports: get_listing, get_listings_by_seller, get_all_listings, get_collection_plugins
  // Offers require the indexer to track create/accept/reject/cancel events
  console.log(`Offers for token ${tokenId} not available via RPC - requires indexer`);
  return [];
}

export async function getNFTFromRpc(tokenId: string): Promise<NFTDetails | null> {
  const client = await getClient();
  const contractAddress = config.assetContract;

  if (!contractAddress) {
    return null;
  }

  try {
    // Query NFT info
    const nftInfo = await client.queryContractSmart(contractAddress, {
      nft_info: { token_id: tokenId },
    });

    // Query owner
    const ownerInfo = await client.queryContractSmart(contractAddress, {
      owner_of: { token_id: tokenId },
    });

    const extension = nftInfo.extension || {};

    return {
      tokenId,
      name: extension.name || `Token #${tokenId}`,
      description: extension.description || '',
      image: extension.image || '',
      owner: ownerInfo.owner || '',
      tokenUri: nftInfo.token_uri || '',
    };
  } catch (error) {
    console.error('Failed to query NFT from RPC:', error);
    return null;
  }
}

// Get user's active listings via RPC with NFT metadata
export async function getUserListingsFromRpc(userAddress: string, assetContract?: string): Promise<ListingInfo[]> {
  const client = await getClient();
  const contractAddress = assetContract || config.assetContract;

  if (!contractAddress) {
    return [];
  }

  try {
    // Get user's tokens
    const tokensResult = await client.queryContractSmart(contractAddress, {
      tokens: { owner: userAddress, limit: 100 },
    }) as { tokens?: string[] };

    const userTokens = new Set(tokensResult.tokens || []);

    // Get all listings
    const listingsResult = await client.queryContractSmart(contractAddress, {
      extension: {
        msg: {
          get_all_listings: { start_after: undefined, limit: 100 },
        },
      },
    }) as Array<{
      id?: string;
      token_id?: string;
      seller?: string;
      price?: { amount?: string; denom?: string } | string;
    }>;

    if (!Array.isArray(listingsResult)) {
      return [];
    }

    // Filter to only user's listed tokens
    const userListings = listingsResult.filter(l => userTokens.has(l.id || l.token_id || ''));

    // Fetch NFT metadata for each listing
    const listingsWithMetadata: ListingInfo[] = [];
    for (const listing of userListings) {
      const tokenId = listing.id || listing.token_id || '';
      let name = `Token #${tokenId}`;
      let image = '';

      try {
        const nftInfo = await client.queryContractSmart(contractAddress, {
          nft_info: { token_id: tokenId },
        }) as { extension?: { name?: string; image?: string }; token_uri?: string };

        const extension = nftInfo.extension || {};
        name = extension.name || name;
        image = extension.image || '';
      } catch {
        // Continue with default name if nft_info fails
      }

      listingsWithMetadata.push({
        tokenId,
        seller: listing.seller || userAddress,
        price: typeof listing.price === 'object' ? listing.price?.amount || '' : listing.price || '',
        denom: typeof listing.price === 'object' ? listing.price?.denom || config.defaultDenom : config.defaultDenom,
        listedAt: Date.now(),
        name,
        image,
      });
    }

    return listingsWithMetadata;
  } catch (error) {
    console.error('Failed to query user listings from RPC:', error);
    return [];
  }
}

// Get user's owned NFTs via RPC
export async function getUserNFTsFromRpc(userAddress: string, assetContract?: string): Promise<NFTDetails[]> {
  const client = await getClient();
  const contractAddress = assetContract || config.assetContract;

  if (!contractAddress) {
    return [];
  }

  try {
    // Get user's tokens
    const tokensResult = await client.queryContractSmart(contractAddress, {
      tokens: { owner: userAddress, limit: 100 },
    }) as { tokens?: string[] };

    const tokens = tokensResult.tokens || [];
    const nfts: NFTDetails[] = [];

    // Fetch details for each token
    for (const tokenId of tokens) {
      try {
        const nftInfo = await client.queryContractSmart(contractAddress, {
          nft_info: { token_id: tokenId },
        }) as { extension?: { name?: string; description?: string; image?: string }; token_uri?: string };

        const extension = nftInfo.extension || {};
        nfts.push({
          tokenId,
          name: extension.name || `Token #${tokenId}`,
          description: extension.description || '',
          image: extension.image || '',
          owner: userAddress,
          tokenUri: nftInfo.token_uri || '',
        });
      } catch {
        // If individual token fails, add with minimal info
        nfts.push({
          tokenId,
          name: `Token #${tokenId}`,
          owner: userAddress,
        });
      }
    }

    return nfts;
  } catch (error) {
    console.error('Failed to query user NFTs from RPC:', error);
    return [];
  }
}

// Get all NFTs with listing status via RPC
export async function getAllNFTsFromRpc(
  limit = 100,
  _offset = 0,
  assetContract?: string
): Promise<NFTWithListingStatus[]> {
  const client = await getClient();
  const contractAddress = assetContract || config.assetContract;

  if (!contractAddress) {
    return [];
  }

  try {
    // Get all tokens
    const tokensResult = await client.queryContractSmart(contractAddress, {
      all_tokens: { limit },
    }) as { tokens?: string[] };

    // Get all listings to build a map
    const listingsMap = new Map<string, { price: string; denom: string }>();
    try {
      const listings = await client.queryContractSmart(contractAddress, {
        extension: {
          msg: { get_all_listings: { limit: 100 } },
        },
      }) as Array<{
        id?: string;
        token_id?: string;
        price?: { amount?: string; denom?: string } | string;
      }>;

      if (Array.isArray(listings)) {
        listings.forEach(l => {
          const tokenId = l.id || l.token_id;
          if (tokenId && l.price) {
            listingsMap.set(tokenId, {
              price: typeof l.price === 'object' ? l.price.amount || '' : l.price,
              denom: typeof l.price === 'object' ? l.price.denom || config.defaultDenom : config.defaultDenom,
            });
          }
        });
      }
    } catch {
      // Listings query failed, continue without listing info
    }

    const tokens = tokensResult.tokens || [];
    const nfts: NFTWithListingStatus[] = [];

    // Fetch details for each token
    for (const tokenId of tokens) {
      try {
        const [nftInfo, ownerInfo] = await Promise.all([
          client.queryContractSmart(contractAddress, { nft_info: { token_id: tokenId } }) as Promise<{
            extension?: { name?: string; description?: string; image?: string };
            token_uri?: string;
          }>,
          client.queryContractSmart(contractAddress, { owner_of: { token_id: tokenId } }) as Promise<{
            owner?: string;
          }>,
        ]);

        const extension = nftInfo.extension || {};
        const listing = listingsMap.get(tokenId);

        nfts.push({
          tokenId,
          name: extension.name || `Token #${tokenId}`,
          description: extension.description || '',
          image: extension.image || '',
          owner: ownerInfo.owner || '',
          tokenUri: nftInfo.token_uri || '',
          isListed: !!listing,
          price: listing?.price,
          denom: listing?.denom,
        });
      } catch {
        // If individual token fails, add with minimal info
        nfts.push({
          tokenId,
          name: `Token #${tokenId}`,
          owner: '',
          isListed: listingsMap.has(tokenId),
          price: listingsMap.get(tokenId)?.price,
          denom: listingsMap.get(tokenId)?.denom,
        });
      }
    }

    return nfts;
  } catch (error) {
    console.error('Failed to query all NFTs from RPC:', error);
    return [];
  }
}

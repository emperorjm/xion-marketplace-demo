// Indexer query service - fetches data from PostgreSQL
import { getPool } from '../db/client.js';
import { ActivityItem, ListingInfo, OfferInfo, NFTDetails, NFTWithListingStatus, extractionNameToActivityType } from '../types.js';
import { config } from '../config.js';

export async function getActivityFromIndexer(
  limit = 50,
  offset = 0
): Promise<ActivityItem[]> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  const contractAddress = config.assetContract || config.marketplaceContract;
  if (!contractAddress) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT
      id,
      address,
      name,
      "blockHeight",
      "blockTimeUnixMs",
      "txHash",
      data
    FROM "Extractions"
    WHERE (address = $1 OR address = $4)
      AND name LIKE ANY(ARRAY['marketplace/%', 'asset/mint', 'asset/transfer%', 'asset/list', 'asset/delist', 'asset/buy'])
    ORDER BY "blockTimeUnixMs" DESC
    LIMIT $2 OFFSET $3
    `,
    [config.assetContract, limit, offset, config.marketplaceContract]
  );

  return result.rows.map((row): ActivityItem => {
    const type = extractionNameToActivityType(row.name) || 'admin';
    const data = row.data || {};

    return {
      id: String(row.id),
      type,
      tokenId: data.token_id || data.tokenId || '',
      from: data.seller || data.from || data.owner || '',
      to: data.buyer || data.to || data.recipient || '',
      price: data.price?.amount || data.price || '',
      denom: data.price?.denom || data.denom || config.defaultDenom,
      timestamp: parseInt(row.blockTimeUnixMs, 10),
      txHash: row.txHash,
      blockHeight: parseInt(row.blockHeight, 10),
    };
  });
}

export async function getListingsFromIndexer(): Promise<ListingInfo[]> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  const contractAddress = config.marketplaceContract || config.assetContract;
  if (!contractAddress) {
    return [];
  }

  // Get active listings by finding the latest event for each token
  // and filtering to only those where the latest event is a list (not delist/buy)
  const result = await pool.query(
    `
    WITH latest_events AS (
      SELECT DISTINCT ON (data->>'token_id')
        data->>'token_id' as token_id,
        name,
        data,
        "blockTimeUnixMs",
        "txHash"
      FROM "Extractions"
      WHERE (address = $1 OR address = $2)
        AND name IN (
          'marketplace/list-item', 'marketplace/delist-item', 'marketplace/cancel-listing',
          'marketplace/item-sold', 'marketplace/buy',
          'asset/list', 'asset/delist', 'asset/buy'
        )
        AND data->>'token_id' IS NOT NULL
      ORDER BY data->>'token_id', "blockTimeUnixMs" DESC
    )
    SELECT * FROM latest_events
    WHERE name IN ('marketplace/list-item', 'asset/list')
    `,
    [config.marketplaceContract, config.assetContract]
  );

  return result.rows.map((row): ListingInfo => {
    const data = row.data || {};
    return {
      tokenId: row.token_id,
      seller: data.seller || data.owner || '',
      price: data.price?.amount || data.price || '',
      denom: data.price?.denom || data.denom || config.defaultDenom,
      listedAt: parseInt(row.blockTimeUnixMs, 10),
      txHash: row.txHash,
    };
  });
}

export async function getOffersFromIndexer(tokenId: string): Promise<OfferInfo[]> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  const contractAddress = config.marketplaceContract;
  if (!contractAddress) {
    return [];
  }

  // Get active offers (created but not accepted/rejected/cancelled)
  const result = await pool.query(
    `
    WITH offer_events AS (
      SELECT
        data->>'offer_id' as offer_id,
        data->>'bidder' as bidder,
        data,
        "blockTimeUnixMs",
        "txHash"
      FROM "Extractions"
      WHERE address = $1
        AND name = 'marketplace/create-offer'
        AND data->>'token_id' = $2
    ),
    closed_offers AS (
      SELECT data->>'offer_id' as offer_id
      FROM "Extractions"
      WHERE address = $1
        AND name IN ('marketplace/accept-offer', 'marketplace/reject-offer', 'marketplace/cancel-offer')
    )
    SELECT o.*
    FROM offer_events o
    LEFT JOIN closed_offers c ON o.offer_id = c.offer_id
    WHERE c.offer_id IS NULL
    ORDER BY o."blockTimeUnixMs" DESC
    `,
    [contractAddress, tokenId]
  );

  return result.rows.map((row): OfferInfo => {
    const data = row.data || {};
    return {
      offerId: row.offer_id || '',
      tokenId,
      bidder: row.bidder || '',
      price: data.price?.amount || data.price || '',
      denom: data.price?.denom || data.denom || config.defaultDenom,
      createdAt: parseInt(row.blockTimeUnixMs, 10),
      txHash: row.txHash,
    };
  });
}

export async function getNFTFromIndexer(tokenId: string): Promise<NFTDetails | null> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  const contractAddress = config.assetContract;
  if (!contractAddress) {
    return null;
  }

  // Get mint event for NFT metadata
  const mintResult = await pool.query(
    `
    SELECT
      data,
      "blockTimeUnixMs",
      "txHash"
    FROM "Extractions"
    WHERE address = $1
      AND name = 'asset/mint'
      AND data->>'token_id' = $2
    LIMIT 1
    `,
    [contractAddress, tokenId]
  );

  if (mintResult.rows.length === 0) {
    return null;
  }

  const mintData = mintResult.rows[0].data || {};

  // Get current owner from latest transfer
  const ownerResult = await pool.query(
    `
    SELECT data->>'to' as owner, data->>'recipient' as recipient, data->>'owner' as original_owner
    FROM "Extractions"
    WHERE address = $1
      AND name IN ('asset/transfer_nft', 'asset/transfer', 'asset/mint')
      AND (data->>'token_id' = $2 OR data->>'token_id' = $2)
    ORDER BY "blockTimeUnixMs" DESC
    LIMIT 1
    `,
    [contractAddress, tokenId]
  );

  const currentOwner = ownerResult.rows[0]?.owner
    || ownerResult.rows[0]?.recipient
    || ownerResult.rows[0]?.original_owner
    || mintData.owner
    || '';

  return {
    tokenId,
    name: mintData.name || mintData.extension?.name || `Token #${tokenId}`,
    description: mintData.description || mintData.extension?.description || '',
    image: mintData.image || mintData.extension?.image || '',
    owner: currentOwner,
    tokenUri: mintData.token_uri || '',
    mintedAt: parseInt(mintResult.rows[0].blockTimeUnixMs, 10),
    mintTxHash: mintResult.rows[0].txHash,
  };
}

// Get user's active listings with NFT metadata
export async function getUserListingsFromIndexer(userAddress: string): Promise<ListingInfo[]> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  if (!config.assetContract && !config.marketplaceContract) {
    return [];
  }

  const result = await pool.query(
    `
    WITH latest_listing_events AS (
      SELECT DISTINCT ON (data->>'token_id')
        data->>'token_id' as token_id,
        name,
        data,
        "blockTimeUnixMs",
        "txHash"
      FROM "Extractions"
      WHERE (address = $1 OR address = $2)
        AND name IN (
          'marketplace/list-item', 'marketplace/delist-item', 'marketplace/cancel-listing',
          'marketplace/item-sold', 'marketplace/buy',
          'asset/list', 'asset/delist', 'asset/buy'
        )
        AND data->>'token_id' IS NOT NULL
      ORDER BY data->>'token_id', "blockTimeUnixMs" DESC
    ),
    user_listings AS (
      SELECT * FROM latest_listing_events
      WHERE name IN ('marketplace/list-item', 'asset/list')
        AND (data->>'seller' = $3 OR data->>'owner' = $3)
    ),
    mint_data AS (
      SELECT
        data->>'token_id' as token_id,
        data as mint_data
      FROM "Extractions"
      WHERE address = $2
        AND name = 'asset/mint'
    )
    SELECT
      ul.token_id,
      ul.data,
      ul."blockTimeUnixMs",
      ul."txHash",
      md.mint_data
    FROM user_listings ul
    LEFT JOIN mint_data md ON ul.token_id = md.token_id
    `,
    [config.marketplaceContract, config.assetContract, userAddress]
  );

  return result.rows.map((row): ListingInfo => {
    const data = row.data || {};
    const mintData = row.mint_data || {};
    return {
      tokenId: row.token_id,
      seller: data.seller || data.owner || userAddress,
      price: data.price?.amount || data.price || '',
      denom: data.price?.denom || data.denom || config.defaultDenom,
      listedAt: parseInt(row.blockTimeUnixMs, 10),
      txHash: row.txHash,
      name: mintData.name || mintData.extension?.name || `Token #${row.token_id}`,
      image: mintData.image || mintData.extension?.image || '',
    };
  });
}

// Get user's owned NFTs
export async function getUserNFTsFromIndexer(userAddress: string): Promise<NFTDetails[]> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  if (!config.assetContract) {
    return [];
  }

  // Get all minted tokens and compute current ownership
  const result = await pool.query(
    `
    WITH minted_tokens AS (
      SELECT
        data->>'token_id' as token_id,
        data as mint_data,
        "blockTimeUnixMs" as minted_at,
        "txHash" as mint_tx_hash
      FROM "Extractions"
      WHERE address = $1
        AND name = 'asset/mint'
    ),
    latest_ownership AS (
      SELECT DISTINCT ON (token_id)
        token_id,
        COALESCE(
          data->>'to',
          data->>'recipient',
          data->>'buyer',
          data->>'owner'
        ) as current_owner
      FROM (
        SELECT
          data->>'token_id' as token_id,
          data,
          "blockTimeUnixMs"
        FROM "Extractions"
        WHERE address = $1
          AND name IN ('asset/mint', 'asset/transfer_nft', 'asset/transfer', 'asset/send_nft', 'marketplace/item-sold', 'marketplace/buy')
      ) ownership_events
      ORDER BY token_id, "blockTimeUnixMs" DESC
    )
    SELECT
      lo.token_id,
      lo.current_owner,
      mt.mint_data,
      mt.minted_at,
      mt.mint_tx_hash
    FROM latest_ownership lo
    JOIN minted_tokens mt ON lo.token_id = mt.token_id
    WHERE lo.current_owner = $2
    ORDER BY mt.minted_at DESC
    `,
    [config.assetContract, userAddress]
  );

  return result.rows.map((row): NFTDetails => {
    const mintData = row.mint_data || {};
    return {
      tokenId: row.token_id,
      name: mintData.name || mintData.extension?.name || `Token #${row.token_id}`,
      description: mintData.description || mintData.extension?.description || '',
      image: mintData.image || mintData.extension?.image || '',
      owner: row.current_owner,
      tokenUri: mintData.token_uri || '',
      mintedAt: parseInt(row.minted_at, 10),
      mintTxHash: row.mint_tx_hash,
    };
  });
}

// Get all NFTs with listing status (for Explore page)
export async function getAllNFTsFromIndexer(
  limit = 100,
  offset = 0
): Promise<NFTWithListingStatus[]> {
  const pool = getPool();
  if (!pool) throw new Error('Indexer not available');

  if (!config.assetContract) {
    return [];
  }

  const result = await pool.query(
    `
    WITH minted_tokens AS (
      SELECT
        data->>'token_id' as token_id,
        data as mint_data,
        "blockTimeUnixMs" as minted_at,
        "txHash" as mint_tx_hash
      FROM "Extractions"
      WHERE address = $1
        AND name = 'asset/mint'
    ),
    latest_ownership AS (
      SELECT DISTINCT ON (token_id)
        token_id,
        COALESCE(
          data->>'to',
          data->>'recipient',
          data->>'buyer',
          data->>'owner'
        ) as current_owner
      FROM (
        SELECT
          data->>'token_id' as token_id,
          data,
          "blockTimeUnixMs"
        FROM "Extractions"
        WHERE address = $1
          AND name IN ('asset/mint', 'asset/transfer_nft', 'asset/transfer', 'asset/send_nft', 'marketplace/item-sold', 'marketplace/buy')
      ) ownership_events
      ORDER BY token_id, "blockTimeUnixMs" DESC
    ),
    latest_listing_events AS (
      SELECT DISTINCT ON (data->>'token_id')
        data->>'token_id' as token_id,
        name as event_name,
        data as listing_data,
        "blockTimeUnixMs" as listed_at
      FROM "Extractions"
      WHERE (address = $1 OR address = $2)
        AND name IN (
          'marketplace/list-item', 'marketplace/delist-item', 'marketplace/cancel-listing',
          'marketplace/item-sold', 'marketplace/buy',
          'asset/list', 'asset/delist', 'asset/buy'
        )
        AND data->>'token_id' IS NOT NULL
      ORDER BY data->>'token_id', "blockTimeUnixMs" DESC
    )
    SELECT
      mt.token_id,
      mt.mint_data,
      mt.minted_at,
      mt.mint_tx_hash,
      lo.current_owner,
      lle.event_name as listing_event,
      lle.listing_data,
      lle.listed_at,
      CASE WHEN lle.event_name IN ('marketplace/list-item', 'asset/list') THEN true ELSE false END as is_listed
    FROM minted_tokens mt
    JOIN latest_ownership lo ON mt.token_id = lo.token_id
    LEFT JOIN latest_listing_events lle ON mt.token_id = lle.token_id
    ORDER BY mt.minted_at DESC
    LIMIT $3 OFFSET $4
    `,
    [config.assetContract, config.marketplaceContract, limit, offset]
  );

  return result.rows.map((row): NFTWithListingStatus => {
    const mintData = row.mint_data || {};
    const listingData = row.listing_data || {};
    return {
      tokenId: row.token_id,
      name: mintData.name || mintData.extension?.name || `Token #${row.token_id}`,
      description: mintData.description || mintData.extension?.description || '',
      image: mintData.image || mintData.extension?.image || '',
      owner: row.current_owner,
      tokenUri: mintData.token_uri || '',
      mintedAt: parseInt(row.minted_at, 10),
      mintTxHash: row.mint_tx_hash,
      isListed: row.is_listed === true,
      price: listingData.price?.amount || listingData.price || undefined,
      denom: listingData.price?.denom || listingData.denom || undefined,
      listedAt: row.listed_at ? parseInt(row.listed_at, 10) : undefined,
    };
  });
}

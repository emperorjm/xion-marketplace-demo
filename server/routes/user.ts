// User-specific API routes
import { Router, Request, Response } from 'express';
import { isIndexerAvailable } from '../db/client.js';
import { getUserListingsFromIndexer, getUserNFTsFromIndexer } from '../services/indexer.js';
import { getUserListingsFromRpc, getUserNFTsFromRpc } from '../services/rpc.js';
import { ApiResponse, ListingInfo, NFTDetails } from '../types.js';
import { config } from '../config.js';

const router = Router();

// GET /api/user/:address/listings - User's active listings
router.get('/:address/listings', async (req: Request, res: Response) => {
  const { address } = req.params;
  const forceRpc = req.query.source === 'rpc';
  const assetContract = (req.query.assetContract as string) || config.assetContract;

  if (!address) {
    res.status(400).json({ error: 'Missing address parameter' });
    return;
  }

  try {
    let data: ListingInfo[];
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getUserListingsFromIndexer(address);
      source = 'indexer';

      // Fallback to RPC if indexer returned empty (e.g., indexer is behind)
      if (data.length === 0) {
        const rpcData = await getUserListingsFromRpc(address, assetContract);
        if (rpcData.length > 0) {
          data = rpcData;
          source = 'rpc';
        }
      }
    } else {
      data = await getUserListingsFromRpc(address, assetContract);
      source = 'rpc';
    }

    const response: ApiResponse<ListingInfo[]> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user listings:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getUserListingsFromRpc(address, assetContract);
        const response: ApiResponse<ListingInfo[]> = {
          data,
          source: 'rpc',
          timestamp: Date.now(),
        };
        res.json(response);
        return;
      } catch {
        // Continue to error response
      }
    }

    res.status(500).json({
      error: 'Failed to fetch user listings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/user/:address/nfts - User's owned NFTs
router.get('/:address/nfts', async (req: Request, res: Response) => {
  const { address } = req.params;
  const forceRpc = req.query.source === 'rpc';
  const assetContract = (req.query.assetContract as string) || config.assetContract;

  if (!address) {
    res.status(400).json({ error: 'Missing address parameter' });
    return;
  }

  try {
    let data: NFTDetails[];
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getUserNFTsFromIndexer(address);
      source = 'indexer';

      // Fallback to RPC if indexer returned empty (e.g., indexer is behind)
      if (data.length === 0) {
        const rpcData = await getUserNFTsFromRpc(address, assetContract);
        if (rpcData.length > 0) {
          data = rpcData;
          source = 'rpc';
        }
      }
    } else {
      data = await getUserNFTsFromRpc(address, assetContract);
      source = 'rpc';
    }

    const response: ApiResponse<NFTDetails[]> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user NFTs:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getUserNFTsFromRpc(address, assetContract);
        const response: ApiResponse<NFTDetails[]> = {
          data,
          source: 'rpc',
          timestamp: Date.now(),
        };
        res.json(response);
        return;
      } catch {
        // Continue to error response
      }
    }

    res.status(500).json({
      error: 'Failed to fetch user NFTs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

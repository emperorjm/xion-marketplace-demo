// Bulk NFT API route
import { Router, Request, Response } from 'express';
import { isIndexerAvailable } from '../db/client.js';
import { getAllNFTsFromIndexer } from '../services/indexer.js';
import { getAllNFTsFromRpc } from '../services/rpc.js';
import { ApiResponse, NFTWithListingStatus } from '../types.js';
import { config } from '../config.js';

const router = Router();

// GET /api/nfts - All NFTs with listing status
router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const forceRpc = req.query.source === 'rpc';
  const assetContract = (req.query.assetContract as string) || config.assetContract;

  try {
    let data: NFTWithListingStatus[];
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getAllNFTsFromIndexer(limit, offset);
      source = 'indexer';
    } else {
      data = await getAllNFTsFromRpc(limit, offset, assetContract);
      source = 'rpc';
    }

    const response: ApiResponse<NFTWithListingStatus[]> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching NFTs:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getAllNFTsFromRpc(limit, offset, assetContract);
        const response: ApiResponse<NFTWithListingStatus[]> = {
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
      error: 'Failed to fetch NFTs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

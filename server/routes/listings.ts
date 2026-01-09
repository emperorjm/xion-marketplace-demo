// GET /api/listings - Active marketplace listings
import { Router, Request, Response } from 'express';
import { isIndexerAvailable } from '../db/client.js';
import { getListingsFromIndexer } from '../services/indexer.js';
import { getListingsFromRpc } from '../services/rpc.js';
import { ApiResponse, ListingInfo } from '../types.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const forceRpc = req.query.source === 'rpc';

  try {
    let data: ListingInfo[];
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getListingsFromIndexer();
      source = 'indexer';
    } else {
      data = await getListingsFromRpc();
      source = 'rpc';
    }

    const response: ApiResponse<ListingInfo[]> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching listings:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getListingsFromRpc();
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
      error: 'Failed to fetch listings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

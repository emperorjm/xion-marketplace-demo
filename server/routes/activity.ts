// GET /api/activity - Transaction history
import { Router, Request, Response } from 'express';
import { isIndexerAvailable } from '../db/client.js';
import { getActivityFromIndexer } from '../services/indexer.js';
import { getActivityFromRpc } from '../services/rpc.js';
import { ApiResponse, ActivityItem } from '../types.js';
import { config } from '../config.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const forceRpc = req.query.source === 'rpc';
  const assetContract = (req.query.assetContract as string) || config.assetContract;

  try {
    let data: ActivityItem[];
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getActivityFromIndexer(limit, offset);
      source = 'indexer';
    } else {
      data = await getActivityFromRpc(limit, offset, assetContract);
      source = 'rpc';
    }

    const response: ApiResponse<ActivityItem[]> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching activity:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getActivityFromRpc(limit, offset, assetContract);
        const response: ApiResponse<ActivityItem[]> = {
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
      error: 'Failed to fetch activity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

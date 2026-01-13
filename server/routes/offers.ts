// GET /api/offers/:tokenId - Offers for a specific token
import { Router, Request, Response } from 'express';
import { isIndexerAvailable } from '../db/client.js';
import { getOffersFromIndexer } from '../services/indexer.js';
import { getOffersFromRpc } from '../services/rpc.js';
import { ApiResponse, OfferInfo } from '../types.js';

const router = Router();

router.get('/:tokenId', async (req: Request, res: Response) => {
  const { tokenId } = req.params;
  const forceRpc = req.query.source === 'rpc';

  if (!tokenId) {
    res.status(400).json({
      error: 'Missing tokenId parameter',
    });
    return;
  }

  try {
    let data: OfferInfo[];
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getOffersFromIndexer(tokenId);
      source = 'indexer';

      // Fallback to RPC if indexer returned empty (e.g., indexer is behind)
      if (data.length === 0) {
        const rpcData = await getOffersFromRpc(tokenId);
        if (rpcData.length > 0) {
          data = rpcData;
          source = 'rpc';
        }
      }
    } else {
      data = await getOffersFromRpc(tokenId);
      source = 'rpc';
    }

    const response: ApiResponse<OfferInfo[]> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching offers:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getOffersFromRpc(tokenId);
        const response: ApiResponse<OfferInfo[]> = {
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
      error: 'Failed to fetch offers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

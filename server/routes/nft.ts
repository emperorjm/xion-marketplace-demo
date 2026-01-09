// GET /api/nft/:tokenId - NFT details
import { Router, Request, Response } from 'express';
import { isIndexerAvailable } from '../db/client.js';
import { getNFTFromIndexer } from '../services/indexer.js';
import { getNFTFromRpc } from '../services/rpc.js';
import { ApiResponse, NFTDetails } from '../types.js';

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
    let data: NFTDetails | null;
    let source: 'indexer' | 'rpc';

    if (!forceRpc && isIndexerAvailable()) {
      data = await getNFTFromIndexer(tokenId);
      source = 'indexer';
    } else {
      data = await getNFTFromRpc(tokenId);
      source = 'rpc';
    }

    if (!data) {
      res.status(404).json({
        error: 'NFT not found',
        tokenId,
      });
      return;
    }

    const response: ApiResponse<NFTDetails> = {
      data,
      source,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching NFT:', error);

    // Try RPC fallback if indexer fails
    if (isIndexerAvailable()) {
      try {
        const data = await getNFTFromRpc(tokenId);
        if (data) {
          const response: ApiResponse<NFTDetails> = {
            data,
            source: 'rpc',
            timestamp: Date.now(),
          };
          res.json(response);
          return;
        }
      } catch {
        // Continue to error response
      }
    }

    res.status(500).json({
      error: 'Failed to fetch NFT',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

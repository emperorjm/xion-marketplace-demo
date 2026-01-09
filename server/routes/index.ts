// Route aggregator
import { Router } from 'express';
import activityRouter from './activity.js';
import listingsRouter from './listings.js';
import offersRouter from './offers.js';
import nftRouter from './nft.js';
import userRouter from './user.js';
import nftsRouter from './nfts.js';

const router = Router();

router.use('/activity', activityRouter);
router.use('/listings', listingsRouter);
router.use('/offers', offersRouter);
router.use('/nft', nftRouter);
router.use('/user', userRouter);
router.use('/nfts', nftsRouter);

export default router;

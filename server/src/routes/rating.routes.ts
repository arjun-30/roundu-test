import { Router } from 'express';
import * as ratingController from '../controllers/rating.controller';

const router = Router();

router.post('/', ratingController.submitRating);
router.get('/provider/:providerId', ratingController.getProviderRatings);

export default router;

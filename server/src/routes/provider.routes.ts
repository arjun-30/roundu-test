import { Router } from 'express';
import { getProviderDashboard, searchProviders, registerProvider } from '../controllers/provider.controller';

const router = Router();

router.get('/dashboard', getProviderDashboard);
router.get('/search', searchProviders);
router.post('/register', registerProvider);

export default router;

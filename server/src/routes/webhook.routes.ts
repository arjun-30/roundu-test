import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

router.post('/cashfree', WebhookController.handleCashfreeWebhook);

export default router;

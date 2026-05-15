import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

router.post('/setu', WebhookController.handleSetuWebhook);

export default router;

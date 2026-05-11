import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';

const router = Router();

router.post('/presigned', uploadController.getPresignedUrl);

export default router;

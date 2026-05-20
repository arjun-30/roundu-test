import { Router } from 'express';
import { KycController } from '../controllers/kyc.controller';
import { authenticate } from '../middleware/auth';
import { requireProvider } from '../middleware/requireProvider';

const router = Router();

// Protect all KYC routes with auth
router.use(authenticate);

// Aadhaar DigiLocker
router.post('/aadhaar/init', KycController.initDigilocker);
router.post('/aadhaar/verify', KycController.verifyDigilocker);

// PAN Verification
router.post('/pan/verify', KycController.verifyPan);

// Bank Account Verification
router.post('/bav/init', KycController.initBankVerify);
router.get('/bav/:requestId', KycController.getBankVerifyStatus);

// Complete
router.post('/complete', KycController.markKycComplete);

export default router;

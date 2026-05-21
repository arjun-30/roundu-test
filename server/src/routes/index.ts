import { Router } from 'express';
import trackingRouter from './tracking.routes';
import referralRouter from './referral.routes';
import authRouter from './auth.routes';
import userRouter from './user.routes';
import providerRouter from './provider.routes';
import bookingRouter from './booking.routes';
import paymentRouter from './payment.routes';
import uploadRouter from './upload.routes';
import kycRouter from './kyc.routes';
import webhookRouter from './webhook.routes';
import chatRouter from './chat.routes';

const router = Router();

router.use('/chat', chatRouter);

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/providers', providerRouter);
router.use('/bookings', bookingRouter);
router.use('/payments', paymentRouter);
router.use('/tracking', trackingRouter);
router.use('/referrals', referralRouter);
router.use('/upload', uploadRouter);
router.use('/kyc', kycRouter);
router.use('/webhooks', webhookRouter);

export default router;

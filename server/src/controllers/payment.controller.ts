import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { WalletModel } from '../models/wallet.model';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  })
  : null;

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Amount validation: must be at least 100 paise (1 INR)
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least 1 INR' });
    }

    const options = {
      amount: amountInPaise,
      currency,
      receipt,
    };

    if (!razorpay) {
      return res.status(503).json({ success: false, message: 'Payments not configured' });
    }

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ success: false, message: 'Payment initialization failed' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      providerId,
      amount
    } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const secret = env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');
    if (expectedSignature === razorpay_signature) {
      const walletModel = new WalletModel(getPool());

      const providerSharePaise = Math.round(amount * 0.85 * 100);

      await walletModel.findOrCreate(providerId);

      await walletModel.credit(
        providerId,
        providerSharePaise
      );
      return res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
};

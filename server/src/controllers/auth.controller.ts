import { Request, Response } from 'express';
import * as msg91 from '../services/msg91.service';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { ProviderModel } from '../models/provider.model';
import { AuthService } from '../services/auth.service';
import { signAccessToken, UserRole } from '../utils/jwt';

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // 1. Generate OTP and store hash in DB
    const otp = await AuthService.generateOTP(phone);

    // 2. Send via MSG91 (using custom OTP)
    await msg91.sendOTP(phone, otp);

    // In dev mode without SMS configured we still log the OTP to the server console
    // but we do NOT return it in the API response to avoid relying on navigation state.
    const smsConfigured = Boolean(env.MSG91_AUTH_KEY);
    if (!smsConfigured && env.NODE_ENV !== 'production') {
      console.log(`[auth] DEV OTP for ${phone}: ${otp}`);
    }
    res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const result = await AuthService.verifyOTP(phone, otp);
    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    // DB: Find or create user
    let isNewUser = false;
    let user = await UserModel.findByPhone(phone);
    if (!user) {
      isNewUser = true;
      user = await UserModel.create({ phone });
    }

    const provider = await ProviderModel.findByUserId(user.id);
    const providerExists = !!provider;
    const customerExists = user.role === 'customer' && !isNewUser;

    // Single-device session enforcement
    // 1. Tell existing active devices to logout via Socket.IO
    const io = req.app.locals.io;
    if (io) {
      io.to(`user:${user.id}`).emit('session_expired', { reason: 'Logged in from another device' });
      console.log(`[auth] Emitted session_expired to user:${user.id}`);
    }

    // 2. Increment session_version in DB to invalidate old JWTs API access
    const newSessionVersion = await UserModel.incrementSessionVersion(user.id);

    // Create JWT with the new session version
    const token = signAccessToken(
      { sub: user.id, role: (user.role || 'customer') as UserRole, phone, v: newSessionVersion },
      '7d',
    );

    res.json({
      success: true,
      message: 'Verified',
      token,
      user,
      providerExists,
      customerExists,
      isNewUser,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyWidgetToken = async (req: Request, res: Response) => {
  // Keeping for backward compatibility during transition
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

    const result = await msg91.verifyWidgetToken(accessToken);
    const mobile = result.mobile_number || 'unknown';

    let user = await UserModel.findByPhone(mobile);
    if (!user) {
      user = await UserModel.create({ phone: mobile });
    }

    const io = req.app.locals.io;
    if (io) {
      io.to(`user:${user.id}`).emit('session_expired', { reason: 'Logged in from another device' });
    }
    const newSessionVersion = await UserModel.incrementSessionVersion(user.id);

    const token = signAccessToken(
      { sub: user.id, role: ((user as any).role || 'customer') as UserRole, phone: mobile, v: newSessionVersion },
      '7d',
    );

    res.json({ success: true, message: 'Verified', token, mobile, user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

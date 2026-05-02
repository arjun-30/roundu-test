import { Request, Response } from 'express';
import * as msg91 from '../services/msg91.service';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { AuthService } from '../services/auth.service';

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // 1. Generate OTP and store hash in DB
    const otp = await AuthService.generateOTP(phone);

    // 2. Send via MSG91 (using custom OTP)
    await msg91.sendOTP(phone, otp); 

    res.json({ success: true, message: 'OTP sent successfully' });
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

    // DB: Find or Create User
    let user = await UserModel.findByPhone(phone);
    if (!user) {
      user = await UserModel.create({ phone, role: 'customer' });
    }
    
    // Create JWT
    const token = jwt.sign(
      { id: user.id, phone: phone, role: user.role }, 
      env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '7d' }
    );

    res.json({ success: true, message: 'Verified', token, user });
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
    
    const token = jwt.sign({ id: user.id, phone: mobile }, env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.json({ success: true, message: 'Verified', token, mobile, user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};


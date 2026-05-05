import { Request, Response } from 'express';
import { ProviderModel } from '../models/provider.model';

export const getProviderDashboard = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query; // In real app, this comes from JWT
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

    const provider = await ProviderModel.findByUserId(userId as string);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider profile not found' });

    const stats = await ProviderModel.getStats(provider.id);

    res.json({
      success: true,
      data: {
        provider,
        stats
      }
    });
  } catch (error) {
    console.error('Provider dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const searchProviders = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) return res.status(400).json({ success: false, message: 'Service ID required' });

    const providers = await ProviderModel.findByServiceId(serviceId as string);
    
    // In a real app, we would join with users table to get names
    // For now, let's assume ProviderModel.findByServiceId returns enriched data
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Search providers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const registerProvider = async (req: Request, res: Response) => {
  try {
    const { userId, bio, experienceYears, workingHours, serviceRadius, serviceIds } = req.body;
    
    if (!userId || !serviceIds || serviceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const provider = await ProviderModel.register(userId, {
      bio: bio || '',
      experienceYears: experienceYears || 1,
      workingHours: workingHours || '9 AM - 6 PM',
      serviceRadius: serviceRadius || 5,
      serviceIds
    });

    res.status(201).json({ success: true, data: provider, message: 'Provider registered successfully' });
  } catch (error) {
    console.error('Register provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to register provider' });
  }
};

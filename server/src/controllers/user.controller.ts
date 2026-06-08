import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceIds, ...userData } = req.body;
    
    // Update the main user record
    const user = await UserModel.update(id, userData);

    // If serviceIds is provided, sync services for the provider profile
    if (serviceIds && Array.isArray(serviceIds)) {
      const { getPool } = require('../config/database');
      const pool = getPool();
      
      // Find provider associated with this user ID
      const providerRes = await pool.query('SELECT id FROM providers WHERE user_id = $1', [id]);
      const providerRow = providerRes.rows[0];
      
      if (providerRow) {
        const providerId = providerRow.id;
        
        // 1. Delete old associations
        await pool.query('DELETE FROM provider_services WHERE provider_id = $1', [providerId]);
        
        // 2. Insert new associations
        if (serviceIds.length > 0) {
          for (const serviceId of serviceIds) {
            await pool.query(
              'INSERT INTO provider_services (provider_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [providerId, serviceId]
            );
          }
        }
        
        // 3. Retrieve service labels
        let serviceCategories: string[] = [];
        if (serviceIds.length > 0) {
          const sRes = await pool.query(
            'SELECT label FROM services WHERE id = ANY($1)',
            [serviceIds]
          );
          serviceCategories = sRes.rows.map((r: any) => r.label);
        }
        
        // 4. Update service_category on providers table
        await pool.query(
          'UPDATE providers SET service_category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [serviceCategories, providerId]
        );
        
        console.log(`[updateUser] Successfully updated services for provider ${providerId}:`, serviceCategories);
      }
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('[user.controller] error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // In a real app, you might want to verify that the logged-in user is deleting their own account
    // or use req.user.id from the auth middleware.
    await UserModel.delete(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[user.controller] error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


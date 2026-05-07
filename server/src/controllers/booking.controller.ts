import { Request, Response } from 'express';
import { BookingModel } from '../models/booking.model';
import { ProviderModel } from '../models/provider.model';
import { NotificationModel } from '../models/notification.model';

export const createBooking = async (req: Request, res: Response) => {
  try {
    const bookingData = { ...req.body };
    
    // The frontend might send users.id instead of providers.id for the quote.
    // Try to resolve it to a providers.id if it matches a user.
    if (bookingData.provider_id) {
      const provider = await ProviderModel.findByUserId(bookingData.provider_id);
      if (provider) {
        bookingData.provider_id = provider.id;
      }
    }

    const booking = await BookingModel.create(bookingData);
    
    // Notify relevant providers
    if (booking.service_id) {
      const providers = await ProviderModel.findByServiceId(booking.service_id);
      
      const notifications = providers.map(p => ({
        user_id: p.user_id,
        title: 'New Job Request',
        message: `New job request for ${booking.service_id} at ${booking.address}`,
        type: 'booking'
      }));

      // In a real app, we would use a batch insert or a loop
      for (const n of notifications) {
        await NotificationModel.create(n);
      }
      
      // Real-time notification via Socket.io
      // Provide the booking directly to all connected clients, but clients filter by provider_id
      req.app.locals.io.emit('job_accepted', { ...booking, provider_user_id: req.body.provider_id });
    }

    res.json({ success: true, data: booking });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message, stack: error.stack });
  }
};

export const getCustomerBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModel.findByCustomerId(req.params.id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProviderBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModel.findByProviderId(req.params.id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

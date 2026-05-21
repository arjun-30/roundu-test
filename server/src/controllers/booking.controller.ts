import { Request, Response } from 'express';
import { BookingModel } from '../models/booking.model';
import { ProviderModel } from '../models/provider.model';
import { NotificationModel } from '../models/notification.model';
import { isProviderBusy, checkScheduleConflict } from '../utils/bookingHelper';

export const createBooking = async (req: Request, res: Response) => {
  try {
    const bookingData = { ...req.body };

    // Normalize and sanitize scheduled_at dynamically to prevent timezone offset shifts
    if (bookingData.scheduled_at) {
      const parsedDate = new Date(bookingData.scheduled_at);
      if (!isNaN(parsedDate.getTime())) {
        bookingData.scheduled_at = parsedDate.toISOString();
      } else {
        // Fallback for custom formats: e.g. "YYYY-MM-DD hh:mm AM/PM"
        const matches = String(bookingData.scheduled_at).match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}\s+(?:AM|PM|am|pm))$/i);
        if (matches) {
          try {
            const datePart = matches[1];
            const timePart = matches[2].toUpperCase();
            const [time, modifier] = timePart.split(" ");
            let [hoursStr, minutesStr] = time.split(":");
            let hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);
            if (modifier === "PM" && hours < 12) hours += 12;
            else if (modifier === "AM" && hours === 12) hours = 0;
            
            const [year, month, day] = datePart.split("-").map((num) => parseInt(num, 10));
            const localDateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
            if (!isNaN(localDateObj.getTime())) {
              bookingData.scheduled_at = localDateObj.toISOString();
            }
          } catch (e) {
            console.error("Sanitization fallback parser error:", e);
          }
        }
      }
    }
    
    // The frontend might send users.id instead of providers.id for the quote.
    // Try to resolve it to a providers.id if it matches a user.
    if (bookingData.provider_id) {
      const provider = await ProviderModel.findByUserId(bookingData.provider_id);
      const providerId = provider ? provider.id : bookingData.provider_id;
      bookingData.provider_id = providerId;

      // 1. Check if provider is currently busy
      const isBusy = await isProviderBusy(providerId);
      if (isBusy) {
        return res.status(400).json({
          success: false,
          message: 'Provider is currently busy on an active job.'
        });
      }

      // 2. Check if provider has a schedule conflict
      if (bookingData.scheduled_at) {
        const proposedStart = new Date(bookingData.scheduled_at);
        const proposedDuration = bookingData.duration || 2;
        const conflictCheck = await checkScheduleConflict(providerId, proposedStart, proposedDuration);
        if (conflictCheck.conflict) {
          return res.status(400).json({
            success: false,
            message: conflictCheck.message || 'Schedule conflict: Provider has another booking at this time.'
          });
        }
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

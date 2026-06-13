import { Request, Response } from 'express';
import { BookingModel } from '../models/booking.model';
import { ProviderModel, matchesServiceCategory } from '../models/provider.model';
import { NotificationModel } from '../models/notification.model';
import { isProviderBusy, checkScheduleConflict } from '../utils/bookingHelper';
import { logProviderDecision } from '../utils/logger';


export const createBooking = async (req: Request, res: Response) => {
  try {
    console.log("========== CREATE BOOKING ==========");
    console.log("BODY:", JSON.stringify(req.body, null, 2));
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

    // Validate provider exists and check for schedule conflicts
    if (bookingData.provider_id) {
      try {
        const provider = await ProviderModel.findById(bookingData.provider_id);
        if (provider) {
          // Check if provider has a schedule conflict
          if (bookingData.scheduled_at) {
            const proposedStart = new Date(bookingData.scheduled_at);
            const proposedDuration = bookingData.duration || 2;
            const conflictCheck = await checkScheduleConflict(provider.id, proposedStart, proposedDuration);
            if (conflictCheck.conflict) {
              return res.status(400).json({
                success: false,
                message: conflictCheck.message || 'Schedule conflict: Provider has another booking at this time.'
              });
            }
          }
        } else {
          console.warn(`Provider not found for id=${bookingData.provider_id}`);
          return res.status(400).json({
            success: false,
            message: 'Invalid provider. Please try again.'
          });
        }
      } catch (err: any) {
        console.error('Error validating provider_id:', err.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid provider. Please try again.'
        });
      }
    }

    console.log("FINAL BOOKING DATA:");
    console.log(JSON.stringify(bookingData, null, 2));

    const booking = await BookingModel.create(bookingData);

    console.log("BOOKING CREATED:");
    console.log(booking);
    // Notify relevant providers
    if (booking.service_id) {
      const providers = await ProviderModel.findByServiceId(booking.service_id);

      // Get service label
      const { getPool } = require('../config/database');
      const sRes = await getPool().query('SELECT label FROM services WHERE id = $1', [booking.service_id]);
      const serviceLabel = sRes.rows[0]?.label || booking.service_id;

      // Get customer coordinates
      let customerLat = req.body.lat ?? null;
      let customerLng = req.body.lng ?? null;
      if (customerLat == null || customerLng == null) {
        const cRes = await getPool().query('SELECT lat, lng FROM users WHERE id = $1', [booking.customer_id]);
        if (cRes.rows[0]) {
          customerLat = cRes.rows[0].lat ? Number(cRes.rows[0].lat) : null;
          customerLng = cRes.rows[0].lng ? Number(cRes.rows[0].lng) : null;
        }
      }

      const matchingProviders = [];
      for (const p of providers) {
        const isOnline = p.is_online === true;
        const isApproved = (p.is_verified === true || process.env.NODE_ENV !== 'production') && p.is_active !== false && p.approval_status !== 'rejected';
        const matchesCategory = matchesServiceCategory(p.serviceCategory, booking.service_id) || 
                                matchesServiceCategory(p.serviceCategory, serviceLabel);

        let inRadius = true;
        let dist = 0;
        let plat = p.lat ? Number(p.lat) : null;
        let plng = p.lng ? Number(p.lng) : null;

        if (plat == null || plng == null) {
          const uRes = await getPool().query('SELECT lat, lng FROM users WHERE id = $1', [p.user_id]);
          if (uRes.rows[0]) {
            plat = uRes.rows[0].lat ? Number(uRes.rows[0].lat) : null;
            plng = uRes.rows[0].lng ? Number(uRes.rows[0].lng) : null;
          }
        }

        if (customerLat != null && customerLng != null && plat != null && plng != null) {
          const { getDistanceKm } = require('../utils/locationHelper');
          dist = getDistanceKm({ lat: customerLat, lng: customerLng }, { lat: plat, lng: plng });
          const maxRadius = p.serviceRadius || 20;
          inRadius = dist <= maxRadius;
        } else {
          inRadius = process.env.NODE_ENV !== 'production';
        }

        let decision = "ACCEPTED";
        if (!isOnline) {
          decision = "REJECTED (Offline)";
        } else if (!isApproved) {
          decision = "REJECTED (Unverified)";
        } else if (!matchesCategory) {
          decision = "REJECTED (Category mismatch)";
        } else if (!inRadius) {
          decision = "REJECTED (Outside radius)";
        }

        logProviderDecision({
          requestedCategory: serviceLabel,
          providerId: p.id,
          providerName: p.name || "Unknown",
          providerCategories: p.serviceCategory || [],
          onlineStatus: isOnline,
          distance: dist,
          verificationStatus: isApproved,
          decision
        });

        if (isOnline && isApproved && matchesCategory && inRadius) {
          matchingProviders.push(p);
        }
      }

      const notifications = matchingProviders.map(p => ({
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
    console.error('Create booking error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Booking failed. Please try again.';
    
    if (error.code === '23505') {
      errorMessage = 'This booking already exists.';
    } else if (error.message?.includes('violates foreign key')) {
      errorMessage = 'Invalid provider or service. Please try again.';
    } else if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      errorMessage = 'Server configuration error. Please contact support.';
    } else if (process.env.NODE_ENV === 'development') {
      errorMessage = error.message || 'Booking failed.';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export const getCustomerBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModel.findByCustomerId(req.params.id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('getCustomerBookings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProviderBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModel.findByProviderId(req.params.id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('getProviderBookings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

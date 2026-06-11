import { getPool } from '../config/database';

export async function getProviderActiveBookings(providerId: string): Promise<any[]> {
  const res = await getPool().query(
    `SELECT * FROM bookings 
     WHERE provider_id = $1 
       AND status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress')`,
    [providerId]
  );

  const now = new Date();
  return res.rows.filter(booking => {
    const timeRef = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
    // No date = can't determine overlap → treat as NOT busy (don't block the provider)
    if (!timeRef || isNaN(timeRef.getTime())) return false;

    const ageHours = (now.getTime() - timeRef.getTime()) / (1000 * 60 * 60);
    // Ignore jobs scheduled more than 24 hours in the past
    return ageHours <= 24;
  });
}

export async function isProviderBusy(providerId: string): Promise<boolean> {
  const activeBookings = await getProviderActiveBookings(providerId);
  const now = new Date();
  
  for (const booking of activeBookings) {
    if (['on_the_way', 'arrived', 'in_progress'].includes(booking.status)) {
      return true;
    }
    if (['assigned', 'accepted'].includes(booking.status)) {
      const start = new Date(booking.scheduled_at);
      if (isNaN(start.getTime())) continue;
      const durationHours = booking.duration || 2;
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
      if (now >= start && now <= end) {
        return true;
      }
    }
  }
  return false;
}

export async function checkScheduleConflict(
  providerId: string,
  proposedStart: Date,
  proposedDurationHours: number
): Promise<{ conflict: boolean; message?: string }> {

  const now = new Date();

  const hoursDiff =
    (proposedStart.getTime() - now.getTime()) /
    (1000 * 60 * 60);

  // Allow any scheduled job that is 6+ hours away
  if (hoursDiff >= 6) {
    return { conflict: false };
  }

  const activeBookings =
    await getProviderActiveBookings(providerId);

  const proposedEnd = new Date(
    proposedStart.getTime() +
    proposedDurationHours * 60 * 60 * 1000
  );

  for (const booking of activeBookings) {

    if (!booking.scheduled_at) continue;

    const bookingStart = new Date(
      booking.scheduled_at
    );

    if (isNaN(bookingStart.getTime())) continue;

    const bookingDurationHours =
      booking.duration || 2;

    const bookingEnd = new Date(
      bookingStart.getTime() +
      bookingDurationHours * 60 * 60 * 1000
    );

    if (
      bookingStart < proposedEnd &&
      proposedStart < bookingEnd
    ) {
      return {
        conflict: true,
        message:
          `Schedule conflict: You have another job from ${bookingStart.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
          } to ${bookingEnd.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
          }.`
      };
    }
  }

  return { conflict: false };
}

export function parseDateTime(dateStr: string, timeStr: string): Date {
  if (!dateStr) return new Date();
  if (!timeStr || timeStr.toLowerCase() === 'now') {
    return new Date();
  }

  try {
    const combinedStr = `${dateStr} ${timeStr}`;
    const parsed = new Date(combinedStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) { }

  return new Date();
}

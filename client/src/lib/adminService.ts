import { supabase } from "./supabase";

/**
 * Admin Service - Handles all admin-related database operations
 * Provides centralized, reusable functions for admin dashboard and management pages
 */

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingVerifications: number;
  cancelledBookings: number;
}

export interface DailyBookingData {
  date: string;
  bookings: number;
  revenue: number;
}

export interface BookingStatus {
  name: string;
  value: number;
}

export interface ServiceBreakdown {
  service: string;
  count: number;
}

export interface RecentBooking {
  id: string;
  customer_name: string;
  provider_name: string;
  service_type: string;
  status: string;
  price: number;
  created_at: string;
}

const ACTIVE_STATUSES = ["assigned", "on_the_way", "arrived", "in_progress"];

/**
 * Fetch comprehensive admin dashboard statistics
 * Includes: users, providers, bookings, revenue, verifications
 */
export async function fetchAdminStats(): Promise<{
  stats: AdminStats;
  dailyData: DailyBookingData[];
  statusData: BookingStatus[];
  serviceData: ServiceBreakdown[];
  recentBookings: RecentBooking[];
  error?: string;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const since14 = new Date(Date.now() - 14 * 864e5).toISOString();

    console.log("[AdminService] Fetching stats for date:", today);

    const [
      { count: totalUsers, error: usersErr },
      { count: totalProviders, error: providersErr },
      { count: totalBookings, error: bookingsErr },
      { count: activeBookings, error: activeErr },
      { count: pendingVerifications, error: pendingErr },
      { count: cancelledBookings, error: cancelledErr },
      { data: completedBookings, error: completedErr },
      { data: todayBookingsRaw, error: todayErr },
      { data: last14Bookings, error: last14Err },
      { data: recentRaw, error: recentErr },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("providers").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
      supabase.from("providers").select("*", { count: "exact", head: true }).eq("is_verified", false),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
      supabase.from("bookings").select("price").eq("status", "completed"),
      supabase.from("bookings").select("price").gte("created_at", today).eq("status", "completed"),
      supabase.from("bookings").select("created_at,price,status,service_type").gte("created_at", since14),
      supabase.from("bookings").select("id,status,price,created_at,service_type,users(full_name),providers(full_name)").order("created_at", { ascending: false }).limit(10),
    ]);

    // Log any errors encountered
    if (usersErr) console.warn("[AdminService] Users error:", usersErr);
    if (providersErr) console.warn("[AdminService] Providers error:", providersErr);
    if (bookingsErr) console.warn("[AdminService] Bookings error:", bookingsErr);
    if (activeErr) console.warn("[AdminService] Active bookings error:", activeErr);
    if (pendingErr) console.warn("[AdminService] Pending verifications error:", pendingErr);
    if (cancelledErr) console.warn("[AdminService] Cancelled bookings error:", cancelledErr);
    if (completedErr) console.warn("[AdminService] Completed bookings error:", completedErr);
    if (todayErr) console.warn("[AdminService] Today bookings error:", todayErr);
    if (last14Err) console.warn("[AdminService] Last 14 days error:", last14Err);
    if (recentErr) console.warn("[AdminService] Recent bookings error:", recentErr);

    const totalRevenue = (completedBookings ?? []).reduce(
      (s: number, b: { price?: number }) => s + (b.price ?? 0),
      0
    );
    const todayRevenue = (todayBookingsRaw ?? []).reduce(
      (s: number, b: { price?: number }) => s + (b.price ?? 0),
      0
    );

    const stats: AdminStats = {
      totalUsers: totalUsers ?? 0,
      totalProviders: totalProviders ?? 0,
      totalBookings: totalBookings ?? 0,
      activeBookings: activeBookings ?? 0,
      totalRevenue,
      todayRevenue,
      pendingVerifications: pendingVerifications ?? 0,
      cancelledBookings: cancelledBookings ?? 0,
    };

    console.log("[AdminService] Stats calculated:", stats);

    // Daily data
    const dayMap: Record<string, DailyBookingData> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().split("T")[0];
      dayMap[d] = { date: d.slice(5), bookings: 0, revenue: 0 };
    }
    (last14Bookings ?? []).forEach((b: { created_at: string; price?: number }) => {
      const d = b.created_at.split("T")[0];
      if (dayMap[d]) {
        dayMap[d].bookings++;
        dayMap[d].revenue += b.price ?? 0;
      }
    });
    const dailyData = Object.values(dayMap);

    // Status breakdown
    const statusCount: Record<string, number> = {};
    (last14Bookings ?? []).forEach((b: { status: string }) => {
      const grp = ACTIVE_STATUSES.includes(b.status) ? "active" : b.status;
      statusCount[grp] = (statusCount[grp] ?? 0) + 1;
    });
    const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

    // Service breakdown
    const svcCount: Record<string, number> = {};
    (last14Bookings ?? []).forEach((b: { service_type?: string }) => {
      const s = b.service_type ?? "Unknown";
      svcCount[s] = (svcCount[s] ?? 0) + 1;
    });
    const serviceData = Object.entries(svcCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));

    // Recent bookings
    const recentBookings: RecentBooking[] = (recentRaw ?? []).map((b: Record<string, unknown>) => ({
      id: String(b.id ?? ""),
      customer_name: (b.users as { full_name?: string } | null)?.full_name ?? "—",
      provider_name: (b.providers as { full_name?: string } | null)?.full_name ?? "—",
      service_type: String(b.service_type ?? "—"),
      status: String(b.status ?? ""),
      price: Number(b.price ?? 0),
      created_at: String(b.created_at ?? ""),
    }));

    return { stats, dailyData, statusData, serviceData, recentBookings };
  } catch (error: any) {
    console.error("[AdminService] Fatal error fetching stats:", error);
    return {
      stats: {
        totalUsers: 0,
        totalProviders: 0,
        totalBookings: 0,
        activeBookings: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        pendingVerifications: 0,
        cancelledBookings: 0,
      },
      dailyData: [],
      statusData: [],
      serviceData: [],
      recentBookings: [],
      error: `Error: ${error.message}`,
    };
  }
}

/**
 * Update provider verification status
 */
export async function updateProviderVerification(
  providerId: string,
  isVerified: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[AdminService] Updating provider ${providerId} verification to ${isVerified}`);
    const { error } = await supabase
      .from("providers")
      .update({ is_verified: isVerified })
      .eq("id", providerId);

    if (error) {
      console.error("[AdminService] Error updating provider verification:", error);
      return { success: false, error: error.message };
    }

    console.log(`[AdminService] Provider ${providerId} verification updated successfully`);
    return { success: true };
  } catch (error: any) {
    console.error("[AdminService] Exception updating provider verification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending provider verifications count
 */
export async function getPendingVerificationsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("providers")
      .select("*", { count: "exact", head: true })
      .eq("is_verified", false);

    if (error) {
      console.error("[AdminService] Error getting pending verifications:", error);
      return 0;
    }

    return count ?? 0;
  } catch (error: any) {
    console.error("[AdminService] Exception getting pending verifications:", error);
    return 0;
  }
}

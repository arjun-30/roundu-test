import { supabase } from "./supabase";

/**
 * Notification Service - Handles all notification-related database operations
 * Provides database-driven notification management instead of mock data
 */

export interface DatabaseNotification {
  id: string;
  title: string;
  message: string;
  type: "provider_registration" | "provider_approved" | "provider_rejected" | "booking_created" | "booking_cancelled" | "refund_requested" | "payment_completed" | "general";
  user_id?: string;
  provider_id?: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, any>;
}

/**
 * Fetch all notifications for a user (or all if no user_id provided)
 * Orders by created_at DESC to show newest first
 */
export async function fetchNotifications(
  userId?: string,
  limit: number = 50
): Promise<DatabaseNotification[]> {
  try {
    console.log(`[NotificationService] Fetching notifications for user: ${userId || "all"}`);
    
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[NotificationService] Error fetching notifications:", error);
      return [];
    }

    console.log(`[NotificationService] Fetched ${data?.length ?? 0} notifications`);
    return data ?? [];
  } catch (error: any) {
    console.error("[NotificationService] Exception fetching notifications:", error);
    return [];
  }
}

/**
 * Create a new notification
 */
export async function createNotification(
  notification: Omit<DatabaseNotification, "id" | "created_at" | "is_read">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log("[NotificationService] Creating notification:", notification.title);
    
    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          ...notification,
          created_at: new Date().toISOString(),
          is_read: false,
        },
      ])
      .select("id");

    if (error) {
      console.error("[NotificationService] Error creating notification:", error);
      return { success: false, error: error.message };
    }

    const notificationId = data?.[0]?.id;
    console.log("[NotificationService] Notification created with ID:", notificationId);
    return { success: true, id: notificationId };
  } catch (error: any) {
    console.error("[NotificationService] Exception creating notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    console.log(`[NotificationService] Marking notification ${notificationId} as read`);
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("[NotificationService] Error marking notification as read:", error);
      return false;
    }

    console.log(`[NotificationService] Notification ${notificationId} marked as read`);
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  try {
    console.log(`[NotificationService] Marking all notifications as read for user ${userId}`);
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("[NotificationService] Error marking all as read:", error);
      return false;
    }

    console.log(`[NotificationService] All notifications marked as read for user ${userId}`);
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception marking all as read:", error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    console.log(`[NotificationService] Deleting notification ${notificationId}`);
    
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("[NotificationService] Error deleting notification:", error);
      return false;
    }

    console.log(`[NotificationService] Notification ${notificationId} deleted`);
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception deleting notification:", error);
    return false;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("[NotificationService] Error getting unread count:", error);
      return 0;
    }

    return count ?? 0;
  } catch (error: any) {
    console.error("[NotificationService] Exception getting unread count:", error);
    return 0;
  }
}

/**
 * Create a provider registration notification
 */
export async function createProviderRegistrationNotification(
  providerId: string,
  providerName: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return createNotification({
    title: "New Provider Registration",
    message: `${providerName} has registered as a service provider and is pending verification.`,
    type: "provider_registration",
    provider_id: providerId,
    metadata: { provider_id: providerId, provider_name: providerName },
  });
}

/**
 * Create a provider approval notification
 */
export async function createProviderApprovalNotification(
  providerId: string,
  providerName: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return createNotification({
    title: "Provider Approved",
    message: `Your profile has been verified and approved. You can now accept job requests.`,
    type: "provider_approved",
    provider_id: providerId,
    metadata: { provider_id: providerId, provider_name: providerName },
  });
}

/**
 * Create a provider rejection notification
 */
export async function createProviderRejectionNotification(
  providerId: string,
  providerName: string,
  reason?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return createNotification({
    title: "Provider Verification Rejected",
    message: `Your profile verification was rejected. ${reason ? `Reason: ${reason}` : "Please contact support for more details."}`,
    type: "provider_rejected",
    provider_id: providerId,
    metadata: { provider_id: providerId, provider_name: providerName, reason },
  });
}

/**
 * Subscribe to real-time notification changes for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: DatabaseNotification) => void
) {
  console.log(`[NotificationService] Subscribing to real-time notifications for user ${userId}`);
  
  const subscription = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log("[NotificationService] Real-time notification received:", payload);
        if (payload.new) {
          callback(payload.new as DatabaseNotification);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[NotificationService] Subscription status: ${status}`);
    });

  return subscription;
}

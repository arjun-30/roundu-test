import { supabase } from "./supabase";

// Confirmed schema: notifications(id, user_id nullable, title, message, type, is_read, data, created_at)
// Admin notifications use user_id = null and are filtered by type on the admin side

export type NotificationType =
  | "provider_registration"
  | "provider_approved"
  | "provider_rejected"
  | "booking_created"
  | "booking_cancelled"
  | "refund_requested"
  | "payment_completed"
  | "booking"
  | "general";

export const ADMIN_NOTIFICATION_TYPES: NotificationType[] = [
  "provider_registration",
  "provider_approved",
  "provider_rejected",
  "booking_cancelled",
  "refund_requested",
];

export interface DatabaseNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  user_id: string | null;
  created_at: string;
  is_read: boolean;
  data?: Record<string, any> | null;
}

export async function fetchNotifications(userId?: string, limit = 50): Promise<DatabaseNotification[]> {
  try {
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
    return data ?? [];
  } catch (error: any) {
    console.error("[NotificationService] Exception fetching notifications:", error);
    return [];
  }
}

// Fetch admin-visible notifications (provider_registration events with null user_id)
export async function fetchAdminNotifications(limit = 50): Promise<DatabaseNotification[]> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .in("type", ADMIN_NOTIFICATION_TYPES)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[NotificationService] Error fetching admin notifications:", error);
      return [];
    }
    return data ?? [];
  } catch (error: any) {
    console.error("[NotificationService] Exception fetching admin notifications:", error);
    return [];
  }
}

export async function createNotification(
  notification: Omit<DatabaseNotification, "id" | "created_at" | "is_read">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Use `data` column (the actual column name in the DB, not `metadata`)
    const { data, error } = await supabase
      .from("notifications")
      .insert([{
        title: notification.title,
        message: notification.message,
        type: notification.type,
        user_id: notification.user_id ?? null,
        data: notification.data ?? null,
        is_read: false,
      }])
      .select("id");

    if (error) {
      console.error("[NotificationService] Error creating notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.[0]?.id };
  } catch (error: any) {
    console.error("[NotificationService] Exception creating notification:", error);
    return { success: false, error: error.message };
  }
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("[NotificationService] Error marking as read:", error);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception marking as read:", error);
    return false;
  }
}

export async function markAllAdminNotificationsRead(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("type", ADMIN_NOTIFICATION_TYPES)
      .eq("is_read", false);

    if (error) {
      console.error("[NotificationService] Error marking all admin notifications read:", error);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception:", error);
    return false;
  }
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("[NotificationService] Error marking all as read:", error);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception marking all as read:", error);
    return false;
  }
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("[NotificationService] Error deleting notification:", error);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("[NotificationService] Exception deleting notification:", error);
    return false;
  }
}

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

export async function getAdminUnreadCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .in("type", ADMIN_NOTIFICATION_TYPES)
      .eq("is_read", false);

    if (error) {
      console.error("[NotificationService] Error getting admin unread count:", error);
      return 0;
    }
    return count ?? 0;
  } catch (error: any) {
    console.error("[NotificationService] Exception getting admin unread count:", error);
    return 0;
  }
}

// Creates a provider registration notification (admin-facing, no user_id)
export async function createProviderRegistrationNotification(
  providerId: string,
  providerName: string,
  serviceLabels?: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  return createNotification({
    title: "New Provider Registration",
    message: `${providerName} has registered as a service provider and is pending verification.`,
    type: "provider_registration",
    user_id: null,
    data: {
      provider_id: providerId,
      provider_name: providerName,
      service_labels: serviceLabels ?? [],
    },
  });
}

// Creates a provider approval notification (sent to the provider's user_id)
export async function createProviderApprovalNotification(
  providerId: string,
  providerName: string,
  providerUserId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return createNotification({
    title: "Provider Approved",
    message: "Your profile has been verified and approved. You can now accept job requests.",
    type: "provider_approved",
    user_id: providerUserId ?? null,
    data: { provider_id: providerId, provider_name: providerName },
  });
}

// Creates a provider rejection notification (sent to the provider's user_id)
export async function createProviderRejectionNotification(
  providerId: string,
  providerName: string,
  reason?: string,
  providerUserId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return createNotification({
    title: "Provider Verification Rejected",
    message: `Your profile verification was rejected. ${reason ? `Reason: ${reason}` : "Please contact support for more details."}`,
    type: "provider_rejected",
    user_id: providerUserId ?? null,
    data: { provider_id: providerId, provider_name: providerName, reason },
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notification: DatabaseNotification) => void
) {
  const subscription = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload: any) => {
        if (payload.new) callback(payload.new as DatabaseNotification);
      }
    )
    .subscribe();

  return subscription;
}

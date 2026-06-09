import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook for subscribing to real-time provider changes
 * Automatically unsubscribes on component unmount
 */
export function useProviderRealtimeUpdates(
  onProviderChange: (provider: any) => void
) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    console.log("[Realtime] Subscribing to provider updates");

    subscriptionRef.current = supabase
      .channel("providers-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "providers",
        },
        (payload: any) => {
          console.log("[Realtime] Provider update received:", payload);
          if (payload.new) {
            onProviderChange(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Provider subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from provider updates");
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [onProviderChange]);

  return subscriptionRef.current;
}

/**
 * Hook for subscribing to real-time booking changes
 * Automatically unsubscribes on component unmount
 */
export function useBookingRealtimeUpdates(
  onBookingChange: (booking: any) => void
) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    console.log("[Realtime] Subscribing to booking updates");

    subscriptionRef.current = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload: any) => {
          console.log("[Realtime] Booking update received:", payload);
          if (payload.new) {
            onBookingChange(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Booking subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from booking updates");
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [onBookingChange]);

  return subscriptionRef.current;
}

/**
 * Hook for subscribing to real-time user changes
 * Automatically unsubscribes on component unmount
 */
export function useUserRealtimeUpdates(
  onUserChange: (user: any) => void
) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    console.log("[Realtime] Subscribing to user updates");

    subscriptionRef.current = supabase
      .channel("users-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        (payload: any) => {
          console.log("[Realtime] User update received:", payload);
          if (payload.new) {
            onUserChange(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] User subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from user updates");
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [onUserChange]);

  return subscriptionRef.current;
}

/**
 * Hook for subscribing to real-time notification changes
 * Automatically unsubscribes on component unmount
 */
export function useNotificationRealtimeUpdates(
  userId: string,
  onNotificationChange: (notification: any) => void
) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    console.log("[Realtime] Subscribing to notification updates for user:", userId);

    subscriptionRef.current = supabase
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
          console.log("[Realtime] Notification update received:", payload);
          if (payload.new) {
            onNotificationChange(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Notification subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from notification updates");
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId, onNotificationChange]);

  return subscriptionRef.current;
}

/**
 * Hook for subscribing to multiple tables at once
 */
export function useMultipleRealtimeUpdates(
  tables: Array<{
    table: string;
    callback: (payload: any) => void;
    filter?: string;
  }>
) {
  const subscriptionsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    console.log("[Realtime] Subscribing to multiple tables:", tables.map(t => t.table));

    tables.forEach(({ table, callback, filter }) => {
      const channel = supabase
        .channel(`${table}-changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
            filter: filter,
          },
          (payload: any) => {
            console.log(`[Realtime] ${table} update received:`, payload);
            callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] ${table} subscription status:`, status);
        });

      subscriptionsRef.current.set(table, channel);
    });

    return () => {
      console.log("[Realtime] Unsubscribing from multiple tables");
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
    };
  }, [tables]);

  return subscriptionsRef.current;
}

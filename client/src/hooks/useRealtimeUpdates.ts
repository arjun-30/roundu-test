import { useEffect, useRef, useLayoutEffect } from "react";
import { supabase, isMock } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

// Store latest callback in a ref so the subscription never needs to re-subscribe
// when the parent re-renders and passes a new function reference.
function useLatestCallback<T extends (...args: any[]) => any>(fn: T) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return ref;
}

export function useProviderRealtimeUpdates(onProviderChange: (provider: any) => void) {
  const callbackRef = useLatestCallback(onProviderChange);

  useEffect(() => {
    if (isMock) {
      console.log("[Realtime] Mock mode active, skipping provider updates subscription");
      return;
    }
    console.log("[Realtime] Subscribing to provider updates");
    const channel = supabase
      .channel("providers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "providers" }, (payload: any) => {
        console.log("[Realtime] Provider update received:", payload);
        if (payload.new) callbackRef.current(payload.new);
      })
      .subscribe((status) => {
        console.log("[Realtime] Provider subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from provider updates");
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useBookingRealtimeUpdates(onBookingChange: (booking: any) => void) {
  const callbackRef = useLatestCallback(onBookingChange);

  useEffect(() => {
    if (isMock) {
      console.log("[Realtime] Mock mode active, skipping booking updates subscription");
      return;
    }
    console.log("[Realtime] Subscribing to booking updates");
    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload: any) => {
        console.log("[Realtime] Booking update received:", payload);
        if (payload.new) callbackRef.current(payload.new);
      })
      .subscribe((status) => {
        console.log("[Realtime] Booking subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from booking updates");
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useUserRealtimeUpdates(onUserChange: (user: any) => void) {
  const callbackRef = useLatestCallback(onUserChange);

  useEffect(() => {
    if (isMock) {
      console.log("[Realtime] Mock mode active, skipping user updates subscription");
      return;
    }
    console.log("[Realtime] Subscribing to user updates");
    const channel = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, (payload: any) => {
        console.log("[Realtime] User update received:", payload);
        if (payload.new) callbackRef.current(payload.new);
      })
      .subscribe((status) => {
        console.log("[Realtime] User subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from user updates");
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useNotificationRealtimeUpdates(
  userId: string,
  onNotificationChange: (notification: any) => void
) {
  const callbackRef = useLatestCallback(onNotificationChange);

  useEffect(() => {
    if (!userId) return;
    if (isMock) {
      console.log("[Realtime] Mock mode active, skipping notification updates subscription");
      return;
    }
    console.log("[Realtime] Subscribing to notification updates for user:", userId);
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          console.log("[Realtime] Notification update received:", payload);
          if (payload.new) callbackRef.current(payload.new);
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Notification subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from notification updates");
      supabase.removeChannel(channel);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useAdminNotificationUpdates(
  onNotification: (notification: any) => void
) {
  const callbackRef = useLatestCallback(onNotification);

  useEffect(() => {
    if (isMock) {
      console.log("[Realtime] Mock mode active, skipping admin notifications subscription");
      return;
    }
    console.log("[Realtime] Subscribing to admin notifications");
    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          console.log("[Realtime] Admin notification received:", payload.new);
          if (payload.new) callbackRef.current(payload.new);
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Admin notification subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useMultipleRealtimeUpdates(
  tables: Array<{ table: string; callback: (payload: any) => void; filter?: string }>
) {
  const subscriptionsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    if (isMock) {
      console.log("[Realtime] Mock mode active, skipping multiple tables updates subscription");
      return;
    }
    console.log("[Realtime] Subscribing to multiple tables:", tables.map(t => t.table));

    tables.forEach(({ table, callback, filter }) => {
      const channel = supabase
        .channel(`${table}-multi`)
        .on("postgres_changes", { event: "*", schema: "public", table, filter }, (payload: any) => {
          console.log(`[Realtime] ${table} update received:`, payload);
          callback(payload);
        })
        .subscribe();
      subscriptionsRef.current.set(table, channel);
    });

    return () => {
      console.log("[Realtime] Unsubscribing from multiple tables");
      subscriptionsRef.current.forEach((channel) => supabase.removeChannel(channel));
      subscriptionsRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

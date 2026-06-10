import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export type ApprovalStatus = "pending" | "approved" | "rejected" | null;

export interface ProviderApprovalState {
  status: ApprovalStatus;
  rejectionReason: string | null;
  loading: boolean;
}

function deriveStatus(row: any): ApprovalStatus {
  if (!row) return null;
  // Explicit rejection flag takes priority
  if (row.approval_status === "rejected" || row.is_active === false) return "rejected";
  if (row.is_verified === true && (row.approval_status === "approved" || row.approval_status == null)) return "approved";
  return "pending";
}

export function useProviderApprovalStatus(userId: string | null | undefined): ProviderApprovalState {
  const [status, setStatus] = useState<ApprovalStatus>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep userId stable in the subscription closure
  const userIdRef = useRef(userId);
  useLayoutEffect(() => { userIdRef.current = userId; });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setStatus(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Initial fetch
    supabase
      .from("providers")
      .select("is_verified, approval_status, rejection_reason, is_active")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("[useProviderApprovalStatus] fetch error:", error.message);
        setStatus(deriveStatus(data));
        setRejectionReason(data?.rejection_reason ?? null);
        setLoading(false);
      });

    // Realtime: react instantly when admin approves or rejects
    const channel = supabase
      .channel(`provider-status-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "providers", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!payload.new) return;
          setStatus(deriveStatus(payload.new));
          setRejectionReason((payload.new as any).rejection_reason ?? null);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, rejectionReason, loading };
}

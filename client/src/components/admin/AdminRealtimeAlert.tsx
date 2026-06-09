import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, CheckCircle } from "lucide-react";

/**
 * AdminRealtimeAlert
 * Mount this ONCE inside AdminLayout. It listens (via Supabase Realtime) for any
 * new provider row inserted with verified=false and pops a toast — on whatever
 * admin page you're on, including the dashboard. Approve right from the toast,
 * or jump to the provider for review.
 *
 * Requires (run once in Supabase SQL editor):
 *   alter publication supabase_realtime add table public.providers;
 * ...and a SELECT RLS policy that lets the admin read providers.
 */

interface ToastProvider {
    toastId: string;
    id: string;
    name: string;
    service?: string;
}

export default function AdminRealtimeAlert() {
    const navigate = useNavigate();
    const [toasts, setToasts] = useState<ToastProvider[]>([]);
    const [approving, setApproving] = useState<string | null>(null);

    const dismiss = (toastId: string) =>
        setToasts(prev => prev.filter(t => t.toastId !== toastId));

    const approve = async (t: ToastProvider) => {
        setApproving(t.toastId);
        const { error } = await supabase.from("providers").update({ verified: true }).eq("id", t.id);
        setApproving(null);
        if (!error) dismiss(t.toastId);
    };

    useEffect(() => {
        const channel = supabase
            .channel("admin-provider-alerts")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "providers" },
                (payload) => {
                    const p = payload.new as Record<string, unknown>;
                    if (p && p.verified === false) {
                        setToasts(prev =>
                            [
                                {
                                    toastId: `${String(p.id)}-${Date.now()}`,
                                    id: String(p.id),
                                    name: String(p.full_name ?? "New provider"),
                                    service: p.service_type ? String(p.service_type) : undefined,
                                },
                                ...prev,
                            ].slice(0, 4)
                        );
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.toastId}
                        initial={{ opacity: 0, x: 60, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 60, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                        className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden pointer-events-auto"
                    >
                        <div className="flex items-start gap-3 p-4">
                            <div className="w-10 h-10 rounded-xl bg-[#F4B942]/15 text-[#F4B942] flex items-center justify-center shrink-0">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800">New Provider Registration</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {t.name}{t.service ? ` · ${t.service}` : ""} is awaiting approval
                                </p>
                            </div>
                            <button onClick={() => dismiss(t.toastId)} className="text-slate-300 hover:text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button
                                onClick={() => approve(t)}
                                disabled={approving === t.toastId}
                                className="flex-1 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                                {approving === t.toastId ? "Approving…" : "Approve"}
                            </button>
                            <button
                                onClick={() => { dismiss(t.toastId); navigate(`/admin/providers?status=pending&highlight=${t.id}`); }}
                                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 border-l border-slate-100 transition-colors"
                            >
                                Review
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
}
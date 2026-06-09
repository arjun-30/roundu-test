import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ProviderPendingApproval — the "Verification In Progress" screen.
 *
 * It watches THIS provider's row over Supabase Realtime. The moment an admin
 * flips verified=true, the "Final Admin Approval" step ticks green and the
 * provider is forwarded to the next page automatically — no refresh needed.
 *
 * Requires (run once in Supabase SQL editor):
 *   alter publication supabase_realtime add table public.providers;
 * ...and a SELECT RLS policy that lets a provider read their own row.
 *
 * TODO: set NEXT_PAGE to wherever an approved provider should land.
 */
const NEXT_PAGE = "/provider/dashboard";

const PRE_STEPS = ["Identity Verified", "Bank Account Linked", "Portfolio Review"];

export default function ProviderPendingApproval() {
    const navigate = useNavigate();
    const [providerId, setProviderId] = useState<string | null>(null);
    const [verified, setVerified] = useState<boolean | null>(null);
    const [error, setError] = useState("");

    // 1. Figure out which provider this is.
    //    Adjust to YOUR auth model. Two common cases handled below:
    //      (a) providerId saved in localStorage at registration time
    //      (b) providers.auth_id == supabase auth user id
    useEffect(() => {
        let active = true;
        (async () => {
            let id = localStorage.getItem("providerId");

            if (!id) {
                const { data: auth } = await supabase.auth.getUser();
                if (auth?.user) {
                    const { data } = await supabase
                        .from("providers")
                        .select("id,verified")
                        .eq("auth_id", auth.user.id)
                        .maybeSingle();
                    if (data) {
                        id = String(data.id);
                        if (active) setVerified(Boolean(data.verified));
                    }
                }
            }

            if (!active) return;
            if (id) setProviderId(id);
            else setError("Could not find your provider profile. Please sign in again.");
        })();
        return () => { active = false; };
    }, []);

    // 2. Initial status check + realtime subscription on this provider's row.
    useEffect(() => {
        if (!providerId) return;
        let active = true;

        supabase
            .from("providers")
            .select("verified")
            .eq("id", providerId)
            .maybeSingle()
            .then(({ data }) => { if (active && data) setVerified(Boolean(data.verified)); });

        const channel = supabase
            .channel(`provider-status-${providerId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "providers", filter: `id=eq.${providerId}` },
                (payload) => {
                    const p = payload.new as Record<string, unknown>;
                    if (p?.verified === true) setVerified(true);
                }
            )
            .subscribe();

        return () => { active = false; supabase.removeChannel(channel); };
    }, [providerId]);

    // 3. Once approved, advance to the next page.
    useEffect(() => {
        if (verified === true) {
            const t = setTimeout(() => navigate(NEXT_PAGE), 1600);
            return () => clearTimeout(t);
        }
    }, [verified, navigate]);

    const approved = verified === true;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${approved ? "bg-emerald-100 text-emerald-600" : "bg-[#F4B942]/15 text-[#F4B942]"}`}>
                        {approved ? <CheckCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                    </div>
                    <h1 className="text-3xl font-black text-slate-800">Verification</h1>
                    <h2 className={`text-3xl font-black ${approved ? "text-emerald-600" : "text-[#F4B942]"}`}>
                        {approved ? "Approved!" : "In Progress"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-3">
                        {approved
                            ? "You're all set — taking you to your dashboard…"
                            : <>We're currently reviewing your documents. Our team usually approves profiles within <strong>24 hours</strong>.</>}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Application Status</p>

                    <div className="space-y-5">
                        {PRE_STEPS.map(label => (
                            <div key={label} className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-4 h-4" />
                                </span>
                                <span className="font-bold text-slate-800">{label}</span>
                            </div>
                        ))}

                        <div className="border-t border-slate-100 pt-5 flex items-center gap-3">
                            {approved ? (
                                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-4 h-4" />
                                </span>
                            ) : (
                                <span className="w-7 h-7 flex items-center justify-center shrink-0 text-[#F4B942]">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                </span>
                            )}
                            <span className={`font-bold ${approved ? "text-emerald-600" : "text-[#F4B942]"}`}>
                                Final Admin Approval
                            </span>
                        </div>
                    </div>
                </div>

                {approved && (
                    <button
                        onClick={() => navigate(NEXT_PAGE)}
                        className="mt-5 w-full py-3.5 rounded-2xl bg-[#F4B942] text-slate-900 font-bold hover:brightness-95 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" /> Continue
                    </button>
                )}
            </motion.div>
        </div>
    );
}
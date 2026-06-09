import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ProviderRegistration — replaces the old POST to the dead Railway URL.
 * It inserts the new provider straight into Supabase with verified=false,
 * stores the new id so the pending-approval page can track status, then
 * forwards to /provider/pending-approval.
 *
 * Adjust the FIELDS / column names to match your actual `providers` table.
 * If you also create a Supabase auth account at signup, do that first and
 * pass the auth user id into `auth_id` below (uncomment the marked lines).
 */

const SERVICE_TYPES = [
    "Plumbing", "Electrician", "Cleaning", "Carpentry",
    "Painting", "Appliance Repair", "Pest Control", "AC Service",
];

interface FormState {
    fullName: string;
    phone: string;
    email: string;
    serviceType: string;
}

export default function ProviderRegistration() {
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>({
        fullName: "", phone: "", email: "", serviceType: SERVICE_TYPES[0],
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const set = (key: keyof FormState, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const validate = (): string | null => {
        if (!form.fullName.trim()) return "Please enter your full name.";
        if (!/^\d{10}$/.test(form.phone.trim())) return "Please enter a valid 10-digit phone number.";
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return "Please enter a valid email.";
        return null;
    };

    const handleSubmit = async () => {
        const v = validate();
        if (v) { setError(v); return; }

        setError("");
        setSubmitting(true);

        // --- If you also create an auth account, do it here first: ---------
        // const { data: auth, error: authErr } = await supabase.auth.signUp({
        //     email: form.email, password: somePassword,
        // });
        // if (authErr) { setError(authErr.message); setSubmitting(false); return; }
        // const authId = auth.user?.id;

        const { data, error: insertErr } = await supabase
            .from("providers")
            .insert({
                full_name: form.fullName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                service_type: form.serviceType,
                verified: false,          // ← awaiting admin approval
                is_online: false,
                rating: 0,
                total_earnings: 0,
                kyc_status: "submitted",
                // auth_id: authId,        // ← uncomment if linking to auth
            })
            .select("id")
            .single();

        if (insertErr) {
            setError(insertErr.message || "Registration failed. Please try again.");
            setSubmitting(false);
            return;
        }

        // Let the pending-approval page know which row to watch.
        localStorage.setItem("providerId", String(data.id));

        setSubmitting(false);
        navigate("/provider/pending-approval");
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#17375E] text-white">
                        <UserPlus className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800">Become a Provider</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Register your service. An admin will review and approve your profile.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
                        <input
                            type="text" value={form.fullName}
                            onChange={e => set("fullName", e.target.value)}
                            placeholder="e.g. Ramesh Kumar"
                            className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
                        <input
                            type="tel" value={form.phone}
                            onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="10-digit mobile number"
                            className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email <span className="text-slate-300">(optional)</span></label>
                        <input
                            type="email" value={form.email}
                            onChange={e => set("email", e.target.value)}
                            placeholder="you@example.com"
                            className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Service Type</label>
                        <select
                            value={form.serviceType}
                            onChange={e => set("serviceType", e.target.value)}
                            className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                        >
                            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-3.5 rounded-2xl bg-[#F4B942] text-slate-900 font-bold hover:brightness-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {submitting ? (<><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>) : "Submit for Approval"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

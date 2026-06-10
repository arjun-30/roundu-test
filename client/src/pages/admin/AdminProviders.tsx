import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { updateProviderVerification } from "@/lib/adminService";
import { createProviderApprovalNotification, createProviderRejectionNotification } from "@/lib/notificationService";
import { Search, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Confirmed schema:
//   providers: id, user_id, rating, is_online, is_verified, created_at
//   users (via users!user_id): name, phone, kyc_status
//   provider_services (via provider_services): service_id, services(label)

interface Provider {
    id: string;
    user_id: string;
    rating: number;
    is_verified: boolean;
    is_online: boolean;
    created_at: string;
    // From users join
    name: string;
    phone: string;
    kyc_status: string;
    // Derived from provider_services join
    service_labels: string[];
}

function ProviderRow({ provider, onVerify }: { provider: Provider; onVerify: (id: string, val: boolean) => void }) {
    const [open, setOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleVerify = async (e: React.MouseEvent, val: boolean) => {
        e.stopPropagation();
        setUpdating(true);
        try {
            const result = await updateProviderVerification(provider.id, val);
            if (!result.success) {
                console.error("[AdminProviders] Failed to update provider:", result.error);
                setUpdating(false);
                return;
            }
            if (val) {
                await createProviderApprovalNotification(provider.id, provider.name, provider.user_id);
            } else {
                await createProviderRejectionNotification(provider.id, provider.name, "Admin review", provider.user_id);
            }
            onVerify(provider.id, val);
        } catch (error) {
            console.error("[AdminProviders] Exception during verification:", error);
        } finally {
            setUpdating(false);
        }
    };

    const initials = (provider.name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const serviceDisplay = provider.service_labels.length > 0
        ? provider.service_labels.join(", ")
        : "—";

    return (
        <>
            <tr
                onClick={() => setOpen(o => !o)}
                className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
            >
                <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-xl bg-[#F4B942] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {initials}
                            </div>
                            {provider.is_online && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                            )}
                        </div>
                        <span className="font-semibold text-slate-700 text-sm">{provider.name || "—"}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{provider.phone || "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-500 capitalize">{serviceDisplay}</td>
                <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {(provider.rating ?? 0).toFixed(1)}
                    </span>
                </td>
                <td className="px-4 py-3">
                    {provider.is_verified
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3" />Verified</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><XCircle className="w-3 h-3" />Pending</span>
                    }
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{new Date(provider.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {!provider.is_verified ? (
                            <button
                                onClick={e => handleVerify(e, true)}
                                disabled={updating}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                                Approve
                            </button>
                        ) : (
                            <button
                                onClick={e => handleVerify(e, false)}
                                disabled={updating}
                                className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                            >
                                Revoke
                            </button>
                        )}
                    </div>
                </td>
                <td className="px-4 py-3 text-slate-400">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </td>
            </tr>
            <AnimatePresence>
                {open && (
                    <tr>
                        <td colSpan={8} className="px-6 bg-slate-50/60">
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase">KYC Status</p>
                                        <p className="font-semibold text-slate-700 capitalize mt-0.5">{provider.kyc_status || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase">Services</p>
                                        <p className="font-semibold text-slate-700 mt-0.5">{serviceDisplay}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase">Online Status</p>
                                        <p className={`font-semibold mt-0.5 ${provider.is_online ? "text-emerald-600" : "text-slate-500"}`}>
                                            {provider.is_online ? "Online" : "Offline"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase">Joined</p>
                                        <p className="font-semibold text-slate-700 mt-0.5">{new Date(provider.created_at).toLocaleDateString("en-IN")}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
        </>
    );
}

function mapProviderRow(raw: any): Provider {
    const userInfo = raw.users as { name?: string; phone?: string; kyc_status?: string } | null;
    const psRows = (raw.provider_services ?? []) as Array<{ service_id: string; services?: { label?: string } | null }>;
    const serviceLabels = psRows.map(ps => ps.services?.label ?? ps.service_id).filter(Boolean);

    return {
        id: raw.id,
        user_id: raw.user_id,
        rating: raw.rating ?? 0,
        is_verified: raw.is_verified ?? false,
        is_online: raw.is_online ?? false,
        created_at: raw.created_at,
        name: userInfo?.name ?? "—",
        phone: userInfo?.phone ?? "—",
        kyc_status: userInfo?.kyc_status ?? "unverified",
        service_labels: serviceLabels,
    };
}

export default function AdminProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filterVerified, setFilterVerified] = useState("all");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const fetchProviders = useCallback(async () => {
        setLoading(true);
        setError("");
        const { data, error: err } = await supabase
            .from("providers")
            .select(`
                id, user_id, rating, is_online, is_verified, created_at,
                users!user_id(name, phone, kyc_status),
                provider_services(service_id, services(label))
            `)
            .order("created_at", { ascending: false });

        if (err) {
            console.error("[AdminProviders] Error:", err);
            setError(`Failed to load providers: ${err.message}`);
        } else {
            setProviders((data ?? []).map(mapProviderRow));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    const handleVerify = (id: string, val: boolean) => {
        setProviders(prev => prev.map(p => p.id === id ? { ...p, is_verified: val } : p));
    };

    const filtered = providers.filter(p => {
        const matchSearch =
            (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (p.phone ?? "").includes(search);
        const matchVerified =
            filterVerified === "all" ||
            (filterVerified === "verified" ? p.is_verified : !p.is_verified);
        return matchSearch && matchVerified;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-3xl font-black text-slate-800">Provider Management</h1>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <p className="text-slate-500 text-sm">Total</p>
                        <h2 className="text-3xl font-bold">{providers.length}</h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <p className="text-slate-500 text-sm">Verified</p>
                        <h2 className="text-3xl font-bold text-green-500">
                            {providers.filter(p => p.is_verified).length}
                        </h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <p className="text-slate-500 text-sm">Pending</p>
                        <h2 className="text-3xl font-bold text-orange-500">
                            {providers.filter(p => !p.is_verified).length}
                        </h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <p className="text-slate-500 text-sm">Online</p>
                        <h2 className="text-3xl font-bold text-blue-500">
                            {providers.filter(p => p.is_online).length}
                        </h2>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text" placeholder="Search by name or phone…" value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                        />
                    </div>
                    <select value={filterVerified} onChange={e => { setFilterVerified(e.target.value); setPage(1); }}
                        className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none">
                        <option value="all">All Status</option>
                        <option value="verified">Verified</option>
                        <option value="pending">Pending</option>
                    </select>
                    <button onClick={fetchProviders} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[750px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {["Provider", "Phone", "Services", "Rating", "Status", "Joined", "Action", ""].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading
                            ? Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-slate-100 animate-pulse" /></td>
                                ))}</tr>
                            ))
                            : paginated.length === 0
                                ? (
                                    <tr><td colSpan={8} className="px-4 py-12">
                                        <div className="text-center">
                                            <div className="text-6xl mb-3">🛠️</div>
                                            <h3 className="font-semibold text-slate-700 text-lg">No Providers Found</h3>
                                            <p className="text-slate-400 text-sm">Service providers will appear here</p>
                                        </div>
                                    </td></tr>
                                )
                                : paginated.map(p => <ProviderRow key={p.id} provider={p} onVerify={handleVerify} />)
                        }
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
                    <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-slate-50">Prev</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-slate-50">Next</button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

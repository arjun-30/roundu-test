import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Download, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Confirmed schema:
//   bookings: id, customer_id, provider_id, service_id, status, price, address, created_at, scheduled_at, notes, voice_note
//   users join: users!customer_id(name, phone)
//   providers join: providers!provider_id(users!user_id(name))

interface Booking {
    id: string;
    customer_name: string;
    customer_phone: string;
    provider_name: string;
    service_id: string;
    status: string;
    price: number;
    address: string;
    created_at: string;
    scheduled_at: string;
    notes: string;
    voice_note: boolean;
    customer_id: string;
    provider_id: string;
}

const STATUS_OPTIONS = ["all", "pending", "assigned", "on_the_way", "arrived", "in_progress", "completed", "cancelled"];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        completed: "bg-emerald-100 text-emerald-700",
        pending: "bg-amber-100 text-amber-700",
        cancelled: "bg-red-100 text-red-600",
        assigned: "bg-blue-100 text-blue-700",
        on_the_way: "bg-blue-100 text-blue-700",
        arrived: "bg-purple-100 text-purple-700",
        in_progress: "bg-purple-100 text-purple-700",
    };
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

function DetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <div>
                            <h2 className="font-extrabold text-slate-800">Booking Detail</h2>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{booking.id}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <StatusBadge status={booking.status} />
                            <span className="text-sm text-slate-500">{new Date(booking.created_at).toLocaleString("en-IN")}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {[
                                ["Customer", booking.customer_name],
                                ["Phone", booking.customer_phone],
                                ["Provider", booking.provider_name],
                                ["Service", booking.service_id],
                                ["Price", `₹${(booking.price ?? 0).toLocaleString()}`],
                                ["Scheduled", booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString("en-IN") : "—"],
                            ].map(([label, val]) => (
                                <div key={String(label)}>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                                    <p className="font-semibold text-slate-700 mt-0.5 capitalize">{String(val)}</p>
                                </div>
                            ))}
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Address</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2">{booking.address || "—"}</p>
                        </div>

                        {booking.notes && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2">{booking.notes}</p>
                            </div>
                        )}

                        {booking.voice_note && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
                                <span className="text-blue-600 text-xs font-semibold">🎙 Voice note attached</span>
                            </div>
                        )}

                        {/* Status Timeline */}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Status Timeline</p>
                            <div className="flex items-center gap-0">
                                {["pending", "assigned", "on_the_way", "arrived", "in_progress", "completed"].map((s, i, arr) => {
                                    const statuses = ["pending", "assigned", "on_the_way", "arrived", "in_progress", "completed"];
                                    const current = statuses.indexOf(booking.status);
                                    const step = statuses.indexOf(s);
                                    const done = step <= current;
                                    return (
                                        <div key={s} className="flex items-center flex-1 last:flex-none">
                                            <div className={`w-3 h-3 rounded-full shrink-0 ${done ? "bg-[#17375E]" : "bg-slate-200"}`} />
                                            {i < arr.length - 1 && <div className={`flex-1 h-0.5 ${done && step < current ? "bg-[#17375E]" : "bg-slate-200"}`} />}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-1">
                                {["Pending", "Assigned", "On Way", "Arrived", "In Progress", "Done"].map(l => (
                                    <span key={l} className="text-[9px] text-slate-400">{l}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function exportCSV(data: Booking[]) {
    const headers = ["ID", "Customer", "Phone", "Provider", "Service", "Status", "Price", "Address", "Date"];
    const rows = data.map(b => [
        b.id, b.customer_name, b.customer_phone, b.provider_name,
        b.service_id, b.status, b.price, b.address,
        new Date(b.created_at).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `roundu-bookings-${Date.now()}.csv`;
    a.click();
}

export default function AdminBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterService, setFilterService] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selected, setSelected] = useState<Booking | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError("");
        const { data, error: err } = await supabase
            .from("bookings")
            .select(`
                id, status, price, address, created_at, scheduled_at, notes, voice_note, service_id, customer_id, provider_id,
                users!customer_id(name, phone),
                providers!provider_id(users!user_id(name))
            `)
            .order("created_at", { ascending: false });

        if (err) {
            console.error("[AdminBookings] Error:", err);
            setError(`Failed to load bookings: ${err.message}`);
            setLoading(false);
            return;
        }

        setBookings(
            (data ?? []).map((b: any) => ({
                id: String(b.id ?? ""),
                customer_name: (b.users as { name?: string } | null)?.name ?? "—",
                customer_phone: (b.users as { phone?: string } | null)?.phone ?? "—",
                provider_name: (b.providers as { users?: { name?: string } | null } | null)?.users?.name ?? "—",
                service_id: String(b.service_id ?? "—"),
                status: String(b.status ?? ""),
                price: Number(b.price ?? 0),
                address: String(b.address ?? ""),
                created_at: String(b.created_at ?? ""),
                scheduled_at: String(b.scheduled_at ?? ""),
                notes: String(b.notes ?? ""),
                voice_note: Boolean(b.voice_note),
                customer_id: String(b.customer_id ?? ""),
                provider_id: String(b.provider_id ?? ""),
            }))
        );
        setLoading(false);
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const serviceIds = ["all", ...Array.from(new Set(bookings.map(b => b.service_id).filter(Boolean)))];

    const filtered = bookings.filter(b => {
        const matchSearch = b.id.toLowerCase().includes(search.toLowerCase()) || b.customer_name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || b.status === filterStatus;
        const matchService = filterService === "all" || b.service_id === filterService;
        const matchFrom = !dateFrom || b.created_at >= dateFrom;
        const matchTo = !dateTo || b.created_at <= dateTo + "T23:59:59";
        return matchSearch && matchStatus && matchService && matchFrom && matchTo;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {selected && <DetailModal booking={selected} onClose={() => setSelected(null)} />}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Bookings</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{bookings.length} total bookings</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-xs text-slate-500">Pending</p>
                        <h2 className="text-2xl font-bold text-amber-600">
                            {bookings.filter(b => b.status === "pending").length}
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-xs text-slate-500">Completed</p>
                        <h2 className="text-2xl font-bold text-green-600">
                            {bookings.filter(b => b.status === "completed").length}
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-xs text-slate-500">Cancelled</p>
                        <h2 className="text-2xl font-bold text-red-600">
                            {bookings.filter(b => b.status === "cancelled").length}
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-xs text-slate-500">Revenue</p>
                        <h2 className="text-2xl font-bold text-[#17375E]">
                            ₹{bookings.filter(b => b.status === "completed").reduce((a, b) => a + (b.price || 0), 0).toLocaleString()}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={fetchBookings} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => exportCSV(filtered)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#17375E] text-white text-sm font-semibold hover:bg-[#1e4a7a] transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search ID or customer…" value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10" />
                </div>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none capitalize">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "all" ? "All Status" : s.replace(/_/g, " ")}</option>)}
                </select>
                <select value={filterService} onChange={e => { setFilterService(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none">
                    {serviceIds.map(s => <option key={s} value={s}>{s === "all" ? "All Services" : s}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none" />
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-red-700">Unable to load bookings</h4>
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                    <button onClick={fetchBookings} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm">Retry</button>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {["Booking ID", "Customer", "Provider", "Service", "Status", "Price", "Address", "Date"].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading
                            ? Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-slate-100 animate-pulse" /></td>
                                ))}</tr>
                            ))
                            : paginated.length === 0
                                ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-16">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                                    <span className="text-4xl">📅</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-700">No Bookings Yet</h3>
                                                <p className="text-sm text-slate-400 mt-1">Customer bookings will appear here</p>
                                                <button className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-sm" onClick={fetchBookings}>Refresh</button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                : paginated.map((b, i) => (
                                    <tr key={b.id}
                                        onClick={() => setSelected(b)}
                                        className={`border-b border-slate-50 last:border-0 cursor-pointer hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.id.slice(0, 8)}…</td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">{b.customer_name}</td>
                                        <td className="px-4 py-3 text-slate-600">{b.provider_name}</td>
                                        <td className="px-4 py-3 capitalize text-slate-600">{b.service_id}</td>
                                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">₹{b.price.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{b.address}</td>
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                                    </tr>
                                ))
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

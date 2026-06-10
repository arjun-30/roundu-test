import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Download, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Confirmed schema: users(id, phone, name, email, address, role, created_at, kyc_status)
// Wallet balance lives in wallets(user_id, balance) — joined separately if needed

interface User {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    role: string;
    created_at: string;
    kyc_status: string | null;
}

interface Booking {
    id: string;
    service_id: string;
    status: string;
    price: number;
    created_at: string;
}

function exportCSV(data: User[]) {
    const headers = ["ID", "Name", "Phone", "Email", "Address", "Role", "KYC", "Joined"];
    const rows = data.map(u => [
        u.id, u.name, u.phone, u.email ?? "", u.address ?? "", u.role,
        u.kyc_status ?? "", new Date(u.created_at).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `roundu-users-${Date.now()}.csv`;
    a.click();
}

function UserRow({ user }: { user: User }) {
    const [open, setOpen] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);

    const loadBookings = async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        setLoadingBookings(true);
        // bookings use customer_id (not user_id) for the customer FK
        const { data } = await supabase
            .from("bookings")
            .select("id,service_id,status,price,created_at")
            .eq("customer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);
        setBookings(data ?? []);
        setLoadingBookings(false);
    };

    const initials = (user.name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <>
            <tr
                onClick={loadBookings}
                className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
            >
                <td className="px-4 py-3">
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded-lg bg-blue-100 text-blue-600 text-xs font-medium">
                            View
                        </button>
                        <button className="px-3 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-medium">
                            Block
                        </button>
                    </div>
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#17375E] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                        </div>
                        <span className="font-semibold text-slate-700 text-sm">{user.name || "—"}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.phone || "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{user.email || "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[160px] truncate">{user.address || "—"}</td>
                <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 capitalize">{user.role || "user"}</span>
                </td>
                <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        user.kyc_status === "verified"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                    }`}>
                        {user.kyc_status || "unverified"}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-400">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </td>
            </tr>
            <AnimatePresence>
                {open && (
                    <tr>
                        <td colSpan={9} className="px-4 pb-3 bg-slate-50/60">
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 pb-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Recent Bookings</p>
                                    {loadingBookings ? (
                                        <div className="h-16 rounded-xl bg-slate-200 animate-pulse" />
                                    ) : bookings.length === 0 ? (
                                        <p className="text-sm text-slate-400">No bookings found.</p>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-slate-400">
                                                    {["ID", "Service", "Status", "Price", "Date"].map(h => (
                                                        <th key={h} className="text-left pb-1 font-semibold">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bookings.map(b => (
                                                    <tr key={b.id} className="border-t border-slate-100">
                                                        <td className="py-1 font-mono text-slate-400">{b.id.slice(0, 8)}…</td>
                                                        <td className="py-1 capitalize text-slate-600">{b.service_id}</td>
                                                        <td className="py-1">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                                b.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                                                b.status === "cancelled" ? "bg-red-100 text-red-600" :
                                                                "bg-blue-100 text-blue-700"
                                                            }`}>{b.status}</span>
                                                        </td>
                                                        <td className="py-1 font-semibold text-slate-700">₹{b.price}</td>
                                                        <td className="py-1 text-slate-400">{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
        </>
    );
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            // Use actual column names: name (not full_name), no wallet_balance
            const { data, error: err } = await supabase
                .from("users")
                .select("id,name,phone,email,address,role,created_at,kyc_status")
                .order("created_at", { ascending: false });
            if (err) {
                console.error("[AdminUsers] Error loading users:", err);
                setError(`Failed to load users: ${err.message}`);
            } else {
                console.log("[AdminUsers] Loaded", data?.length ?? 0, "users");
                setUsers(data ?? []);
            }
        } catch (e: any) {
            console.error("[AdminUsers] Exception:", e);
            setError(`Exception: ${e.message ?? "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const filtered = users.filter(u =>
        (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.phone ?? "").includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <p className="text-slate-500 text-sm">Total Users</p>
                    <h2 className="text-3xl font-bold text-slate-800">{users.length}</h2>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <p className="text-slate-500 text-sm">Providers</p>
                    <h2 className="text-3xl font-bold text-purple-500">
                        {users.filter(u => u.role === "provider").length}
                    </h2>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <p className="text-slate-500 text-sm">KYC Verified</p>
                    <h2 className="text-3xl font-bold text-green-500">
                        {users.filter(u => u.kyc_status === "verified").length}
                    </h2>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <p className="text-slate-500 text-sm">Search Results</p>
                    <h2 className="text-3xl font-bold text-blue-500">{filtered.length}</h2>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Users</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{users.length} total registered users</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchUsers} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => exportCSV(filtered)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#17375E] text-white text-sm font-semibold hover:bg-[#1e4a7a] transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or phone…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                />
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {["Actions", "Name", "Phone", "Email", "Address", "Role", "KYC", "Joined", ""].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading
                            ? Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 9 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-slate-100 animate-pulse" /></td>
                                    ))}
                                </tr>
                            ))
                            : paginated.length === 0
                                ? (
                                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No users found.</td></tr>
                                )
                                : paginated.map(u => <UserRow key={u.id} user={u} />)
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-slate-50">Prev</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-slate-50">Next</button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

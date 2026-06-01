import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import StatCard from "@/components/admin/StatCard";
import {
    Users, Briefcase, CalendarCheck, Activity,
    DollarSign, TrendingUp, Clock, XCircle, RefreshCw
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
    totalUsers: number;
    totalProviders: number;
    totalBookings: number;
    activeBookings: number;
    totalRevenue: number;
    todayRevenue: number;
    pendingVerifications: number;
    cancelledBookings: number;
}

interface DailyPoint { date: string; bookings: number; revenue: number; }
interface StatusPoint { name: string; value: number; }
interface ServicePoint { service: string; count: number; }
interface RecentBooking {
    id: string;
    customer_name: string;
    provider_name: string;
    service_type: string;
    status: string;
    price: number;
    created_at: string;
}

const ACTIVE_STATUSES = ["assigned", "on_the_way", "arrived", "in_progress"];
const STATUS_COLORS: Record<string, string> = {
    completed: "#10b981",
    pending: "#F4B942",
    cancelled: "#ef4444",
    active: "#3b82f6",
};
const PIE_COLORS = ["#10b981", "#3b82f6", "#F4B942", "#ef4444"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        completed: "bg-emerald-100 text-emerald-700",
        pending: "bg-amber-100 text-amber-700",
        cancelled: "bg-red-100 text-red-600",
        assigned: "bg-blue-100 text-blue-700",
        on_the_way: "bg-blue-100 text-blue-700",
        arrived: "bg-blue-100 text-blue-700",
        in_progress: "bg-purple-100 text-purple-700",
    };
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

// ─── Layout wrapper (used as index route under /admin) ────────────────────────
export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-6 lg:p-8 overflow-auto max-w-none">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

// ─── Dashboard Home ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
    const [statusData, setStatusData] = useState<StatusPoint[]>([]);
    const [serviceData, setServiceData] = useState<ServicePoint[]>([]);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const today = new Date().toISOString().split("T")[0];
            const since14 = new Date(Date.now() - 14 * 864e5).toISOString();

            const [
                { count: totalUsers },
                { count: totalProviders },
                { count: totalBookings },
                { count: activeBookings },
                { count: pendingVerifications },
                { count: cancelledBookings },
                { data: completedBookings },
                { data: todayBookingsRaw },
                { data: last14Bookings },
                { data: recentRaw },
            ] = await Promise.all([
                supabase.from("users").select("*", { count: "exact", head: true }),
                supabase.from("providers").select("*", { count: "exact", head: true }),
                supabase.from("bookings").select("*", { count: "exact", head: true }),
                supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
                supabase.from("providers").select("*", { count: "exact", head: true }).eq("verified", false),
                supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
                supabase.from("bookings").select("price").eq("status", "completed"),
                supabase.from("bookings").select("price").gte("created_at", today).eq("status", "completed"),
                supabase.from("bookings").select("created_at,price,status,service_type").gte("created_at", since14),
                supabase.from("bookings").select("id,status,price,created_at,service_type,users(full_name),providers(full_name)").order("created_at", { ascending: false }).limit(10),
            ]);

            const totalRevenue = (completedBookings ?? []).reduce((s: number, b: { price?: number }) => s + (b.price ?? 0), 0);
            const todayRevenue = (todayBookingsRaw ?? []).reduce((s: number, b: { price?: number }) => s + (b.price ?? 0), 0);

            setStats({
                totalUsers: totalUsers ?? 0,
                totalProviders: totalProviders ?? 0,
                totalBookings: totalBookings ?? 0,
                activeBookings: activeBookings ?? 0,
                totalRevenue,
                todayRevenue,
                pendingVerifications: pendingVerifications ?? 0,
                cancelledBookings: cancelledBookings ?? 0,
            });

            // Daily data
            const dayMap: Record<string, DailyPoint> = {};
            for (let i = 13; i >= 0; i--) {
                const d = new Date(Date.now() - i * 864e5).toISOString().split("T")[0];
                dayMap[d] = { date: d.slice(5), bookings: 0, revenue: 0 };
            }
            (last14Bookings ?? []).forEach((b: { created_at: string; price?: number }) => {
                const d = b.created_at.split("T")[0];
                if (dayMap[d]) {
                    dayMap[d].bookings++;
                    dayMap[d].revenue += b.price ?? 0;
                }
            });
            setDailyData(Object.values(dayMap));

            // Status breakdown
            const statusCount: Record<string, number> = {};
            (last14Bookings ?? []).forEach((b: { status: string }) => {
                const grp = ACTIVE_STATUSES.includes(b.status) ? "active" : b.status;
                statusCount[grp] = (statusCount[grp] ?? 0) + 1;
            });
            setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

            // Service breakdown
            const svcCount: Record<string, number> = {};
            (last14Bookings ?? []).forEach((b: { service_type?: string }) => {
                const s = b.service_type ?? "Unknown";
                svcCount[s] = (svcCount[s] ?? 0) + 1;
            });
            setServiceData(
                Object.entries(svcCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([service, count]) => ({ service, count }))
            );

            // Recent bookings
            setRecentBookings(
                (recentRaw ?? []).map((b: Record<string, unknown>) => ({
                    id: String(b.id ?? ""),
                    customer_name: (b.users as { full_name?: string } | null)?.full_name ?? "—",
                    provider_name: (b.providers as { full_name?: string } | null)?.full_name ?? "—",
                    service_type: String(b.service_type ?? "—"),
                    status: String(b.status ?? ""),
                    price: Number(b.price ?? 0),
                    created_at: String(b.created_at ?? ""),
                }))
            );
        } catch (e) {
            setError("Failed to load dashboard data. Please retry.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Stat cards config
    const statCards = stats
        ? [
            { title: "Total Users", value: stats.totalUsers, icon: <Users size={18} />, color: "blue" as const, trend: undefined },
            { title: "Total Providers", value: stats.totalProviders, icon: <Briefcase size={18} />, color: "purple" as const },
            { title: "Total Bookings", value: stats.totalBookings, icon: <CalendarCheck size={18} />, color: "cyan" as const },
            { title: "Active Bookings", value: stats.activeBookings, icon: <Activity size={18} />, color: "green" as const },
            { title: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: "amber" as const },
            { title: "Today's Revenue", value: `₹${stats.todayRevenue.toLocaleString()}`, icon: <TrendingUp size={18} />, color: "green" as const },
            { title: "Pending Verifications", value: stats.pendingVerifications, icon: <Clock size={18} />, color: "amber" as const },
            { title: "Cancelled Bookings", value: stats.cancelledBookings, icon: <XCircle size={18} />, color: "red" as const },
        ]
        : [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-[1600px] mx-auto w-full"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Overview of your platform</p>
                </div>
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                    {error}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-6 mb-8">
                {loading
                    ? Array.from({ length: 8 }).map((_, i) => <StatCard key={i} title="" value="" icon={<div />} loading />)
                    : statCards.map(s => <StatCard key={s.title} {...s} />)
                }
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Bookings per day */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Bookings — Last 14 Days</h2>
                    {loading ? (
                        <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="bookings" stroke="#17375E" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Revenue per day */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Revenue — Last 14 Days (₹)</h2>
                    {loading ? (
                        <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="revenue" fill="#F4B942" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Status pie */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Booking Status Breakdown</h2>
                    {loading ? (
                        <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ) : statusData.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Top services */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Top 5 Services by Bookings</h2>
                    {loading ? (
                        <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ) : serviceData.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={serviceData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <YAxis dataKey="service" type="category" tick={{ fontSize: 10 }} width={90} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#17375E" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-extrabold text-slate-700 mb-4">Recent Bookings</h2>
                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : recentBookings.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No bookings yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-slate-100 text-left">
                                    {["ID", "Customer", "Provider", "Service", "Status", "Price", "Date"].map(h => (
                                        <th key={h} className="pb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentBookings.map((b, i) => (
                                    <tr key={b.id} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                                        <td className="px-2 py-2.5 font-mono text-xs text-slate-500">{b.id.slice(0, 8)}…</td>
                                        <td className="px-2 py-2.5 font-medium text-slate-700">{b.customer_name}</td>
                                        <td className="px-2 py-2.5 text-slate-600">{b.provider_name}</td>
                                        <td className="px-2 py-2.5 text-slate-600 capitalize">{b.service_type}</td>
                                        <td className="px-2 py-2.5"><StatusBadge status={b.status} /></td>
                                        <td className="px-2 py-2.5 font-semibold text-slate-700">₹{b.price.toLocaleString()}</td>
                                        <td className="px-2 py-2.5 text-slate-500">{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { fetchAdminStats } from "@/lib/adminService";
import { useProviderRealtimeUpdates, useBookingRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { supabase } from "@/lib/supabase";
import { updateProviderVerification } from "@/lib/adminService";
import { createProviderApprovalNotification, createProviderRejectionNotification } from "@/lib/notificationService";
import ProviderRegistrationModal from "@/components/admin/ProviderRegistrationModal";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import StatCard from "@/components/admin/StatCard";
import {
    Users, Briefcase, CalendarCheck, Activity,
    DollarSign, TrendingUp, Clock, XCircle, RefreshCw
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

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
const PIE_COLORS = ["#10b981", "#3b82f6", "#F4B942", "#ef4444"];

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
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
    const [statusData, setStatusData] = useState<StatusPoint[]>([]);
    const [serviceData, setServiceData] = useState<ServicePoint[]>([]);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Pending provider modal state
    const [pendingProvider, setPendingProvider] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await fetchAdminStats();
            if (result.error) setError(result.error);
            setStats(result.stats);
            setDailyData(result.dailyData);
            setStatusData(result.statusData);
            setServiceData(result.serviceData);
            setRecentBookings(result.recentBookings);
        } catch (e) {
            setError("Failed to load dashboard data. Please retry.");
            console.error("[Dashboard] Unhandled error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Realtime: refresh stats on provider/booking changes
    // Callbacks are stable via useLatestCallback inside the hook
    useProviderRealtimeUpdates((provider) => {
        if (!provider.is_verified) {
            setPendingProvider(provider);
            setShowModal(true);
        }
        fetchAll();
    });

    useBookingRealtimeUpdates(() => { fetchAll(); });

    // Listen for new provider_registration notifications to show popup
    useEffect(() => {
        const subscription = supabase
            .channel("dashboard-provider-registrations")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications", filter: "type=eq.provider_registration" },
                async (payload) => {
                    const notification = payload.new as any;
                    const providerId = notification.data?.provider_id;
                    if (!providerId) return;

                    const { data: provider } = await supabase
                        .from("providers")
                        .select("id, user_id, users!user_id(name, phone), provider_services(service_id, services(label)), created_at")
                        .eq("id", providerId)
                        .single();

                    if (provider) {
                        const userInfo = (provider as any).users as { name?: string; phone?: string } | null;
                        const psRows = ((provider as any).provider_services ?? []) as Array<{ service_id: string; services?: { label?: string } | null }>;
                        setPendingProvider({
                            id: provider.id,
                            user_id: provider.user_id,
                            full_name: userInfo?.name ?? "Unknown Provider",
                            service_type: psRows[0]?.services?.label ?? psRows[0]?.service_id ?? "",
                            phone: userInfo?.phone ?? "",
                            created_at: (provider as any).created_at,
                        });
                        setShowModal(true);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    const handleApproveProvider = async (providerId: string) => {
        setApproveLoading(true);
        try {
            const result = await updateProviderVerification(providerId, true);
            if (result.success) {
                await createProviderApprovalNotification(providerId, pendingProvider.full_name, pendingProvider.user_id);
                setShowModal(false);
                setPendingProvider(null);
                fetchAll();
            }
        } catch (e) {
            console.error("[Dashboard] Error approving provider:", e);
        } finally {
            setApproveLoading(false);
        }
    };

    const handleRejectProvider = async (providerId: string) => {
        setApproveLoading(true);
        try {
            const result = await updateProviderVerification(providerId, false);
            if (result.success) {
                await createProviderRejectionNotification(providerId, pendingProvider.full_name, "Admin rejected", pendingProvider.user_id);
                setShowModal(false);
                setPendingProvider(null);
                fetchAll();
            }
        } catch (e) {
            console.error("[Dashboard] Error rejecting provider:", e);
        } finally {
            setApproveLoading(false);
        }
    };

    const statCards = stats
        ? [
            { title: "Total Users", value: stats.totalUsers, icon: <Users size={18} />, color: "blue" as const },
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
        <>
            <ProviderRegistrationModal
                provider={pendingProvider}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onApprove={handleApproveProvider}
                onReject={handleRejectProvider}
                isLoading={approveLoading}
                onViewDetails={() => { setShowModal(false); navigate("/admin/provider-approvals"); }}
            />

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-[1600px] mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Admin Dashboard</h1>
                        <p className="text-slate-500 text-sm mt-1">Monitor users, providers, bookings and platform performance</p>
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
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">{error}</div>
                )}

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {loading
                        ? Array.from({ length: 8 }).map((_, i) => <StatCard key={i} title="" value="" icon={<div />} loading />)
                        : statCards.map(s =>
                            s.title === "Pending Verifications" ? (
                                <div
                                    key={s.title}
                                    onClick={() => navigate("/admin/provider-approvals")}
                                    className="cursor-pointer"
                                    title="View Provider Approvals"
                                >
                                    <StatCard {...s} />
                                </div>
                            ) : (
                                <StatCard key={s.title} {...s} />
                            )
                        )
                    }
                </div>

                {/* Summary panels */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold mb-4">System Status</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Database</span>
                                <span className="text-green-500 font-semibold">Online</span>
                            </div>
                            <div className="flex justify-between">
                                <span>API Server</span>
                                <span className="text-green-500 font-semibold">Running</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Payments</span>
                                <span className="text-green-500 font-semibold">Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold mb-4">Pending Tasks</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Provider Verifications</span>
                                <span className="font-bold text-orange-500">{stats?.pendingVerifications ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Cancelled Bookings</span>
                                <span className="font-bold text-red-500">{stats?.cancelledBookings ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Active Bookings</span>
                                <span className="font-bold text-blue-500">{stats?.activeBookings ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold mb-4">Today's Snapshot</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Revenue</span>
                                <span className="font-semibold">₹{stats?.todayRevenue ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Active Bookings</span>
                                <span className="font-semibold">{stats?.activeBookings ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Users</span>
                                <span className="font-semibold">{stats?.totalUsers ?? 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts row 1 */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
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
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h2 className="text-sm font-extrabold text-slate-700 mb-4">Booking Status Breakdown</h2>
                        {loading ? (
                            <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                        ) : statusData.length === 0 ? (
                            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                                        {statusData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

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

                {/* Recent Activity — from live recentBookings data */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Recent Activity</h2>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 rounded bg-slate-100 animate-pulse" />)}
                        </div>
                    ) : recentBookings.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No recent activity.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentBookings.slice(0, 5).map(b => (
                                <div key={b.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={b.status} />
                                        <span className="text-sm text-slate-600 capitalize">{b.service_type}</span>
                                        {b.customer_name !== "—" && (
                                            <span className="text-sm text-slate-400">· {b.customer_name}</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {new Date(b.created_at).toLocaleDateString("en-IN")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Bookings table */}
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
        </>
    );
}

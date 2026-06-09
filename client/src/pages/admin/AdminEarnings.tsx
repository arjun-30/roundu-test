import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/admin/StatCard";
import { DollarSign, TrendingUp, Users, RefreshCw } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

// Confirmed schema:
//   bookings: customer_id, provider_id, service_id, status, price, created_at
//   providers: id, user_id, rating, is_verified
//   users (via providers.users!user_id): name
//   provider_services + services: for service labels
// There is NO total_earnings or booking_count on providers — computed from bookings.
// Revenue growth calculated from prior period.

interface ProviderEarning {
    id: string;
    name: string;
    service_label: string;
    revenue: number;
    booking_count: number;
}

interface DailyEarning { date: string; revenue: number; }
interface ServiceEarning { service: string; revenue: number; }

export default function AdminEarnings() {
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [avgBookingValue, setAvgBookingValue] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [revenueGrowth, setRevenueGrowth] = useState<string | null>(null);
    const [dailyData, setDailyData] = useState<DailyEarning[]>([]);
    const [serviceData, setServiceData] = useState<ServiceEarning[]>([]);
    const [topProviders, setTopProviders] = useState<ProviderEarning[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [
                { data: bookings },
                { data: priorBookings },
            ] = await Promise.all([
                supabase
                    .from("bookings")
                    .select("price,service_id,created_at,provider_id")
                    .eq("status", "completed")
                    .gte("created_at", dateFrom)
                    .lte("created_at", dateTo + "T23:59:59"),
                // Prior period for growth calculation (same duration before dateFrom)
                supabase
                    .from("bookings")
                    .select("price")
                    .eq("status", "completed")
                    .gte("created_at", (() => {
                        const from = new Date(dateFrom);
                        const to = new Date(dateTo);
                        const duration = to.getTime() - from.getTime();
                        return new Date(from.getTime() - duration).toISOString().split("T")[0];
                    })())
                    .lte("created_at", dateFrom + "T23:59:59"),
            ]);

            const bkgs = bookings ?? [];
            const total = bkgs.reduce((s: number, b: { price?: number }) => s + (b.price ?? 0), 0);
            const priorTotal = (priorBookings ?? []).reduce((s: number, b: { price?: number }) => s + (b.price ?? 0), 0);

            setTotalRevenue(total);
            setCompletedCount(bkgs.length);
            setAvgBookingValue(bkgs.length ? Math.round(total / bkgs.length) : 0);

            // Revenue growth vs prior period
            if (priorTotal > 0) {
                const growth = ((total - priorTotal) / priorTotal) * 100;
                setRevenueGrowth(`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`);
            } else if (total > 0) {
                setRevenueGrowth("New");
            } else {
                setRevenueGrowth(null);
            }

            // Daily revenue
            const dayMap: Record<string, number> = {};
            bkgs.forEach((b: { created_at: string; price?: number }) => {
                const d = b.created_at.split("T")[0];
                dayMap[d] = (dayMap[d] ?? 0) + (b.price ?? 0);
            });
            setDailyData(
                Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, revenue]) => ({ date: date.slice(5), revenue }))
            );

            // Revenue by service_id
            const svcMap: Record<string, number> = {};
            bkgs.forEach((b: { service_id?: string; price?: number }) => {
                const s = b.service_id ?? "Unknown";
                svcMap[s] = (svcMap[s] ?? 0) + (b.price ?? 0);
            });
            setServiceData(
                Object.entries(svcMap).sort((a, b) => b[1] - a[1]).map(([service, revenue]) => ({ service, revenue }))
            );

            // Top providers by revenue in this period — aggregate from bookings
            const providerRevMap: Record<string, { revenue: number; count: number }> = {};
            bkgs.forEach((b: { provider_id?: string; price?: number }) => {
                const pid = b.provider_id ?? "";
                if (!providerRevMap[pid]) providerRevMap[pid] = { revenue: 0, count: 0 };
                providerRevMap[pid].revenue += b.price ?? 0;
                providerRevMap[pid].count++;
            });

            const topProviderIds = Object.entries(providerRevMap)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 10)
                .map(([id]) => id)
                .filter(Boolean);

            if (topProviderIds.length > 0) {
                const { data: providers } = await supabase
                    .from("providers")
                    .select("id, users!user_id(name), provider_services(service_id, services(label))")
                    .in("id", topProviderIds);

                const mapped: ProviderEarning[] = (providers ?? []).map((p: any) => {
                    const stats = providerRevMap[p.id] ?? { revenue: 0, count: 0 };
                    const psRows = (p.provider_services ?? []) as Array<{ service_id: string; services?: { label?: string } | null }>;
                    const firstLabel = psRows[0]?.services?.label ?? psRows[0]?.service_id ?? "—";
                    return {
                        id: p.id,
                        name: (p.users as { name?: string } | null)?.name ?? "—",
                        service_label: firstLabel,
                        revenue: stats.revenue,
                        booking_count: stats.count,
                    };
                }).sort((a, b) => b.revenue - a.revenue);

                setTopProviders(mapped);
            } else {
                setTopProviders([]);
            }
        } catch (e) {
            setError("Failed to load earnings data.");
            console.error(e);
        }
        setLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-3xl font-black text-slate-800">Revenue Analytics</h1>
                <p className="text-slate-500 text-sm mt-1">Monitor platform revenue, growth trends and provider performance</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className={`rounded-2xl p-5 shadow-lg ${revenueGrowth ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white" : "bg-white border border-slate-100 text-slate-800"}`}>
                        <p className={`text-xs ${revenueGrowth ? "opacity-80" : "text-slate-500"}`}>Revenue Growth</p>
                        <h2 className="text-3xl font-bold">{revenueGrowth ?? "—"}</h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <p className="text-xs text-slate-500">Total Revenue</p>
                        <h2 className="text-3xl font-bold text-slate-800">₹{totalRevenue.toLocaleString()}</h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <p className="text-xs text-slate-500">Completed Jobs</p>
                        <h2 className="text-3xl font-bold text-blue-600">{completedCount}</h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <p className="text-xs text-slate-500">Average Ticket</p>
                        <h2 className="text-3xl font-bold text-orange-500">₹{avgBookingValue.toLocaleString()}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none" />
                    <span className="text-slate-400 text-sm">to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none" />
                    <button onClick={fetchEarnings} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-red-700">Revenue Data Unavailable</h4>
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                    <button onClick={fetchEarnings} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium">Retry</button>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign size={18} />} color="green" loading={loading} />
                <StatCard title="Completed Bookings" value={completedCount} icon={<TrendingUp size={18} />} color="blue" loading={loading} />
                <StatCard title="Avg Booking Value" value={`₹${avgBookingValue.toLocaleString()}`} icon={<Users size={18} />} color="amber" loading={loading} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Daily Revenue (₹)</h2>
                    {loading ? (
                        <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ) : dailyData.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-3">💰</div>
                            <p className="font-semibold text-slate-600">No Revenue Yet</p>
                            <p className="text-xs text-slate-400">Revenue will appear here once bookings are completed</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Revenue by Service</h2>
                    {loading ? (
                        <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ) : serviceData.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-3">📊</div>
                            <p className="font-semibold text-slate-600">No Service Revenue</p>
                            <p className="text-xs text-slate-400">Service performance will appear here</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={serviceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="service" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                                <Bar dataKey="revenue" fill="#17375E" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Top Providers */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-extrabold text-slate-700 mb-4">Top Earning Providers (This Period)</h2>
                {loading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                ) : topProviders.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No provider earnings data for this period.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {["#", "Provider", "Service", "Period Revenue", "Bookings"].map(h => (
                                        <th key={h} className="pb-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {topProviders.map((p, i) => (
                                    <tr key={p.id} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                                        <td className="px-2 py-2.5 text-slate-400 font-mono text-xs">#{i + 1}</td>
                                        <td className="px-2 py-2.5 font-semibold text-slate-700">{p.name || "—"}</td>
                                        <td className="px-2 py-2.5 text-slate-500 capitalize">{p.service_label || "—"}</td>
                                        <td className="px-2 py-2.5 font-bold text-emerald-600">₹{p.revenue.toLocaleString()}</td>
                                        <td className="px-2 py-2.5 text-slate-600">{p.booking_count}</td>
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

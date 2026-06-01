import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/admin/StatCard";
import { DollarSign, TrendingUp, Users, RefreshCw } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

interface ProviderEarning {
    id: string;
    full_name: string;
    service_type: string;
    total_earnings: number;
    booking_count: number;
}

interface DailyEarning { date: string; revenue: number; }
interface ServiceEarning { service: string; revenue: number; }

export default function AdminEarnings() {
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [avgBookingValue, setAvgBookingValue] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
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
            const { data: bookings } = await supabase
                .from("bookings")
                .select("price,service_type,created_at,provider_id")
                .eq("status", "completed")
                .gte("created_at", dateFrom)
                .lte("created_at", dateTo + "T23:59:59");

            const bkgs = bookings ?? [];
            const total = bkgs.reduce((s: number, b: { price?: number }) => s + (b.price ?? 0), 0);
            setTotalRevenue(total);
            setCompletedCount(bkgs.length);
            setAvgBookingValue(bkgs.length ? Math.round(total / bkgs.length) : 0);

            // Daily revenue
            const dayMap: Record<string, number> = {};
            bkgs.forEach((b: { created_at: string; price?: number }) => {
                const d = b.created_at.split("T")[0];
                dayMap[d] = (dayMap[d] ?? 0) + (b.price ?? 0);
            });
            setDailyData(
                Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, revenue]) => ({ date: date.slice(5), revenue }))
            );

            // Revenue by service
            const svcMap: Record<string, number> = {};
            bkgs.forEach((b: { service_type?: string; price?: number }) => {
                const s = b.service_type ?? "Unknown";
                svcMap[s] = (svcMap[s] ?? 0) + (b.price ?? 0);
            });
            setServiceData(
                Object.entries(svcMap).sort((a, b) => b[1] - a[1]).map(([service, revenue]) => ({ service, revenue }))
            );

            // Top providers
            const { data: providers } = await supabase
                .from("providers")
                .select("id,full_name,service_type,total_earnings,booking_count")
                .order("total_earnings", { ascending: false })
                .limit(10);
            setTopProviders(providers ?? []);
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
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Earnings</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Platform revenue overview</p>
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

            {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}

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
                        <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data for selected range</div>
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
                        <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data</div>
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
                <h2 className="text-sm font-extrabold text-slate-700 mb-4">Top Earning Providers</h2>
                {loading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                ) : topProviders.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No provider data.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {["#", "Provider", "Service", "Total Earned", "Bookings"].map(h => (
                                        <th key={h} className="pb-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {topProviders.map((p, i) => (
                                    <tr key={p.id} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                                        <td className="px-2 py-2.5 text-slate-400 font-mono text-xs">#{i + 1}</td>
                                        <td className="px-2 py-2.5 font-semibold text-slate-700">{p.full_name || "—"}</td>
                                        <td className="px-2 py-2.5 text-slate-500 capitalize">{p.service_type || "—"}</td>
                                        <td className="px-2 py-2.5 font-bold text-emerald-600">₹{(p.total_earnings ?? 0).toLocaleString()}</td>
                                        <td className="px-2 py-2.5 text-slate-600">{p.booking_count ?? 0}</td>
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
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/admin/StatCard";
import { BarChart2, RefreshCw, Star, Percent, TrendingUp, Users } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

interface ServiceStat { service: string; count: number; }
interface CustomerStat { name: string; count: number; }
interface GeoStat { area: string; count: number; }
interface WeekStat { label: string; users: number; providers: number; }

export default function AdminReports() {
    const [cancellationRate, setCancellationRate] = useState(0);
    const [avgBookingValue, setAvgBookingValue] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [topServices, setTopServices] = useState<ServiceStat[]>([]);
    const [topCustomers, setTopCustomers] = useState<CustomerStat[]>([]);
    const [geoData, setGeoData] = useState<GeoStat[]>([]);
    const [weekData, setWeekData] = useState<WeekStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const now = new Date();
            const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
            const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14);

            const [
                { data: allBookings },
                { data: providers },
                { data: thisWeekUsers },
                { data: lastWeekUsers },
                { data: thisWeekProviders },
                { data: lastWeekProviders },
            ] = await Promise.all([
                supabase.from("bookings").select("status,price,service_type,address,user_id,users(full_name)"),
                supabase.from("providers").select("rating"),
                supabase.from("users").select("id").gte("created_at", thisWeekStart.toISOString()),
                supabase.from("users").select("id").gte("created_at", lastWeekStart.toISOString()).lt("created_at", thisWeekStart.toISOString()),
                supabase.from("providers").select("id").gte("created_at", thisWeekStart.toISOString()),
                supabase.from("providers").select("id").gte("created_at", lastWeekStart.toISOString()).lt("created_at", thisWeekStart.toISOString()),
            ]);

            const bkgs = allBookings ?? [];
            const total = bkgs.length;
            const cancelled = bkgs.filter((b: { status: string }) => b.status === "cancelled").length;
            const completed = bkgs.filter((b: { status: string }) => b.status === "completed");
            const totalRev = completed.reduce((s: number, b: { price?: number }) => s + (b.price ?? 0), 0);

            setCancellationRate(total > 0 ? Math.round((cancelled / total) * 100) : 0);
            setAvgBookingValue(completed.length > 0 ? Math.round(totalRev / completed.length) : 0);

            const ratings = (providers ?? []).map((p: { rating?: number }) => p.rating).filter(Boolean) as number[];
            setAvgRating(ratings.length > 0 ? parseFloat((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)) : 0);

            // Top services
            const svcMap: Record<string, number> = {};
            bkgs.forEach((b: { service_type?: string }) => {
                const s = b.service_type ?? "Unknown";
                svcMap[s] = (svcMap[s] ?? 0) + 1;
            });
            setTopServices(Object.entries(svcMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([service, count]) => ({ service, count })));

            // Top customers
            const custMap: Record<string, { name: string; count: number }> = {};
            bkgs.forEach((b: { user_id?: string; users?: { full_name?: string } | null }) => {
                const uid = b.user_id ?? "unknown";
                const name = b.users?.full_name ?? "Unknown";
                if (!custMap[uid]) custMap[uid] = { name, count: 0 };
                custMap[uid].count++;
            });
            setTopCustomers(Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 8).map(c => ({ name: c.name, count: c.count })));

            // Geographic breakdown (extract area from address)
            const geoMap: Record<string, number> = {};
            bkgs.forEach((b: { address?: string }) => {
                const parts = (b.address ?? "").split(",");
                const area = parts[1]?.trim() || parts[0]?.trim() || "Unknown";
                const label = area.slice(0, 20);
                geoMap[label] = (geoMap[label] ?? 0) + 1;
            });
            setGeoData(Object.entries(geoMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([area, count]) => ({ area, count })));

            // Week-over-week
            setWeekData([
                { label: "Last Week", users: lastWeekUsers?.length ?? 0, providers: lastWeekProviders?.length ?? 0 },
                { label: "This Week", users: thisWeekUsers?.length ?? 0, providers: thisWeekProviders?.length ?? 0 },
            ]);
        } catch (e) {
            setError("Failed to load report data.");
            console.error(e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Reports</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Platform analytics & health</p>
                </div>
                <button onClick={fetchReports} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard title="Cancellation Rate" value={`${cancellationRate}%`} icon={<Percent size={18} />} color="red" loading={loading} />
                <StatCard title="Avg Booking Value" value={`₹${avgBookingValue.toLocaleString()}`} icon={<TrendingUp size={18} />} color="blue" loading={loading} />
                <StatCard title="Avg Provider Rating" value={`${avgRating} ★`} icon={<Star size={18} />} color="amber" loading={loading} />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Top services */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Most Booked Services</h2>
                    {loading ? <div className="h-52 bg-slate-100 rounded-xl animate-pulse" />
                        : topServices.length === 0 ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>
                            : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={topServices} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <YAxis dataKey="service" type="category" tick={{ fontSize: 10 }} width={100} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#17375E" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                </div>

                {/* Top customers */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Most Active Customers</h2>
                    {loading ? <div className="h-52 bg-slate-100 rounded-xl animate-pulse" />
                        : topCustomers.length === 0 ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>
                            : (
                                <div className="space-y-2">
                                    {topCustomers.map((c, i) => (
                                        <div key={c.name + i} className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 font-mono w-5">#{i + 1}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className="bg-[#17375E] h-2 rounded-full" style={{ width: `${(c.count / (topCustomers[0]?.count || 1)) * 100}%` }} />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700 w-28 truncate">{c.name}</span>
                                            <span className="text-sm text-slate-500 w-8 text-right">{c.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                </div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Geo breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">Geographic Breakdown (Bookings by Area)</h2>
                    {loading ? <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                        : geoData.length === 0 ? <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No location data</div>
                            : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={geoData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="area" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#F4B942" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                </div>

                {/* Week over week */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-700 mb-4">New Signups — This Week vs Last Week</h2>
                    {loading ? <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                        : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={weekData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="users" name="Users" fill="#17375E" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="providers" name="Providers" fill="#F4B942" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                    {/* Week summary cards */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {weekData.map(w => (
                            <div key={w.label} className="bg-slate-50 rounded-xl p-3">
                                <p className="text-xs font-bold text-slate-500 mb-1">{w.label}</p>
                                <p className="text-sm font-semibold text-slate-700">{w.users} users · {w.providers} providers</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-extrabold text-slate-700 mb-4">Service Ranking</h2>
                {loading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                ) : topServices.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No data available.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {["Rank", "Service", "Bookings", "Share"].map(h => (
                                    <th key={h} className="pb-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {topServices.map((s, i) => {
                                const total = topServices.reduce((a, b) => a + b.count, 0);
                                return (
                                    <tr key={s.service} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                                        <td className="px-2 py-2 text-slate-400 font-mono text-xs">#{i + 1}</td>
                                        <td className="px-2 py-2 font-semibold text-slate-700 capitalize">{s.service}</td>
                                        <td className="px-2 py-2 text-slate-600">{s.count}</td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                                                    <div className="bg-[#17375E] h-1.5 rounded-full" style={{ width: `${(s.count / total) * 100}%` }} />
                                                </div>
                                                <span className="text-xs text-slate-500">{Math.round((s.count / total) * 100)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </motion.div>
    );
}
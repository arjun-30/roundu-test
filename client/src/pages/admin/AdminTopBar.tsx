import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Bell, Menu, ShieldCheck, X, RefreshCw } from "lucide-react";

/**
 * AdminTopBar — notifications are now driven by REAL Supabase data:
 *   • Unverified providers   -> "New Provider Registration" (routes to approval)
 *   • Newest registered users -> "New User Registered"
 *
 * Clicking a notification navigates to the right page. The bell badge shows
 * the unread count. Data refreshes on mount and every 60s.
 */

type NotificationType = "PROVIDER_REGISTRATION" | "NEW_USER";

interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    subtitle: string;
    createdAt: string;
    unread: boolean;
    providerId?: string;
    userId?: string;
}

function timeAgo(iso: string): string {
    const t = new Date(iso).getTime();
    if (!t || Number.isNaN(t)) return "";
    const secs = Math.floor((Date.now() - t) / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function AdminTopBar({ onMenuClick }: { onMenuClick?: () => void }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const panelRef = useRef<HTMLDivElement>(null);

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Build the notification feed from real data
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        const [providersRes, usersRes] = await Promise.all([
            supabase
                .from("providers")
                .select("id,full_name,service_type,created_at")
                .eq("verified", false)
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("users")
                .select("id,full_name,created_at")
                .order("created_at", { ascending: false })
                .limit(5),
        ]);

        const providerNotifs: NotificationItem[] = (providersRes.data ?? []).map(
            (p: Record<string, unknown>) => ({
                id: `provider-${String(p.id)}`,
                type: "PROVIDER_REGISTRATION",
                title: "New Provider Registration",
                subtitle: `${String(p.full_name ?? "Unnamed")}${p.service_type ? ` · ${String(p.service_type)}` : ""}`,
                createdAt: String(p.created_at ?? ""),
                unread: true,
                providerId: String(p.id),
            })
        );

        const userNotifs: NotificationItem[] = (usersRes.data ?? []).map(
            (u: Record<string, unknown>) => ({
                id: `user-${String(u.id)}`,
                type: "NEW_USER",
                title: "New User Registered",
                subtitle: String(u.full_name ?? "New user"),
                createdAt: String(u.created_at ?? ""),
                unread: true,
                userId: String(u.id),
            })
        );

        const merged = [...providerNotifs, ...userNotifs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotifications(merged.map(n => ({ ...n, unread: !readIds.has(n.id) })));
        setLoading(false);
    }, [readIds]);

    useEffect(() => {
        fetchNotifications();
        const t = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(t);
    }, [fetchNotifications]);

    // Close dropdown on outside click
    useEffect(() => {
        function handle(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    const unreadCount = notifications.filter(n => n.unread).length;

    const timeStr = now
        .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
        .toLowerCase();
    const dateStr = now.toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
    });

    const routeFor = (n: NotificationItem): string => {
        switch (n.type) {
            case "PROVIDER_REGISTRATION":
                return `/admin/providers?status=pending&highlight=${n.providerId}`;
            case "NEW_USER":
                return "/admin/users";
            default:
                return "/admin";
        }
    };

    const handleNotificationClick = (n: NotificationItem) => {
        setReadIds(prev => new Set(prev).add(n.id));
        setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, unread: false } : x)));
        setOpen(false);
        navigate(routeFor(n));
    };

    return (
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 h-16 bg-white border-b border-slate-100">
            <button
                onClick={onMenuClick}
                className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="text-right hidden sm:block leading-tight">
                <p className="text-sm font-bold text-slate-700">{timeStr}</p>
                <p className="text-xs text-slate-400">{dateStr}</p>
            </div>

            <div className="relative" ref={panelRef}>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={fetchNotifications}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
                                    aria-label="Refresh"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 space-y-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-slate-400">No new notifications</p>
                            ) : (
                                notifications.map(n => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className="w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-blue-50/60 transition-colors flex items-start gap-2 cursor-pointer"
                                    >
                                        {n.unread && (
                                            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#F4B942] shrink-0" />
                                        )}
                                        <span className={n.unread ? "min-w-0" : "min-w-0 pl-4"}>
                                            <p className="text-sm font-semibold text-slate-700">{n.title}</p>
                                            <p className="text-xs text-slate-500 truncate">{n.subtitle}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setOpen(false);
                                navigate("/admin/providers?status=pending");
                            }}
                            className="w-full py-3 text-center text-sm font-semibold text-[#17375E] hover:bg-slate-50 transition-colors"
                        >
                            View All Notifications
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 pl-2">
                <div className="w-9 h-9 rounded-xl bg-[#17375E] text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="hidden md:block leading-tight">
                    <p className="text-sm font-bold text-slate-700">Admin</p>
                    <p className="text-xs text-slate-400">Super Admin</p>
                </div>
            </div>
        </header>
    );
}
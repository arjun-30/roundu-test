import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, ShieldCheck, X, CheckCheck } from "lucide-react";
import { fetchAdminNotifications, markAsRead, markAllAdminNotificationsRead, DatabaseNotification } from "@/lib/notificationService";
import { useAdminNotificationUpdates } from "@/hooks/useRealtimeUpdates";

interface AdminTopBarProps {
    onMenuClick: () => void;
}

function getNotificationRoute(n: DatabaseNotification): string | null {
    switch (n.type) {
        case "provider_registration": {
            const pid = n.data?.provider_id;
            return pid
                ? `/admin/provider-approvals?highlight=${pid}`
                : "/admin/provider-approvals";
        }
        case "provider_approved":
        case "provider_rejected":
            return "/admin/provider-approvals";
        case "booking_cancelled":
        case "booking_created":
            return "/admin/bookings";
        case "refund_requested":
            return "/admin/bookings";
        default:
            return null;
    }
}

function getNotificationIcon(type: string): string {
    switch (type) {
        case "provider_registration": return "🆕";
        case "provider_approved": return "✅";
        case "provider_rejected": return "❌";
        case "booking_cancelled": return "🚫";
        case "booking_created": return "📋";
        case "refund_requested": return "💰";
        default: return "🔔";
    }
}

export default function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const loadNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const data = await fetchAdminNotifications(20);
            setNotifications(data);
        } catch (e) {
            console.error("[AdminTopBar] Error fetching notifications:", e);
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => { loadNotifications(); }, []);

    // Realtime: prepend new admin notifications as they arrive
    useAdminNotificationUpdates((newNotification) => {
        // Only show admin-relevant notification types
        const adminTypes = ["provider_registration", "provider_approved", "provider_rejected", "booking_cancelled", "refund_requested"];
        if (adminTypes.includes(newNotification.type)) {
            setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
        }
    });

    // Clock
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const handleNotificationClick = async (n: DatabaseNotification) => {
        if (!n.is_read) {
            await markAsRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        }
        const route = getNotificationRoute(n);
        if (route) {
            setShowNotifications(false);
            navigate(route);
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAdminNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const formatTime = (createdAt: string): string => {
        const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return (
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-4 sticky top-0 z-30 shadow-sm">
            {/* Mobile Menu */}
            <button
                onClick={onMenuClick}
                className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <span className="lg:hidden font-extrabold text-[#17375E] text-base tracking-tight">RoundU</span>

            <div className="flex-1" />

            {/* Clock */}
            <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-700">{timeStr}</span>
                <span className="text-[10px] text-slate-400">{dateStr}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
                <button
                    onClick={() => setShowNotifications(v => !v)}
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">{unreadCount}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            title="Mark all as read"
                                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                                        >
                                            <CheckCheck size={14} />
                                        </button>
                                    )}
                                    <button onClick={() => setShowNotifications(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="max-h-80 overflow-y-auto">
                                {loadingNotifications ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <div className="text-4xl mb-2">🔔</div>
                                        <p className="text-slate-400 text-sm">No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.map((item) => {
                                        const route = getNotificationRoute(item);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleNotificationClick(item)}
                                                className={`p-4 border-b last:border-0 transition-colors ${
                                                    route ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                                                } ${!item.is_read ? "bg-blue-50/60" : ""}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-lg shrink-0">{getNotificationIcon(item.type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`text-sm ${!item.is_read ? "font-semibold text-slate-800" : "font-medium text-slate-700"} leading-tight`}>
                                                                {item.title}
                                                            </p>
                                                            {!item.is_read && (
                                                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                                                            )}
                                                        </div>
                                                        {item.message && (
                                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.message}</p>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-[10px] text-slate-400">{formatTime(item.created_at)}</span>
                                                            {route && (
                                                                <span className="text-[10px] text-blue-500 font-semibold">View →</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                                <button
                                    onClick={() => { setShowNotifications(false); navigate("/admin/provider-approvals"); }}
                                    className="text-sm text-[#17375E] font-semibold hover:underline"
                                >
                                    View Pending Approvals →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Admin Badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-[#17375E] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-slate-700 leading-tight">Admin</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Super Admin</p>
                </div>
            </div>
        </header>
    );
}

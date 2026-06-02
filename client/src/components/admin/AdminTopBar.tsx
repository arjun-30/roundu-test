import { useState, useEffect } from "react";
import {
    Menu,
    Bell,
    ShieldCheck,
    X,
} from "lucide-react";

interface AdminTopBarProps {
    onMenuClick: () => void;
}

export default function AdminTopBar({
    onMenuClick,
}: AdminTopBarProps) {
    const [now, setNow] = useState(new Date());
    const [showNotifications, setShowNotifications] =
        useState(false);

    useEffect(() => {
        const t = setInterval(
            () => setNow(new Date()),
            1000
        );

        return () => clearInterval(t);
    }, []);

    const notifications = [
        {
            id: 1,
            title: "New Provider Registration",
            time: "2 mins ago",
        },
        {
            id: 2,
            title: "Booking Cancelled",
            time: "5 mins ago",
        },
        {
            id: 3,
            title: "Refund Request",
            time: "12 mins ago",
        },
        {
            id: 4,
            title: "New User Registered",
            time: "20 mins ago",
        },
    ];

    const dateStr = now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

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
            <span className="lg:hidden font-extrabold text-[#17375E] text-base tracking-tight">
                RoundU
            </span>

            <div className="flex-1" />

            {/* Time */}
            <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-700">
                    {timeStr}
                </span>

                <span className="text-[10px] text-slate-400">
                    {dateStr}
                </span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
                <button
                    onClick={() =>
                        setShowNotifications(
                            !showNotifications
                        )
                    }
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    <Bell size={18} />

                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                        {notifications.length}
                    </span>
                </button>

                {showNotifications && (
                    <>
                        {/* Overlay */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() =>
                                setShowNotifications(false)
                            }
                        />

                        {/* Dropdown */}
                        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="font-bold text-slate-800">
                                    Notifications
                                </h3>

                                <button
                                    onClick={() =>
                                        setShowNotifications(false)
                                    }
                                    className="p-1 hover:bg-slate-100 rounded-lg"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-4 border-b hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <p className="text-sm font-medium text-slate-700">
                                            {item.title}
                                        </p>

                                        <span className="text-xs text-slate-400">
                                            {item.time}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-slate-50 text-center">
                                <button className="text-sm text-[#17375E] font-semibold">
                                    View All Notifications
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
                    <p className="text-xs font-semibold text-slate-700 leading-tight">
                        Admin
                    </p>

                    <p className="text-[10px] text-slate-400 leading-tight">
                        Super Admin
                    </p>
                </div>
            </div>

        </header>
    );
}
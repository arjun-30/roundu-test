import { useState, useEffect } from "react";
import { Menu, Bell, ShieldCheck } from "lucide-react";

interface AdminTopBarProps {
    onMenuClick: () => void;
}

export default function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const dateStr = now.toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    return (
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-4 sticky top-0 z-30 shadow-sm">
            {/* Mobile menu toggle */}
            <button
                onClick={onMenuClick}
                className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Wordmark (mobile) */}
            <span className="lg:hidden font-extrabold text-[#17375E] text-base tracking-tight">RoundU</span>

            <div className="flex-1" />

            {/* Date / time */}
            <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-700">{timeStr}</span>
                <span className="text-[10px] text-slate-400">{dateStr}</span>
            </div>

            {/* Notification bell */}
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                <Bell className="w-4.5 h-4.5" size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F4B942] ring-2 ring-white" />
            </button>

            {/* Admin badge */}
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
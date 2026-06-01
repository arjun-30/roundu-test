import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: number; // percentage change, positive = up, negative = down
    trendLabel?: string;
    color?: "blue" | "amber" | "green" | "red" | "purple" | "cyan";
    loading?: boolean;
}

const colorMap = {
    blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", value: "text-blue-700" },
    amber: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600", value: "text-amber-700" },
    green: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", value: "text-emerald-700" },
    red: { bg: "bg-red-50", icon: "bg-red-100 text-red-600", value: "text-red-700" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", value: "text-purple-700" },
    cyan: { bg: "bg-cyan-50", icon: "bg-cyan-100 text-cyan-600", value: "text-cyan-700" },
};

export default function StatCard({
    title,
    value,
    icon,
    trend,
    trendLabel,
    color = "blue",
    loading = false,
}: StatCardProps) {
    const c = colorMap[color];

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100" />
                    <div className="w-16 h-4 rounded bg-slate-100" />
                </div>
                <div className="w-24 h-8 rounded bg-slate-100 mb-1" />
                <div className="w-32 h-3 rounded bg-slate-100" />
            </div>
        );
    }

    const trendPositive = trend !== undefined && trend > 0;
    const trendNegative = trend !== undefined && trend < 0;
    const trendNeutral = trend !== undefined && trend === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <span
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendPositive
                                ? "bg-emerald-50 text-emerald-600"
                                : trendNegative
                                    ? "bg-red-50 text-red-500"
                                    : "bg-slate-100 text-slate-500"
                            }`}
                    >
                        {trendPositive && <TrendingUp className="w-3 h-3" />}
                        {trendNegative && <TrendingDown className="w-3 h-3" />}
                        {trendNeutral && <Minus className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>

            <p className="text-2xl font-extrabold text-slate-800 leading-tight">
                {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">{title}</p>

            {trendLabel && (
                <p className="text-xs text-slate-400 mt-2">{trendLabel}</p>
            )}
        </motion.div>
    );
}
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Users, Briefcase, CalendarCheck,
    DollarSign, BarChart2, LogOut, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/providers", label: "Providers", icon: Briefcase },
    { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
    { to: "/admin/earnings", label: "Earnings", icon: DollarSign },
    { to: "/admin/reports", label: "Reports", icon: BarChart2 },
];

interface AdminSidebarProps {
    open: boolean;
    onClose: () => void;
}

function NavItem({ to, label, icon: Icon, end, onClick }: {
    to: string; label: string; icon: React.ElementType; end?: boolean; onClick?: () => void;
}) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                }`
            }
        >
            <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
            {label}
        </NavLink>
    );
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("roundu_admin_token");
        navigate("/admin/login");
    };

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
                <div>
                    <span className="text-white font-extrabold text-xl tracking-tight">RoundU</span>
                    <span className="block text-blue-200/70 text-xs font-medium mt-0.5">Admin Portal</span>
                </div>
                <button
                    onClick={onClose}
                    className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-blue-100/60 hover:bg-white/10"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map(item => (
                    <NavItem key={item.to} {...item} onClick={onClose} />
                ))}
            </nav>

            {/* Logout */}
            <div className="px-3 pb-5 border-t border-white/10 pt-3">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-300/80 hover:bg-red-500/20 hover:text-red-200 transition-all duration-150"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#17375E] min-h-screen sticky top-0">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="lg:hidden fixed inset-0 bg-black/40 z-40"
                        />
                        <motion.aside
                            key="drawer"
                            initial={{ x: -240 }}
                            animate={{ x: 0 }}
                            exit={{ x: -240 }}
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 w-56 bg-[#17375E] z-50 shadow-2xl"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
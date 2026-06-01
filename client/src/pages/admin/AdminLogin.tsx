import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_PASSWORD = "rdu-admin-2025";
const TOKEN_KEY = "roundu_admin_token";
const TOKEN_VALUE = "rdu-admin-2025";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await new Promise(r => setTimeout(r, 400)); // slight delay for feel

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem(TOKEN_KEY, TOKEN_VALUE);
            navigate("/admin");
        } else {
            setError("Incorrect password. Try again.");
            setShake(true);
            setLoading(false);
            setTimeout(() => setShake(false), 600);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#17375E]/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#F4B942]/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative z-10 w-full max-w-sm"
            >
                {/* Card */}
                <motion.div
                    animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
                >
                    {/* Header band */}
                    <div className="bg-[#17375E] px-8 py-7 text-center">
                        <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <ShieldCheck className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">RoundU</h1>
                        <p className="text-blue-200/80 text-sm mt-0.5 font-medium">Admin Portal</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="px-8 py-7 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                                Admin Password
                            </label>
                            <div className="relative">
                                <input
                                    type={show ? "text" : "password"}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(""); }}
                                    placeholder="Enter admin password"
                                    autoComplete="current-password"
                                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm font-medium text-slate-800 bg-slate-50 outline-none transition-all duration-150 ${error
                                            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                            : "border-slate-200 focus:border-[#17375E] focus:ring-2 focus:ring-[#17375E]/10"
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-1.5 mt-2 text-xs text-red-500 font-medium"
                                >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {error}
                                </motion.p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="w-full py-3 rounded-xl bg-[#17375E] text-white text-sm font-bold tracking-wide hover:bg-[#1e4a7a] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : null}
                            {loading ? "Verifying…" : "Login to Admin"}
                        </button>
                    </form>
                </motion.div>

                <p className="text-center text-xs text-slate-400 mt-5 font-medium">
                    🔒 Admin access only · Unauthorized access is prohibited
                </p>
            </motion.div>
        </div>
    );
}
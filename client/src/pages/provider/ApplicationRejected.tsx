import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  XCircle, Mail, LogOut, AlertTriangle, Clock,
  FileX, ShieldOff, HelpCircle, ArrowRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useProviderApprovalStatus } from "@/hooks/useProviderApprovalStatus";

const SUPPORT_EMAIL = "Rounduadmin@gmail.com";

export default function ApplicationRejected() {
  const navigate = useNavigate();
  const { user, dispatch } = useApp();
  const { rejectionReason, loading } = useProviderApprovalStatus(user?.id);

  // If this page is reached but the provider is now approved, redirect to dashboard
  const { status } = useProviderApprovalStatus(user?.id);
  useEffect(() => {
    if (!loading && status === "approved") {
      navigate("/provider", { replace: true });
    }
  }, [status, loading, navigate]);

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login", { replace: true });
  };

  const handleContactAdmin = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Provider Account Review - ${user?.name ?? ""}&body=Hello RoundU Admin Team,%0A%0AMy name is ${user?.name ?? ""}. I would like to request a review of my provider application.%0A%0APhone: ${user?.phone ?? ""}%0AUser ID: ${user?.id ?? ""}%0A%0APlease assist me with the next steps.%0A%0AThank you.`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-slate-100 flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-red-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-100/60 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="bg-white rounded-3xl shadow-2xl shadow-red-100/50 border border-red-100/80 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 pt-8 pb-7 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
            >
              <XCircle className="w-10 h-10 text-white" strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-2xl font-extrabold text-white leading-tight mb-2">
              Application Not Approved
            </h1>
            <p className="text-red-100 text-sm leading-relaxed">
              Your provider application has not been approved<br />by the RoundU Verification Team.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">

            {/* Main message */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                After reviewing your application, we were unable to approve your provider account at this time.
              </p>
            </div>

            {/* Rejection Reason — shown prominently when available */}
            {rejectionReason && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border-l-4 border-red-400 bg-red-50/80 rounded-r-2xl px-4 py-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileX size={15} className="text-red-500 shrink-0" />
                  <span className="text-xs font-extrabold text-red-600 uppercase tracking-wide">Rejection Reason</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {rejectionReason}
                </p>
              </motion.div>
            )}

            {/* Possible reasons */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">This may be due to:</p>
              {[
                "Missing or unclear information",
                "Incomplete documentation",
                "Verification mismatch",
                "Quality or compliance requirements not met",
              ].map((reason) => (
                <div key={reason} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                  <span className="text-sm text-slate-600">{reason}</span>
                </div>
              ))}
            </div>

            {/* Account status notice */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <ShieldOff size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 leading-relaxed">
                Your provider account has been <strong>temporarily restricted</strong> until the issue is reviewed and resolved.
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Contact Support */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-slate-500" />
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Need Assistance?</span>
              </div>
              <p className="text-sm text-slate-600">
                Contact the RoundU Admin Team — our team will review your case and guide you through the next steps.
              </p>
              <button
                onClick={handleContactAdmin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#17375E] text-white text-sm font-bold hover:bg-[#0f2644] active:scale-[0.98] transition-all"
              >
                <Mail size={15} />
                {SUPPORT_EMAIL}
                <ArrowRight size={13} className="ml-auto" />
              </button>
            </div>

            {/* Processing notice */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-700 mb-1">Review & Resolution Time</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  If all required information is provided correctly, the verification team will review your case within <strong>2 working days</strong>. Please avoid submitting multiple requests during the review period.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleContactAdmin}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#17375E] to-[#2255a0] text-white text-sm font-extrabold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                <Mail size={15} />
                Contact Admin
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>

          </div>
        </motion.div>

        {/* Footer notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-slate-400 mt-6 px-4 leading-relaxed"
        >
          <AlertTriangle size={11} className="inline mr-1 mb-0.5" />
          Your account will be automatically restored once approved by the admin team.
        </motion.p>
      </div>
    </div>
  );
}

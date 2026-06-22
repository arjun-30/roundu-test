import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, MoreHorizontal, Mail, LogOut, XCircle, ArrowRight } from 'lucide-react';
import { registerProvider } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { uploadProviderVideo } from '@/lib/supabase';
import { createProviderRegistrationNotification } from '@/lib/notificationService';
import axios from 'axios';
import { API_BASE_URL } from '@/config/env';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | null;

const PendingApproval = () => {
  const navigate = useNavigate();
  const { providerRegistrationDraft, user, dispatch } = useApp();

  const [notification, setNotification] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Real approval status polled from server
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkApprovalStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/providers/dashboard?userId=${user.id}`,
        { timeout: 5000 }
      );
      if (data?.success && data?.data?.provider) {
        const s = data.data.provider.approval_status as ApprovalStatus;
        const r = data.data.provider.rejection_reason as string | null;
        if (s === 'approved' || s === 'rejected') {
          setApprovalStatus(s);
          setRejectionReason(r ?? null);
        }
      }
    } catch {
      // Server unreachable — retry on next interval
    }
  }, [user?.id]);

  // Start polling immediately on mount
  useEffect(() => {
    checkApprovalStatus();
    pollRef.current = setInterval(checkApprovalStatus, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkApprovalStatus]);

  // Once a decision is made, stop polling and handle navigation
  useEffect(() => {
    if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    if (approvalStatus === 'approved') {
      dispatch({ type: 'SET_ROLE', role: 'provider' });
      dispatch({ type: 'UPDATE_USER', user: { role: 'provider', accountType: 'provider' } });
      const t = setTimeout(() => navigate('/provider'), 3000);
      return () => clearTimeout(t);
    }
  }, [approvalStatus, navigate, dispatch]);

  // ── APPROVED STATE ──────────────────────────────────────────────────────────
  if (approvalStatus === 'approved') {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />

        {/* Big green tick */}
        <div className="relative mb-8 mt-12">
          <div className="w-28 h-28 bg-green-500/10 rounded-[36px] flex items-center justify-center shadow-lg shadow-green-500/10">
            <CheckCircle2 size={60} className="text-green-500" strokeWidth={1.8} fill="rgba(34,197,94,0.12)" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-100 border border-green-200 rounded-2xl flex items-center justify-center shadow-md">
            <span className="text-lg">🎉</span>
          </div>
        </div>

        <div className="space-y-3 max-w-[320px]">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            You're <span className="text-green-500">Approved!</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your profile has been verified by our team. You can now go online and start accepting service requests.
          </p>
        </div>

        {/* All-green checklist */}
        <div className="w-full max-w-[320px] bg-card border border-green-100 rounded-[32px] p-6 my-10 shadow-xl shadow-green-500/5 text-left">
          <h3 className="text-[10px] font-black text-green-500/70 uppercase tracking-[0.2em] mb-5 px-1">Application Status</h3>
          <div className="space-y-4">
            {['Identity Verified', 'Bank Account Linked', 'Portfolio Review', 'Admin Approved ✓'].map(label => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
                <span className="text-sm font-bold text-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col w-full max-w-[320px] gap-3 mb-8">
          <button
            onClick={() => navigate('/provider')}
            className="w-full h-14 rounded-2xl bg-green-500 text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-green-500/30 active:scale-[0.98] transition-all"
          >
            <ArrowRight size={20} strokeWidth={2.5} />
            Go to Dashboard
          </button>
          <p className="text-[10px] text-muted-foreground/60 text-center">Redirecting automatically in a few seconds…</p>
        </div>

        <button
          onClick={() => { dispatch({ type: 'LOGOUT' }); navigate('/login', { replace: true }); }}
          className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-4"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    );
  }

  // ── REJECTED STATE ──────────────────────────────────────────────────────────
  if (approvalStatus === 'rejected') {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />

        <div className="relative mb-8 mt-12">
          <div className="w-28 h-28 bg-red-500/10 rounded-[36px] flex items-center justify-center">
            <XCircle size={56} className="text-red-500" />
          </div>
        </div>

        <div className="space-y-3 max-w-[320px]">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Application <span className="text-red-500">Rejected</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unfortunately your application was not approved at this time. Contact the admin team for more information.
          </p>
          {rejectionReason && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-left mt-2">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Reason</p>
              <p className="text-sm text-red-700 font-medium">{rejectionReason}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col w-full max-w-[320px] gap-3 mt-10 mb-8">
          <a
            href={`mailto:admin@roundu.com?subject=Provider Application Rejected — ${user?.name ?? ''}&body=Hello,%0A%0APlease review my rejected application.%0A%0AUser ID: ${user?.id ?? ''}%0APhone: ${user?.phone ?? ''}%0A%0AThank you.`}
            className="w-full h-14 rounded-2xl bg-[#17375E] text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
          >
            <Mail size={20} />
            Contact Admin
          </a>
        </div>

        <button
          onClick={() => { dispatch({ type: 'LOGOUT' }); navigate('/login', { replace: true }); }}
          className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-4"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    );
  }

  // ── PENDING STATE (default) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative mb-8 mt-12 group">
        <div className="w-28 h-28 bg-accent/10 rounded-[36px] flex items-center justify-center animate-bounce-subtle">
          <Clock size={56} className="text-accent" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <MoreHorizontal size={20} className="text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-4 max-w-[320px]">
        {notification && <div className="bg-secondary/10 text-blue-700 p-3 rounded-xl text-sm font-semibold mb-2">{notification}</div>}
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold mb-2">{error}</div>}
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight animate-fade-in">
          Verification <br /><span className="text-accent">In Progress</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
          We're currently reviewing your documents. Our team usually approves profiles within <span className="text-foreground font-bold">24 hours</span>.
        </p>
      </div>

      {/* Checklist */}
      <div className="w-full max-w-[320px] bg-card border border-border rounded-[32px] p-6 my-10 animate-fade-in shadow-xl shadow-accent/5 text-left relative z-10" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-5 px-1">Application Status</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-foreground/80">Identity Verified</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-foreground/80">Bank Account Linked</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-foreground/80">Portfolio Review</span>
          </div>

          <div className="h-px bg-border my-2 mx-1" />

          <div className="flex items-center gap-4 group">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-r-transparent animate-spin flex-shrink-0" />
            <span className="text-sm font-extrabold text-accent">Final Admin Approval</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-[320px] gap-3 mb-8 relative z-10">
        <button
          disabled={isLoading}
          onClick={async () => {
            if (!user?.id) {
              setError("User not authenticated");
              setTimeout(() => setError(""), 3000);
              return;
            }
            setIsLoading(true);
            try {
              const res = await registerProvider({
                userId: user.id,
                bio: providerRegistrationDraft.bio || "Professional Service Provider",
                experienceYears: providerRegistrationDraft.experienceYears || 2,
                workingHours: providerRegistrationDraft.workingHours || "9 AM - 6 PM",
                serviceRadius: providerRegistrationDraft.serviceRadius || 15,
                serviceIds: providerRegistrationDraft.serviceIds && providerRegistrationDraft.serviceIds.length > 0
                  ? providerRegistrationDraft.serviceIds
                  : ['plumber']
              });
              if (!res.success) throw new Error(res.message || "Registration failed");

              if (providerRegistrationDraft.videoFile) {
                try {
                  await uploadProviderVideo(user.id, providerRegistrationDraft.videoFile);
                } catch (uploadErr) {
                  console.error("Failed to upload video introduction:", uploadErr);
                }
              }

              createProviderRegistrationNotification(
                res.data?.id ?? "",
                user.name ?? "Provider",
                providerRegistrationDraft.serviceIds ?? []
              ).catch(err => console.error("[PendingApproval] Notification error:", err));

              dispatch({ type: 'SET_ROLE', role: 'provider' });
              dispatch({ type: 'UPDATE_USER', user: { role: 'provider', accountType: 'provider' } });
              setNotification("Registration successful! Waiting for admin approval…");

              // Kick off polling immediately after registration
              checkApprovalStatus();
            } catch (err) {
              const errorVal = err as Error;
              setError(errorVal.message || 'Connection failed');
              setTimeout(() => setError(""), 3000);
            } finally {
              setIsLoading(false);
            }
          }}
          className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-accent/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <CheckCircle2 size={20} strokeWidth={2.5} />
          {isLoading ? "Submitting..." : "Complete Registration"}
        </button>
      </div>

      {/* Contact Admin */}
      <div className="w-full max-w-[320px] bg-blue-50 border border-blue-100 rounded-[24px] p-5 mb-6 text-left relative z-10">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.15em] mb-3">Need Help?</p>
        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
          If you have questions about your application status, contact the admin team directly.
        </p>
        <a
          href={`mailto:admin@roundu.com?subject=Provider Application Status — ${user?.name ?? ""}&body=Hello,%0A%0APlease update me on the status of my provider application.%0A%0AUser ID: ${user?.id ?? ""}%0APhone: ${user?.phone ?? ""}%0A%0AThank you.`}
          className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#17375E] text-white text-sm font-bold justify-center hover:bg-[#0f2644] transition-all active:scale-[0.98]"
        >
          <Mail size={14} />
          admin@roundu.com
        </a>
      </div>

      <button
        onClick={() => { dispatch({ type: "LOGOUT" }); navigate("/login", { replace: true }); }}
        className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-4"
      >
        <LogOut size={14} /> Sign out
      </button>

      <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide flex items-center gap-2 uppercase">
        <Clock size={12} /> Under review — typically 24 hours
      </p>
    </div>
  );
};

export default PendingApproval;

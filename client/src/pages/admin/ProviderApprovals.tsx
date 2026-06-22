import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/config/env";
import { approveProvider as supabaseApprove, rejectProvider as supabaseReject } from "@/lib/adminService";
import {
  createProviderApprovalNotification,
  createProviderRejectionNotification,
} from "@/lib/notificationService";

function getAdminHeaders() {
  return { "x-admin-key": localStorage.getItem("roundu_admin_token") ?? "" };
}
import {
  ShieldCheck, ShieldX, Eye, Search, RefreshCw, X,
  CheckCircle, XCircle, Clock, UserCheck, Filter,
  ChevronDown, Phone, Mail, Briefcase, Star, Calendar,
  AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProviderRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  kyc_status: string;
  service_labels: string[];
  rating: number | null;
  is_verified: boolean;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected" | null;
  is_online: boolean;
  created_at: string;
  rejection_reason?: string;
}

type Tab = "pending" | "approved" | "rejected";
type SortOrder = "newest" | "oldest";

// ── Helpers ───────────────────────────────────────────────────────────────────

function useLatestCallback<T extends (...args: any[]) => any>(fn: T) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return ref;
}

function KycBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    unverified: "bg-slate-100 text-slate-500",
    rejected: "bg-red-100 text-red-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProviderApprovals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [tab, setTab] = useState<Tab>("pending");
  const [allProviders, setAllProviders] = useState<ProviderRow[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // provider id being actioned

  // View Details modal
  const [detailProvider, setDetailProvider] = useState<ProviderRow | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<ProviderRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Ref map for highlighted row scroll
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Try server API first — bypasses Supabase RLS and works across DB boundaries.
      // Falls back to Supabase if the server is unreachable (e.g. local dev without server running).
      let rows: ProviderRow[] = [];

      try {
        const { data: res } = await axios.get(`${API_BASE_URL}/admin/providers`, {
          headers: getAdminHeaders(),
          timeout: 5000,
        });
        if (res.success) {
          rows = (res.data ?? []).map((raw: any) => ({
            id: raw.id,
            user_id: raw.user_id,
            name: raw.name || raw.phone || raw.email || "Unknown",
            email: raw.email ?? "—",
            phone: raw.phone ?? "—",
            kyc_status: raw.kyc_status ?? "unverified",
            service_labels: Array.isArray(raw.service_labels) ? raw.service_labels.filter(Boolean) : [],
            rating: raw.rating ?? null,
            is_verified: raw.is_verified ?? false,
            is_active: raw.is_active ?? true,
            approval_status: raw.approval_status ?? null,
            is_online: raw.is_online ?? false,
            created_at: raw.created_at,
            rejection_reason: raw.rejection_reason ?? undefined,
          }));
          setAllProviders(rows);
          return;
        }
      } catch {
        console.warn("[ProviderApprovals] Server API unavailable, falling back to Supabase");
      }

      // Supabase fallback — single join query (FK relationships confirmed working)
      const { data: providers, error: provErr } = await supabase
        .from("providers")
        .select(`
          id, user_id, is_verified, is_active, is_online, approval_status,
          rejection_reason, rating, created_at,
          users!user_id(name, email, phone, kyc_status),
          provider_services(service_id, services(label))
        `)
        .order("created_at", { ascending: false });
      if (provErr) throw provErr;

      if (!providers || providers.length === 0) {
        setAllProviders([]);
        return;
      }

      rows = (providers as any[]).map((raw) => ({
        id: raw.id,
        user_id: raw.user_id,
        name: raw.users?.name || raw.users?.phone || raw.users?.email || "Unknown",
        email: raw.users?.email ?? "—",
        phone: raw.users?.phone ?? "—",
        kyc_status: raw.users?.kyc_status ?? "unverified",
        service_labels: (raw.provider_services ?? []).map((ps: any) => ps.services?.label).filter(Boolean),
        rating: raw.rating ?? null,
        is_verified: raw.is_verified ?? false,
        is_active: raw.is_active ?? true,
        approval_status: raw.approval_status ?? null,
        is_online: raw.is_online ?? false,
        created_at: raw.created_at,
        rejection_reason: raw.rejection_reason ?? undefined,
      }));

      setAllProviders(rows);
    } catch (e: any) {
      setError("Failed to load providers. Please retry.");
      console.error("[ProviderApprovals] Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime — new provider registrations ───────────────────────────────

  const fetchAllRef = useLatestCallback(fetchAll);

  useEffect(() => {
    const channel = supabase
      .channel("provider-approvals-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "providers" }, () => {
        fetchAllRef.current();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers" }, () => {
        fetchAllRef.current();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-switch tab and scroll to highlighted provider ──────────────────

  useEffect(() => {
    if (!highlightId || loading) return;
    const provider = allProviders.find(p => p.id === highlightId);
    if (!provider) return;

    // Determine which tab this provider belongs to
    if (provider.approval_status === "approved" || (provider.approval_status == null && provider.is_verified)) {
      setTab("approved");
    } else if (provider.approval_status === "rejected" || provider.is_active === false) {
      setTab("rejected");
    } else {
      setTab("pending");
    }

    // Scroll after tab switch
    setTimeout(() => {
      const el = rowRefs.current.get(highlightId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  }, [highlightId, allProviders, loading]);

  // Clear highlight param after 3 seconds
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => {
      setSearchParams({}, { replace: true });
    }, 4000);
    return () => clearTimeout(t);
  }, [highlightId, setSearchParams]);

  // ── Derived lists ─────────────────────────────────────────────────────────

  const pending = allProviders.filter(p =>
    p.approval_status === "pending" || (p.approval_status == null && !p.is_verified)
  );
  const approved = allProviders.filter(p =>
    p.approval_status === "approved" || (p.approval_status == null && p.is_verified === true)
  );
  const rejected = allProviders.filter(p =>
    p.approval_status === "rejected" || p.is_active === false
  );

  const activeList = tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  const filtered = activeList
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.service_labels.some(s => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === "newest" ? -diff : diff;
    });

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApprove = async (provider: ProviderRow) => {
    setActionLoading(provider.id);
    try {
      // Try server API first (direct DB — bypasses Supabase schema cache issues)
      let success = false;
      try {
        const { data: res } = await axios.post(
          `${API_BASE_URL}/admin/providers/${provider.id}/approve`,
          {},
          { headers: getAdminHeaders(), timeout: 5000 }
        );
        success = res.success;
        if (!success) throw new Error(res.error);
      } catch (serverErr: any) {
        // Only block fallback for non-404 server errors (auth failure, 5xx, etc).
        // A 404 means the provider is in Supabase but not in Railway DB — fall through.
        const status = serverErr?.response?.status;
        if (status && status !== 404) throw serverErr;
        const fallback = await supabaseApprove(provider.id);
        if (!fallback.success) throw new Error(fallback.error ?? "Approval failed");
        success = true;
      }

      if (success) {
        createProviderApprovalNotification(provider.id, provider.name, provider.user_id).catch(() => {});
        setAllProviders(prev =>
          prev.map(p => p.id === provider.id
            ? { ...p, is_verified: true, is_active: true, approval_status: "approved", rejection_reason: undefined }
            : p
          )
        );
        setTab("approved");
        setSuccessMsg(`${provider.name} has been approved.`);
        setTimeout(() => setSuccessMsg(""), 4000);
        fetchAll();
      }
    } catch (e: any) {
      setError(`Failed to approve ${provider.name}: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10) return;
    setRejectSubmitting(true);
    try {
      let success = false;
      try {
        const { data: res } = await axios.post(
          `${API_BASE_URL}/admin/providers/${rejectTarget.id}/reject`,
          { reason: trimmed },
          { headers: getAdminHeaders(), timeout: 5000 }
        );
        success = res.success;
        if (!success) throw new Error(res.error);
      } catch (serverErr: any) {
        const status = serverErr?.response?.status;
        if (status && status !== 404) throw serverErr;
        const fallback = await supabaseReject(rejectTarget.id, trimmed);
        if (!fallback.success) throw new Error(fallback.error ?? "Rejection failed");
        success = true;
      }

      if (success) {
        createProviderRejectionNotification(
          rejectTarget.id,
          rejectTarget.name,
          trimmed,
          rejectTarget.user_id
        ).catch(() => {});
        setAllProviders(prev =>
          prev.map(p => p.id === rejectTarget.id
            ? { ...p, is_verified: false, is_active: false, approval_status: "rejected", rejection_reason: trimmed }
            : p
          )
        );
        setRejectTarget(null);
        setRejectReason("");
        setTab("rejected");
        setSuccessMsg("Provider application rejected successfully.");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (e: any) {
      setError(`Failed to reject provider: ${e.message}`);
    } finally {
      setRejectSubmitting(false);
    }
  };

  // ── Tab counts ────────────────────────────────────────────────────────────

  const tabs: Array<{ id: Tab; label: string; count: number; color: string }> = [
    { id: "pending", label: "Pending Approvals", count: pending.length, color: "text-amber-600 border-amber-500" },
    { id: "approved", label: "Approved Providers", count: approved.length, color: "text-emerald-600 border-emerald-500" },
    { id: "rejected", label: "Rejected Providers", count: rejected.length, color: "text-red-500 border-red-500" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* View Details Modal */}
      <AnimatePresence>
        {detailProvider && (
          <DetailsModal provider={detailProvider} onClose={() => setDetailProvider(null)} />
        )}
      </AnimatePresence>

      {/* Reject Confirmation Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            provider={rejectTarget}
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onConfirm={handleRejectSubmit}
            onCancel={() => { setRejectTarget(null); setRejectReason(""); }}
            submitting={rejectSubmitting}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-[#17375E]" />
              Provider Approvals
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review and manage all provider verification requests
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 flex items-center justify-between">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg("")}><X size={14} /></button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Pending", count: pending.length, icon: Clock, bg: "bg-amber-50", ic: "bg-amber-100 text-amber-600", val: "text-amber-700" },
            { label: "Approved", count: approved.length, icon: UserCheck, bg: "bg-emerald-50", ic: "bg-emerald-100 text-emerald-600", val: "text-emerald-700" },
            { label: "Rejected", count: rejected.length, icon: ShieldX, bg: "bg-red-50", ic: "bg-red-100 text-red-600", val: "text-red-700" },
          ].map(({ label, count, icon: Icon, bg, ic, val }) => (
            <div key={label} className={`${bg} rounded-2xl p-5 flex items-center gap-4`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${ic}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className={`text-2xl font-extrabold ${val}`}>{loading ? "—" : count}</p>
                <p className="text-sm text-slate-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-slate-100">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  tab === t.id
                    ? `${t.color} bg-slate-50/60`
                    : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.id ? "" : "bg-slate-100 text-slate-500"
                } ${t.id === "pending" && t.count > 0 ? "bg-amber-100 text-amber-700" : ""}
                  ${t.id === "approved" ? "bg-emerald-50 text-emerald-600" : ""}
                  ${t.id === "rejected" ? "bg-red-50 text-red-500" : ""}`}>
                  {loading ? "…" : t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-50 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email or service…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#17375E] focus:bg-white transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 cursor-pointer select-none hover:bg-white transition"
                onClick={() => setSort(s => s === "newest" ? "oldest" : "newest")}>
                <Filter size={13} />
                {sort === "newest" ? "Newest First" : "Oldest First"}
                <ChevronDown size={13} className="text-slate-400" />
              </div>
            </div>

            <span className="ml-auto text-xs text-slate-400 font-medium">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={tab} hasSearch={!!search} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left bg-slate-50/50">
                    {["Provider", "Contact", "Services", "KYC", "Registered", tab === "rejected" ? "Rejection Reason" : "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((provider, i) => {
                    const isHighlighted = provider.id === highlightId;
                    return (
                      <tr
                        key={provider.id}
                        ref={el => { if (el) rowRefs.current.set(provider.id, el); else rowRefs.current.delete(provider.id); }}
                        className={`border-b border-slate-50 last:border-0 transition-all duration-500 ${
                          isHighlighted
                            ? "bg-amber-50 ring-2 ring-inset ring-amber-300"
                            : i % 2 === 0 ? "hover:bg-slate-50/60" : "bg-slate-50/30 hover:bg-slate-50/60"
                        }`}
                      >
                        {/* Provider Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#17375E]/10 flex items-center justify-center font-bold text-[#17375E] text-xs shrink-0">
                              {provider.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">{provider.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{provider.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-slate-600 text-xs">
                              <Mail size={11} className="shrink-0 text-slate-400" />
                              <span className="truncate max-w-[160px]">{provider.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 text-xs">
                              <Phone size={11} className="shrink-0 text-slate-400" />
                              {provider.phone}
                            </div>
                          </div>
                        </td>

                        {/* Services */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {provider.service_labels.length > 0
                              ? provider.service_labels.slice(0, 2).map(s => (
                                <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold capitalize">
                                  {s}
                                </span>
                              ))
                              : <span className="text-slate-400 text-xs">—</span>
                            }
                            {provider.service_labels.length > 2 && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                                +{provider.service_labels.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* KYC */}
                        <td className="px-4 py-3.5">
                          <KycBadge status={provider.kyc_status} />
                        </td>

                        {/* Registered */}
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-slate-600">{formatDate(provider.created_at)}</p>
                          <p className="text-[10px] text-slate-400">{formatRelative(provider.created_at)}</p>
                        </td>

                        {/* Status / Rejection Reason */}
                        <td className="px-4 py-3.5">
                          {tab === "rejected" ? (
                            <p className="text-xs text-red-500 max-w-[180px] line-clamp-2">
                              {provider.rejection_reason || "—"}
                            </p>
                          ) : tab === "approved" ? (
                            <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                              <CheckCircle size={12} /> Approved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                              <Clock size={12} /> Awaiting Review
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => setDetailProvider(provider)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Approve — only on pending and rejected tabs */}
                            {tab !== "approved" && (
                              <button
                                onClick={() => handleApprove(provider)}
                                disabled={actionLoading === provider.id}
                                title="Approve"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === provider.id
                                  ? <RefreshCw size={12} className="animate-spin" />
                                  : <CheckCircle size={12} />}
                                Approve
                              </button>
                            )}

                            {/* Reject — only on pending and approved tabs */}
                            {tab !== "rejected" && (
                              <button
                                onClick={() => setRejectTarget(provider)}
                                disabled={actionLoading === provider.id}
                                title="Reject"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ tab, hasSearch }: { tab: Tab; hasSearch: boolean }) {
  const messages: Record<Tab, { icon: string; title: string; sub: string }> = {
    pending: {
      icon: "✅",
      title: hasSearch ? "No matching pending providers" : "No pending approvals",
      sub: hasSearch ? "Try a different search term." : "All providers have been reviewed.",
    },
    approved: {
      icon: "🏆",
      title: hasSearch ? "No matching approved providers" : "No approved providers yet",
      sub: hasSearch ? "Try a different search term." : "Approve providers from the Pending tab.",
    },
    rejected: {
      icon: "📋",
      title: hasSearch ? "No matching rejected providers" : "No rejected providers",
      sub: hasSearch ? "Try a different search term." : "No rejections have been issued.",
    },
  };
  const { icon, title, sub } = messages[tab];
  return (
    <div className="py-16 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-semibold text-slate-600">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

// ── View Details Modal ────────────────────────────────────────────────────────

function DetailsModal({ provider, onClose }: { provider: ProviderRow; onClose: () => void }) {
  return (
    <>
      <motion.div
        key="details-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />
      <motion.div
        key="details-modal"
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 24 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-[#17375E] to-[#2255a0]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-white text-lg">
              {provider.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-white text-lg leading-tight">{provider.name}</h2>
              <p className="text-blue-200 text-xs">{provider.is_verified ? "✅ Approved" : "⏳ Pending Approval"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Contact */}
          <Section title="Contact Information" icon={Phone}>
            <Row label="Phone" value={provider.phone} />
            <Row label="Email" value={provider.email} />
          </Section>

          {/* Identity & KYC */}
          <Section title="Verification & KYC" icon={ShieldCheck}>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-slate-500">KYC Status</span>
              <KycBadge status={provider.kyc_status} />
            </div>
            <Row label="Approval Status" value={provider.is_verified ? "Approved" : "Pending"} />
          </Section>

          {/* Services */}
          <Section title="Services Offered" icon={Briefcase}>
            {provider.service_labels.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {provider.service_labels.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold capitalize">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No services registered</p>
            )}
          </Section>

          {/* Rating */}
          {provider.rating !== null && (
            <Section title="Performance" icon={Star}>
              <Row label="Rating" value={`${provider.rating.toFixed(1)}`} />
            </Section>
          )}

          {/* Registration */}
          <Section title="Approval History" icon={Calendar}>
            <Row label="Registered" value={formatDate(provider.created_at)} />
            <Row label="Provider ID" value={provider.id} mono />
            {provider.rejection_reason && (
              <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs font-semibold text-red-600 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-500">{provider.rejection_reason}</p>
              </div>
            )}
          </Section>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#17375E] text-white text-sm font-semibold hover:bg-[#0f2644] transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[#17375E]" />
        <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0 mr-3">{label}</span>
      <span className={`text-sm font-medium text-slate-700 text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  provider, reason, onReasonChange, onConfirm, onCancel, submitting,
}: {
  provider: ProviderRow;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const trimmed = reason.trim();
  const isValid = trimmed.length >= 10;
  const showError = trimmed.length > 0 && !isValid;

  return (
    <>
      <motion.div
        key="reject-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/50 z-50"
      />
      <motion.div
        key="reject-modal"
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 24 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
      >
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-500 w-7 h-7" />
            </div>
          </div>

          <h2 className="text-center text-xl font-bold text-slate-800 mb-1">Reject Provider?</h2>
          <p className="text-center text-sm text-slate-500 mb-5">
            You are about to reject <span className="font-semibold text-slate-700">{provider.name}</span>.
            A notification will be sent to them.
          </p>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
              Rejection Reason <span className="text-red-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(required — min 10 characters)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              rows={3}
              placeholder="Explain why the application was rejected..."
              className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none transition-colors ${
                showError
                  ? "border-red-400 bg-red-50 focus:border-red-500"
                  : isValid
                    ? "border-emerald-300 focus:border-emerald-400"
                    : "border-slate-200 focus:border-red-300"
              }`}
            />
            <div className="flex items-center justify-between mt-1.5">
              {showError ? (
                <p className="text-xs text-red-500">Reason must be at least 10 characters.</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ml-auto ${trimmed.length >= 10 ? "text-emerald-600" : "text-slate-400"}`}>
                {trimmed.length}/10 min
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting || !isValid}
              title={!isValid ? "Please provide a rejection reason (min 10 characters)" : undefined}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
              Reject Provider
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import api from "@/lib/api";
import ImagePreviewModal from "@/components/ImagePreviewModal";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const avatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=152E4B&color=fff&size=256`;

const heroBg = (name: string) =>
  `https://source.unsplash.com/800x400/?city,street,india&sig=${encodeURIComponent(name)}`;

/* ─── component ───────────────────────────────────────────────────────────── */
const CustomerProviderProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { providerId } = useParams<{ providerId: string }>();

  // Quote & broadcastId passed via navigation state from SearchingProviders
  const quote = location.state?.quote;
  const broadcastId = location.state?.broadcastId;
  const serviceId = location.state?.serviceId;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  /* ── fetch real provider data ─────────────────────────────────────────── */
  useEffect(() => {
    const targetId = providerId || quote?.providerId;
    if (!targetId) { setLoading(false); return; }

    const fetch = async () => {
      try {
        const res = await api.get(`/providers/${targetId}`);
        if (res.data.success) {
          setProfile(res.data.data.provider);
          setStats(res.data.data.stats);
        }
      } catch {
        try {
          const res2 = await api.get(`/providers/dashboard?userId=${targetId}`);
          if (res2.data.success) {
            setProfile(res2.data.data.provider);
            setStats(res2.data.data.stats);
          }
        } catch { /* silent */ }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [providerId, quote]);

  /* ── build display object (real API → quote fallback → skeleton) ──────── */
  const name     = profile?.full_name || profile?.name || quote?.providerName || "Provider";
  const rating   = stats?.rating ?? quote?.rating ?? 0;
  const totalJobs= stats?.completed_jobs ?? stats?.total_jobs ?? 0;
  const etaMin   = quote?.etaMin ?? profile?.eta_preference ?? 15;
  const location_= profile?.location || "Bangalore, Karnataka";
  const verified = profile?.verified ?? true;
  const services: string[] = profile?.services || profile?.service_categories || [];
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "2024";

  /* ── mock certificates (replace with real API data when available) ──── */
  const certificates = [
    { label: "Driving License",       icon: "🪪" },
    { label: "Insurance Certificate", icon: "📄" },
    { label: "RC Book",               icon: "📋" },
    { label: "PESO Certificate",      icon: "🏅" },
  ];

  /* ── mock before/after photos ─────────────────────────────────────────── */
  const beforeAfter = [
    { type: "Before", src: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300&h=200&fit=crop" },
    { type: "After",  src: "https://images.unsplash.com/photo-1558981033-0f0309284409?w=300&h=200&fit=crop" },
    { type: "Before", src: "https://images.unsplash.com/photo-1558981359-3a4b4a5f4a4a?w=300&h=200&fit=crop" },
    { type: "After",  src: "https://images.unsplash.com/photo-1558982257-b3b97b3b6d4c?w=300&h=200&fit=crop" },
  ];

  /* ── star breakdown (mock, replace with real when available) ──────────── */
  const starBreakdown = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: s === 5 ? Math.round(totalJobs * 0.72)
         : s === 4 ? Math.round(totalJobs * 0.18)
         : s === 3 ? Math.round(totalJobs * 0.06)
         : s === 2 ? Math.round(totalJobs * 0.02)
         : Math.round(totalJobs * 0.02),
  }));

  const responseRate = profile?.response_rate ?? 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F6FA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#152E4B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F6FA] font-['DM_Sans',sans-serif] pb-10 overflow-x-hidden">

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div className="relative h-56 w-full overflow-hidden">
        <img
          src={profile?.cover_url || heroBg(name)}
          alt="cover"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=400&fit=crop`; }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

        {/* top bar */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 pt-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow active:scale-90 transition"
          >
            <ArrowLeft size={20} className="text-slate-800" />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow active:scale-90 transition">
            <MoreVertical size={20} className="text-slate-800" />
          </button>
        </div>

        {/* avatar overlapping hero */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div 
              onClick={() => setIsImagePreviewOpen(true)}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#152E4B] cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <img src={avatar(name)} alt={name} className="w-full h-full object-cover" />
              )}
            </div>
            {/* online dot */}
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
          </div>
        </div>
      </div>

      {/* ── NAME / META ───────────────────────────────────────────────────── */}
      <div className="mt-12 flex flex-col items-center px-5">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-bold text-slate-900">{name}</h1>
          {verified && (
            <CheckCircle2 size={20} className="text-blue-500 fill-blue-100" />
          )}
        </div>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          {services.length > 0 ? services[0] : "Service Professional"}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
          <span className="text-xs text-slate-400">({totalJobs} reviews)</span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-xs text-slate-400">Member since {memberSince}</span>
        </div>

        {/* call button */}
        <button
          onClick={() => window.open("tel:+911234567890", "_self")}
          className="absolute right-5 mt-[-60px] translate-y-[136px] flex items-center gap-1.5 bg-white border border-slate-200 shadow px-4 py-2 rounded-full text-sm font-bold text-slate-800 active:scale-95 transition"
        >
          <Phone size={15} className="text-[#152E4B]" />
          Call
        </button>
      </div>

      {/* ── LOCATION / ETA / VERIFIED PILLS ─────────────────────────────── */}
      <div className="flex gap-3 px-5 mt-5 overflow-x-auto no-scrollbar">
        {[
          { icon: <MapPin size={13} className="text-[#152E4B]" />, label: location_, sub: "Karnataka, India" },
          { icon: <Clock size={13} className="text-[#152E4B]" />,  label: "ETA Preference", sub: `${etaMin} mins` },
          { icon: <ShieldCheck size={13} className="text-green-600" />, label: "Verified", sub: "Documents verified" },
        ].map((item, i) => (
          <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-slate-100">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              {item.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-700 leading-tight">{item.label}</p>
              <p className="text-[10px] text-slate-400">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
        {[
          { value: Number(rating).toFixed(1), label: "RATING",        icon: <Star size={14} className="text-yellow-500 fill-yellow-500" /> },
          { value: totalJobs,                 label: "TOTAL JOBS",     icon: null },
          { value: `${responseRate}%`,         label: "RESPONSE RATE", icon: null },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center py-4 gap-0.5">
            <div className="flex items-center gap-1">
              {s.icon}
              <span className="text-[18px] font-black text-slate-900">{s.value}</span>
            </div>
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── SERVICES + WORK DETAILS ──────────────────────────────────────── */}
      <div className="mx-5 mt-4 flex gap-3">
        {/* Services */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-blue-600" />
            </div>
            <span className="text-[13px] font-bold text-slate-800">Services</span>
          </div>
          <ul className="space-y-1.5 mb-3">
            {(services.length > 0
              ? services.slice(0, 4)
              : ["Quick Service", "On-time Delivery", "Quality Work", "Reliable"]
            ).map((s: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                <CheckCircle2 size={11} className="text-blue-500 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
          <button className="w-full text-[11px] font-bold text-blue-600 bg-blue-50 rounded-xl py-1.5">
            View All Services
          </button>
        </div>

        {/* Work Details */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <FileText size={14} className="text-green-600" />
            </div>
            <span className="text-[13px] font-bold text-slate-800">Work Details</span>
          </div>
          {[
            { label: "Working Hours", value: profile?.working_hours || "All day" },
            { label: "Service Radius", value: profile?.service_radius || "Up to 5 km" },
            { label: "Languages", value: profile?.languages || "English, Hindi" },
            { label: "Payment Methods", value: profile?.payment_methods || "Cash, UPI" },
          ].map((d, i) => (
            <div key={i} className="mb-1.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{d.label}</p>
              <p className="text-[11px] font-semibold text-slate-700">{d.value}</p>
            </div>
          ))}
          <button className="w-full text-[11px] font-bold text-green-600 bg-green-50 rounded-xl py-1.5 mt-1">
            View Full Details
          </button>
        </div>
      </div>

      {/* ── BEFORE & AFTER PHOTOS ────────────────────────────────────────── */}
      <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <ImageIcon size={14} className="text-orange-500" />
            </div>
            <span className="text-[13px] font-bold text-slate-800">Before & After Photos</span>
          </div>
          <button className="text-[11px] font-bold text-blue-600">View All</button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {beforeAfter.map((item, i) => (
            <div key={i} className="relative flex-shrink-0 w-[90px] h-[70px] rounded-xl overflow-hidden">
              <img
                src={item.src}
                alt={item.type}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200&h=150&fit=crop&sig=${i}`;
                }}
              />
              <div className="absolute inset-0 bg-black/20" />
              <span
                className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white px-2 py-0.5 rounded-full ${
                  item.type === "After" ? "bg-green-500" : "bg-slate-600"
                }`}
              >
                {item.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CERTIFICATES & LICENSES ──────────────────────────────────────── */}
      <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShieldCheck size={14} className="text-amber-500" />
            </div>
            <span className="text-[13px] font-bold text-slate-800">Certificates & Licenses</span>
          </div>
          <button className="text-[11px] font-bold text-blue-600">View All</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {certificates.map((c, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-[72px] h-[52px] bg-slate-100 rounded-xl flex items-center justify-center text-2xl border border-slate-200">
                {c.icon}
              </div>
              <span className="text-[9px] font-semibold text-slate-600 text-center w-[72px] leading-tight">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CUSTOMER REVIEWS ─────────────────────────────────────────────── */}
      <div className="mx-5 mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center">
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
          </div>
          <span className="text-[13px] font-bold text-slate-800">Customer Reviews</span>
        </div>

        <div className="flex gap-5 items-start">
          {/* overall */}
          <div className="flex flex-col items-center min-w-[64px]">
            <span className="text-[32px] font-black text-slate-900 leading-none">
              {Number(rating).toFixed(1)}
            </span>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={11}
                  className={s <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-slate-200 fill-slate-200"}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">({totalJobs} reviews)</span>
          </div>

          {/* breakdown bars */}
          <div className="flex-1 space-y-1.5">
            {starBreakdown.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-4 text-right">{star}</span>
                <Star size={9} className="text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: totalJobs > 0 ? `${(count / totalJobs) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {totalJobs === 0 && (
          <div className="flex flex-col items-center py-6 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <Star size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No reviews yet</p>
            <p className="text-xs text-slate-400">Be the first customer to review</p>
          </div>
        )}
      </div>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white/90 backdrop-blur border-t border-slate-100 z-50">
        <button
          onClick={() => navigate(-1)}
          className="w-full h-13 py-3.5 bg-[#152E4B] text-white font-bold rounded-2xl active:scale-95 transition shadow-lg text-[15px]"
        >
          <!-- Back to Quotes -->
          ← Back to Quotes
        </button>
      </div>

      <ImagePreviewModal
        isOpen={isImagePreviewOpen}
        imageUrl={profile?.avatar_url || avatar(name)}
        alt={name}
        onClose={() => setIsImagePreviewOpen(false)}
      />
    </div>
  );
};

export default CustomerProviderProfile;

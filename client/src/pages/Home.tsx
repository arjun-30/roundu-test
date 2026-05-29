import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Bell, ChevronRight, Menu, X, Home as HomeIcon, CalendarCheck,
  Settings, HelpCircle, LogOut, Smartphone, Wallet, Gift, Sparkles, Wrench,
  Loader2, Zap, Droplet, Paintbrush, Hammer, ShieldAlert,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { services, quickFixes, smartSuggestions, SmartSuggestion } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";
import LocationModal from "@/components/LocationModal";
import { motion } from "framer-motion";
import AdBannerCarousel from "@/components/AdBannerCarousel";
import api from "@/lib/api";

const getSuggestionIconConfig = (serviceId: string) => {
  switch (serviceId) {
    case "electrician":
      return { icon: Zap, bgColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    case "plumber":
      return { icon: Droplet, bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
    case "painter":
      return { icon: Paintbrush, bgColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
    case "carpenter":
      return { icon: Hammer, bgColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    case "pestcontrol":
      return { icon: ShieldAlert, bgColor: "bg-red-500/10 text-red-500 border-red-500/20" };
    default:
      return { icon: Wrench, bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" };
  }
};

const recommendedDescriptions: Record<string, string> = {
  "sug-elec-1": "Ceiling fan is making noise and needs inspection or servicing.",
  "sug-elec-2": "Switchboard maintenance is required to check loose connections and safety risks.",
  "sug-elec-3": "AC filter cleaning is required because the filters may be dirty and affecting cooling efficiency.",
  "sug-elec-4": "Home wiring inspection is required to check electrical safety and prevent faults.",
  "sug-elec-5": "Smart lighting installation is required for upgrading to energy-efficient LED lights.",
  "sug-plumb-1": "Water leakage check is required to find and fix possible leaks at home.",
  "sug-plumb-2": "Kitchen drain cleaning is required to prevent blockage and overflow.",
  "sug-plumb-3": "Bathroom tap repair is required because the tap may be dripping or not working properly.",
  "sug-plumb-4": "Monsoon drainage check is required to inspect and clear possible drain clogs.",
  "sug-hk-1": "Bathroom deep cleaning is required for a full hygiene and stain-removal service.",
  "sug-hk-2": "Full home sanitization is required to clean and sanitize the home thoroughly.",
  "sug-hk-3": "Kitchen deep cleaning is required to remove grease buildup and improve hygiene.",
  "sug-hk-4": "Sofa and carpet cleaning is required to remove dust, stains, and allergens.",
  "sug-hk-5": "Post-monsoon home cleanup is required to address dampness, mould, and general cleaning.",
  "sug-car-1": "Doorstep car wash is required for exterior cleaning at the service location.",
  "sug-car-2": "Interior car detailing is required to deep clean upholstery, dashboard, and cabin areas.",
  "sug-car-3": "Pre-monsoon car care is required to clean and protect the vehicle before heavy rains.",
  "sug-drv-1": "Acting driver service is required for a verified driver today.",
  "sug-exp-1": "General home maintenance is required for inspection and repair of household issues.",
  "sug-exp-2": "Festival home preparation service is required to get the home ready for celebrations.",
};

const Home = () => {
  const navigate = useNavigate();
  const { user, dispatch, notifications, bookings } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [realNearbyProviders, setRealNearbyProviders] = useState<any[]>([]);

  useEffect(() => {
    dispatch({ type: "SET_ROLE", role: "customer" });
  }, [dispatch]);

  useEffect(() => {
    const fetchRealProviders = async () => {
      try {
        const res = await api.get("/providers/search");
        if (res.data.success && res.data.data) {
          setRealNearbyProviders(res.data.data.slice(0, 8));
        }
      } catch (err) {
        console.error("Failed to fetch nearby providers", err);
      }
    };
    fetchRealProviders();
  }, []);

  const currentSeason: SmartSuggestion["season"] = useMemo(() => {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 5) return "summer";
    if (m >= 6 && m <= 9) return "monsoon";
    if (m >= 10 && m <= 11) return "festival";
    return "winter";
  }, []);

  const rankedSuggestions = useMemo(() => {
    const bookedServiceIds = new Set(
      (bookings || []).map((b: any) => b.serviceId || b.service_id)
    );
    const scored = smartSuggestions.map((s) => {
      let score = s.priority;
      if (s.season === currentSeason) score += 5;
      if (s.season === "all") score += 1;
      if (bookedServiceIds.has(s.serviceId)) score += 2;
      return { ...s, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const deduped: typeof scored = [];
    for (const s of scored) {
      if (!seen.has(s.serviceId) || deduped.length < 4) {
        deduped.push(s);
        seen.add(s.serviceId);
      }
      if (deduped.length >= 5) break;
    }
    return deduped;
  }, [bookings, currentSeason]);

  const handleLocationFetched = useCallback(async (lat: number, lng: number) => {
    dispatch({ type: "SET_CURRENT_LOCATION", lat, lng });
    setLocating(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result.address) {
        const shortAddr = result.area
          ? `${result.area}${result.city ? ", " + result.city : ""}`
          : result.address.split(",").slice(0, 2).join(",");
        dispatch({ type: "UPDATE_USER", user: { address: shortAddr } });
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      dispatch({ type: "UPDATE_USER", user: { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } });
    } finally {
      setLocating(false);
    }
  }, [dispatch]);

  const { loading: gpsLoading } = useCurrentLocation(handleLocationFetched);

  // ─── Logout: removes only session keys, keeps phone-specific role ────────
  // ✅ Do NOT use localStorage.clear() — that wipes roundu_role_<phone>
  // and forces re-selection of role on next login. Only remove session keys.
  const handleLogout = () => {
    setMenuOpen(false);
    try { localStorage.removeItem("roundu_token"); } catch (_) { }
    try { localStorage.removeItem("roundu_user"); } catch (_) { }
    try { localStorage.removeItem("roundu_role"); } catch (_) { }
    try { sessionStorage.clear(); } catch (_) { }
    dispatch({ type: "LOGOUT" });
    setTimeout(() => {
      window.location.href = "/";
    }, 50);
  };

  const browseServices = services.slice(0, 8);
  const goToProviders = (id: string) => navigate(`/service-select/${id}`);
  const goToRecommendedBooking = (suggestion: SmartSuggestion) => {
    navigate(`/book-service/${suggestion.serviceId}`, {
      state: {
        serviceId: suggestion.serviceId,
        recommendedSuggestionId: suggestion.id,
        lockedDescription: recommendedDescriptions[suggestion.id] || suggestion.title,
      },
    });
  };

  // All menu items including logout at bottom
  const menuItems = [
    { icon: HomeIcon, label: "Home", path: "/home", isLogout: false },
    { icon: CalendarCheck, label: "My Bookings", path: "/bookings", isLogout: false },
    { icon: Wallet, label: "Wallet", path: "/wallet", isLogout: false },
    { icon: Smartphone, label: "Refer & Earn", path: "/refer-earn", isLogout: false },
    { icon: Settings, label: "Settings", path: "/settings", isLogout: false },
    { icon: HelpCircle, label: "Help & Support", path: "/support", isLogout: false },
    ...(user.role === "provider"
      ? [{ icon: Wrench, label: "Switch to Provider", path: "/provider", isLogout: false }]
      : []),
    { icon: LogOut, label: "Logout", path: "", isLogout: true },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] pb-28 relative overflow-x-hidden">

      {/* ═══════ SLIDE-OUT MENU OVERLAY ═══════ */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${menuOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer — full height, flex column, scrollable body */}
        <div
          className={`absolute top-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          style={{ height: "100dvh" }}
        >
          {/* ── User Profile Header (fixed, never scrolls) ── */}
          <div className="flex-shrink-0 px-5 pt-10 pb-5 bg-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-extrabold text-white">{user.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-bold text-[15px] truncate">{user.name}</h3>
                <p className="text-white/60 text-[11px] mt-0.5 truncate">
                  {user.phone || user.email || "RoundU User"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Scrollable Menu List ── */}
          {/* This div takes all remaining height and scrolls independently */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain py-2"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {menuItems.map((item, idx) => {
              const isLogout = item.isLogout;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isLogout) {
                      handleLogout();
                    } else {
                      setMenuOpen(false);
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-5 py-4 transition-colors text-left group ${isLogout
                      ? "hover:bg-red-50 active:bg-red-100"
                      : "hover:bg-slate-50 active:bg-slate-100"
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${isLogout
                        ? "bg-red-50 group-hover:bg-red-100"
                        : "bg-[#F1F4F8] group-hover:bg-primary/10"
                      }`}
                  >
                    <item.icon
                      size={18}
                      className={isLogout ? "text-red-500" : "text-primary"}
                      strokeWidth={2}
                    />
                  </div>
                  <span
                    className={`text-[14px] font-semibold flex-1 ${isLogout ? "text-red-500" : "text-foreground"
                      }`}
                  >
                    {item.label}
                  </span>
                  <ChevronRight
                    size={14}
                    className={isLogout ? "text-red-300" : "text-muted-foreground/40"}
                  />
                </button>
              );
            })}

            {/* Bottom padding so last item isn't hidden behind nav bar */}
            <div className="h-24" />
          </div>
        </div>
      </div>

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="px-5 pt-4 pb-3 flex items-center justify-between bg-white shadow-sm relative z-10"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(true)}
            className="w-11 h-11 rounded-[16px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-all"
          >
            <Menu size={22} className="text-primary" strokeWidth={2.5} />
          </motion.button>
          <div>
            <h1 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">
              Hi {user.name.split(" ")[0]}!{" "}
              <span className="inline-block animate-waving-hand origin-bottom-right">👋</span>
            </h1>
<<<<<<< HEAD
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="group flex items-center gap-1 mt-1 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <MapPin size={10} className="text-primary group-hover:text-accent transition-colors" />
              </div>
              <p className="text-[12px] font-semibold text-muted-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[150px]">
                {locating || gpsLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin text-primary" /> Detecting...
                  </span>
                ) : (
                  user.address || "Set Location"
                )}
              </p>
            </button>
=======
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="group flex items-center gap-1.5 mt-1.5 text-[12px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer w-fit"
          >
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <MapPin size={10} className="text-primary group-hover:text-accent transition-colors" />
            </div>
            <span className="line-clamp-1 max-w-[150px] truncate leading-none text-left">
              {locating || gpsLoading ? "Detecting..." : (user.address || "Set Location").trim()}
            </span>
          </button>
>>>>>>> dc44a1592ff19c9479aaf1f008572a640a2398d5
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.role === "provider" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/provider")}
              className="w-11 h-11 rounded-[16px] bg-accent/10 border-2 border-accent/20 flex items-center justify-center transition-all shadow-sm"
              title="Switch to Provider"
            >
              <Wrench size={18} className="text-accent" strokeWidth={2.5} />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/wallet")}
            className="w-11 h-11 rounded-[16px] bg-white border border-[#E8EBF0] flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:border-primary/20"
          >
            <Wallet size={20} className="text-primary" strokeWidth={2} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/notifications")}
            className="w-11 h-11 rounded-[16px] bg-white border border-[#E8EBF0] flex items-center justify-center relative transition-all shadow-sm hover:shadow-md hover:border-primary/20"
          >
            <Bell size={20} className="text-primary" strokeWidth={2} />
            {notifications.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-white shadow-sm" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* ─── Search Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="px-5 pb-5 pt-4 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative z-0"
      >
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate("/search")}
          className="w-full text-left relative group"
        >
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-accent transition-colors">
            <Search size={20} strokeWidth={2.5} />
          </div>
          <div className="w-full pl-[52px] pr-5 py-4 rounded-[20px] bg-[#F8FAFC] border-2 border-transparent group-hover:border-primary/10 group-hover:bg-white transition-all text-[15px] text-muted-foreground font-medium shadow-inner">
            What service do you need today?
          </div>
        </motion.button>
      </motion.div>

      {/* ─── Scrollable Content ─── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto"
      >
        {/* ═══ AD BANNERS ═══ */}
        <AdBannerCarousel />

        {/* ═══ BROWSE SERVICES ═══ */}
        <motion.div variants={itemVariants} className="px-5 pt-6 pb-2">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">Browse Services</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Explore our vetted specialists</p>
            </div>
            <button
              onClick={() => navigate("/services")}
              className="text-[13px] font-semibold text-accent flex items-center gap-0.5 hover:text-primary transition-colors bg-accent/10 px-3 py-1.5 rounded-full"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {browseServices.map((service) => (
              <motion.button
                key={service.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => goToProviders(service.id)}
                className="group bg-white rounded-[24px] p-5 text-left transition-all border border-transparent hover:border-primary/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(21,46,75,0.08)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="w-14 h-14 rounded-[18px] bg-[#F8FAFC] flex items-center justify-center mb-4 group-hover:bg-primary/5 transition-colors relative z-10">
                  <service.icon size={26} className="text-primary group-hover:scale-110 transition-transform duration-300" strokeWidth={1.8} />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors relative z-10">
                  {service.label}
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-snug relative z-10 line-clamp-2">
                  {service.desc}
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ═══ QUICK FIXES ═══ */}
        <motion.div variants={itemVariants} className="pt-2 pb-2">
          <div className="px-5 mb-3">
            <h2 className="text-[20px] font-bold text-foreground tracking-tight">Quick Fixes</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Common issues solved instantly</p>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {quickFixes.map((fix) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={fix.id}
                onClick={() =>
                  goToProviders(
                    fix.id === "pipe" || fix.id === "drain" ? "plumber"
                      : fix.id === "fan" || fix.id === "switch" ? "electrician"
                        : fix.id === "cleaning" ? "housekeeping"
                          : fix.id === "driver" ? "drivers"
                            : fix.id === "carwash" ? "carwash"
                              : "security"
                  )
                }
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-full whitespace-nowrap hover:bg-primary/90 transition-colors flex-shrink-0 shadow-[0_4px_12px_rgba(21,46,75,0.15)] border border-primary/20"
              >
                <fix.icon size={16} strokeWidth={2.5} />
                <span className="text-[14px] font-semibold">{fix.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ═══ RECOMMENDED FOR YOU ═══ */}
        {rankedSuggestions.length > 0 && (
          <div className="pt-6 pb-2">
            <div className="px-5 flex items-end justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={15} className="text-primary" />
                  <h2 className="text-[20px] font-bold text-foreground tracking-tight">Recommended for You</h2>
                </div>
                <p className="text-[13px] text-muted-foreground">Personalized picks based on your activity</p>
              </div>
              <button
                onClick={() => navigate("/bookings")}
                className="text-[11px] font-semibold text-primary uppercase tracking-wider hover:text-primary/80 transition-colors"
              >
                History
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto px-5 pb-5 scrollbar-hide snap-x snap-mandatory">
              {rankedSuggestions.map((sugg) => {
                const conf = getSuggestionIconConfig(sugg.serviceId);
                const IconComponent = conf.icon;
                return (
                  <button
                    key={sugg.id}
                    onClick={() => goToRecommendedBooking(sugg)}
                    className={`
                      w-[280px] flex-shrink-0 rounded-3xl p-5 border snap-start text-left
                      group relative overflow-hidden transition-all duration-500
                      hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.98]
                      ${sugg.season === "summer" ? "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 border-amber-100"
                        : sugg.season === "monsoon" ? "bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-100 border-sky-100"
                          : sugg.season === "winter" ? "bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 border-slate-200"
                            : sugg.season === "festival" ? "bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 border-rose-100"
                              : "bg-gradient-to-br from-white via-slate-50 to-primary/5 border-slate-100"}
                    `}
                  >
                    {sugg.season === "summer" && (
                      <>
                        <div className="absolute top-[-20px] right-[-20px] w-28 h-28 bg-amber-300/20 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-30px] left-[-20px] w-24 h-24 bg-orange-300/10 rounded-full blur-2xl" />
                      </>
                    )}
                    {sugg.season === "monsoon" && (
                      <>
                        <div className="absolute top-[-20px] right-[-20px] w-28 h-28 bg-sky-300/20 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-cyan-300/10 rounded-full blur-2xl" />
                      </>
                    )}
                    {sugg.season === "winter" && (
                      <>
                        <div className="absolute top-[-20px] right-[-20px] w-28 h-28 bg-slate-300/20 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-gray-300/10 rounded-full blur-2xl" />
                      </>
                    )}
                    {sugg.season === "festival" && (
                      <>
                        <div className="absolute top-[-20px] right-[-20px] w-28 h-28 bg-rose-300/20 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-orange-300/10 rounded-full blur-2xl" />
                      </>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black tracking-[0.18em] uppercase text-muted-foreground/50">
                        {sugg.category}
                      </span>
                      {(() => {
                        const seasonStyles = {
                          summer: { label: "Summer Essential", className: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
                          monsoon: { label: "Monsoon Care", className: "bg-sky-50 text-sky-700 border border-sky-200", dot: "bg-sky-500" },
                          winter: { label: "Winter Protection", className: "bg-slate-100 text-slate-700 border border-slate-200", dot: "bg-slate-500" },
                          festival: { label: "Festive Special", className: "bg-rose-50 text-rose-700 border border-rose-200", dot: "bg-rose-500" },
                          all: { label: "Recommended", className: "bg-primary/5 text-primary border border-primary/10", dot: "bg-primary" },
                        };
                        const s = seasonStyles[sugg.season as keyof typeof seasonStyles] || seasonStyles.all;
                        return (
                          <div className={`flex items-center gap-2 px-3 py-[7px] rounded-full text-[10px] font-semibold tracking-wide ${s.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            <span className="leading-none">{s.label}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${conf.bgColor} group-hover:scale-105`}>
                        <IconComponent size={20} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {sugg.title}
                        </h3>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-normal line-clamp-2">
                          {sugg.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50">
                      <span className="text-[12px] font-semibold text-primary group-hover:underline">Explore Providers</span>
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ REFER & EARN ═══ */}
        <motion.div variants={itemVariants} className="px-5 pb-4 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/refer-earn")}
            className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 shadow-[0_8px_30px_rgba(245,158,11,0.06)] relative overflow-hidden group"
          >
            <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-accent/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-accent/20 transition-colors duration-500" />
            <div className="w-14 h-14 rounded-[18px] bg-white shadow-sm flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 transition-transform duration-300">
              <Gift size={26} className="text-accent" strokeWidth={2} />
            </div>
            <div className="flex-1 text-left z-10">
              <h3 className="text-[16px] font-semibold text-foreground leading-tight">Refer and Earn</h3>
              <p className="text-[12px] font-medium text-accent/80 mt-1">Invite friends and get ₹500 on their first booking</p>
            </div>
            <ChevronRight size={20} className="text-accent flex-shrink-0 z-10 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>

        {/* ═══ GET HELP ═══ */}
        <motion.div variants={itemVariants} className="px-5 pb-6 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/get-help")}
            className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-[0_8px_30px_rgba(21,46,75,0.04)] relative overflow-hidden group"
          >
            <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-500" />
            <div className="w-14 h-14 rounded-[18px] bg-white shadow-sm flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 transition-transform duration-300">
              <HelpCircle size={26} className="text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 text-left z-10">
              <h3 className="text-[16px] font-semibold text-foreground leading-tight">Get Help</h3>
              <p className="text-[12px] font-medium text-primary/80 mt-1">Not sure what's wrong? Let our experts inspect it.</p>
            </div>
            <ChevronRight size={20} className="text-primary flex-shrink-0 z-10 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </motion.div>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
      <BottomNav />
    </div>
  );
};

export default Home;
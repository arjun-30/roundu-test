import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Bell, ChevronRight, Menu, X, Home as HomeIcon, CalendarCheck,
  Settings, HelpCircle, LogOut, Smartphone, Wallet, Gift, Star, Plus, AlertTriangle, Sparkles, Crown, Wrench,
  Loader2,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { services, quickFixes, smartSuggestions, SmartSuggestion } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";
import LocationModal from "@/components/LocationModal";
import { motion, AnimatePresence } from "framer-motion";
import AdBannerCarousel from "@/components/AdBannerCarousel";
import api from "@/lib/api";


const Home = () => {
  const navigate = useNavigate();
  const { user, dispatch, notifications, bookings, currentLocation } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [realNearbyProviders, setRealNearbyProviders] = useState<any[]>([]);

  // Sync role to customer on mount
  useEffect(() => {
    dispatch({ type: "SET_ROLE", role: "customer" });
  }, [dispatch]);

  // Fetch real nearby providers
  useEffect(() => {
    const fetchRealProviders = async () => {
      try {
        const res = await api.get("/providers/search");
        if (res.data.success && res.data.data) {
          setRealNearbyProviders(res.data.data.slice(0, 8)); // Top 8 nearby
        }
      } catch (err) {
        console.error("Failed to fetch nearby providers", err);
      }
    };
    fetchRealProviders();
  }, []);

  // ─── Smart Suggestion Selection ───────────────────────────────────────────
  // Determine current season from month (India-centric)
  const currentSeason: SmartSuggestion["season"] = useMemo(() => {
    const m = new Date().getMonth(); // 0-based
    if (m >= 2 && m <= 5) return "summer";      // Mar–Jun
    if (m >= 6 && m <= 9) return "monsoon";     // Jul–Oct
    if (m >= 10 && m <= 11) return "festival";  // Nov–Dec
    return "winter";                             // Jan–Feb
  }, []);

  // Build a ranked list: seasonal matches first, then booking-history matches, then rest
  const rankedSuggestions = useMemo(() => {
    const bookedServiceIds = new Set(
      (bookings || []).map((b: any) => b.serviceId || b.service_id)
    );
    const scored = smartSuggestions.map((s) => {
      let score = s.priority;
      if (s.season === currentSeason) score += 5;
      if (s.season === "all") score += 1;
      // Slightly boost if user has booked this service before (familiarity)
      if (bookedServiceIds.has(s.serviceId)) score += 2;
      return { ...s, score };
    });
    // Sort descending, then deduplicate consecutive serviceIds for variety
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



  // Auto-fetch GPS on mount → reverse geocode → update user.address
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
      // Still show coords as fallback
      dispatch({ type: "UPDATE_USER", user: { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } });
    } finally {
      setLocating(false);
    }
  }, [dispatch]);
  const { loading: gpsLoading } = useCurrentLocation(handleLocationFetched);

  const isConnected = (id: string) => {
    return bookings?.some((b: { serviceId?: string; service_id?: string; status: string }) =>
      (b.serviceId === id || b.service_id === id) &&
      ["assigned", "on_the_way", "arrived", "in_progress"].includes(b.status)
    );
  };

  const browseServices = services.slice(0, 8);

  const goToProviders = (id: string) => {
    navigate(`/service-select/${id}`);
  };

  const menuItems = [
    { icon: HomeIcon, label: "Home", path: "/home" },
    { icon: CalendarCheck, label: "My Bookings", path: "/bookings" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: Smartphone, label: "Refer & Earn", path: "/refer-earn" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: HelpCircle, label: "Help & Support", path: "/support" },
  ];

  if (user.role === "provider") {
    menuItems.push({ icon: Wrench, label: "Switch to Provider", path: "/provider" });
  }

  const nearbyList = useMemo(() => {
    if (!currentLocation) return allProviders.slice(0, 5);
    return allProviders
      .map(p => ({
        ...p,
        distance: getDistance(currentLocation!, { lat: p.lat, lng: p.lng })
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [currentLocation]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
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

        {/* Drawer */}
        <div
          className={`absolute top-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          style={{ height: "100dvh" }}
        >
          {/* ── Header: User Profile ── */}
          <div className="flex-shrink-0 px-5 pt-10 pb-5 bg-primary relative overflow-hidden">
            {/* Decorative bubble */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-extrabold text-white">{user.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-bold text-[15px] truncate">{user.name}</h3>
                <p className="text-white/60 text-[11px] mt-0.5 truncate">{user.phone || user.email || "RoundU User"}</p>
              </div>
            </div>
          </div>

          {/* ── Middle: Scrollable Menu Items ── */}
          {/* min-h-0 is required: without it flex children cannot shrink below content size */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(item.path);
                }}
                className="w-full flex items-center gap-3.5 px-5 py-3 hover:bg-background active:bg-background/80 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-background group-hover:bg-primary/10 flex items-center justify-center transition-colors flex-shrink-0">
                  <item.icon size={18} className="text-primary" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-semibold text-foreground">{item.label}</span>
                <ChevronRight size={14} className="text-muted-foreground/40 ml-auto" />
              </button>
            ))}
          </div>

          {/* ── Bottom: Logout (always visible, never scrolls away) ── */}
          <div
            className="flex-shrink-0 border-t border-border bg-white"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
          >
            {/* App version row */}
            <div className="px-5 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">RoundU</span>
              <span className="text-[10px] text-muted-foreground/40">v1.0</span>
            </div>

            {/* Logout button */}
            <div className="px-4 pb-3">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  dispatch({ type: "LOGOUT" });
                  navigate("/");
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 hover:bg-red-100 active:scale-[0.98] transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span className="text-[14px] font-bold text-red-500 flex-1 text-left">Logout</span>
                <ChevronRight size={14} className="text-red-300" />
              </button>
            </div>
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
            <h1 className="text-[22px] font-extrabold text-foreground leading-tight tracking-tight">
              Hi {user.name.split(" ")[0]}! <span className="inline-block animate-waving-hand origin-bottom-right">👋</span>
            </h1>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="group flex items-center gap-1.5 mt-1 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <MapPin size={10} className="text-primary group-hover:text-accent transition-colors" />
              </div>
              <p className="text-[12px] font-bold text-muted-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[150px]">
                {locating || gpsLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin text-primary" /> Detecting...
                  </span>
                ) : (
                  user.address || "Set Location"
                )}
              </p>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "provider" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/provider")}
              className="w-11 h-11 rounded-[16px] bg-accent/10 border-2 border-accent/20 flex items-center justify-center transition-all shadow-sm shadow-accent/5"
              title="Switch Side"
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
          <div className="w-full pl-[52px] pr-5 py-4 rounded-[20px] bg-[#F8FAFC] border-2 border-transparent group-hover:border-primary/10 group-hover:bg-white transition-all text-[15px] text-muted-foreground font-bold shadow-inner group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
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



        {/* ═══ PREMIUM AD BANNERS CAROUSEL ═══ */}
        <AdBannerCarousel />

        {/* ═══ BROWSE SERVICES ═══ */}
        <motion.div variants={itemVariants} className="px-5 pt-6 pb-2">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Browse Services</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Explore our vetted specialists</p>
            </div>
            <button
              onClick={() => navigate("/services")}
              className="text-[13px] font-bold text-accent flex items-center gap-0.5 hover:text-primary transition-colors bg-accent/10 px-3 py-1.5 rounded-full"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {browseServices.map((service, index) => (
              <motion.button
                key={service.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => goToProviders(service.id)}
                className="group bg-white rounded-[24px] p-5 text-left transition-all border border-transparent hover:border-primary/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(21,46,75,0.08)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {isConnected(service.id) && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-[9px] font-black tracking-widest uppercase bg-accent/20 text-accent px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Active
                    </span>
                  </div>
                )}

                <div className="w-14 h-14 rounded-[18px] bg-[#F8FAFC] flex items-center justify-center mb-4 group-hover:bg-primary/5 transition-colors relative z-10">
                  <service.icon size={26} className="text-primary group-hover:scale-110 transition-transform duration-300" strokeWidth={1.8} />
                </div>
                <h3 className="text-[15px] font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors relative z-10">{service.label}</h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-snug relative z-10 line-clamp-2">{service.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ═══ QUICK FIXES ═══ */}
        <motion.div variants={itemVariants} className="pt-2 pb-2">
          <div className="px-5 mb-3">
            <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Quick Fixes</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Common issues solved instantly</p>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {quickFixes.map((fix) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={fix.id}
                onClick={() => goToProviders(fix.id === "pipe" || fix.id === "drain" ? "plumber" : fix.id === "fan" || fix.id === "switch" ? "electrician" : fix.id === "cleaning" ? "housekeeping" : fix.id === "driver" ? "drivers" : fix.id === "carwash" ? "carwash" : "security")}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-full whitespace-nowrap hover:bg-primary/90 transition-colors flex-shrink-0 shadow-[0_4px_12px_rgba(21,46,75,0.15)] border border-primary/20"
              >
                <fix.icon size={16} strokeWidth={2.5} />
                <span className="text-[14px] font-bold">{fix.label}</span>
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
                  <Sparkles size={14} className="text-accent" />
                  <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Recommended for You</h2>
                </div>
                <p className="text-[13px] text-muted-foreground">Personalized picks based on your activity</p>
              </div>
              <button onClick={() => navigate("/bookings")} className="text-[11px] font-bold text-primary uppercase tracking-wider hover:text-primary/80 transition-colors">
                History
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide snap-x snap-mandatory">
              {rankedSuggestions.map((sugg, idx) => (
                <button
                  key={sugg.id}
                  onClick={() => goToProviders(sugg.serviceId)}
                  className="w-[260px] flex-shrink-0 bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-border snap-start text-left group relative transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  {/* Gradient header bar */}
                  <div className={`h-2 w-full ${sugg.accentColor}`} />

                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      {/* Big emoji */}
                      <div className={`w-14 h-14 rounded-[18px] ${sugg.accentColor} flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        {sugg.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-extrabold tracking-[0.15em] uppercase text-muted-foreground">
                            {sugg.category}
                          </span>
                          {sugg.season === currentSeason && (
                            <span className="text-[8px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              Seasonal
                            </span>
                          )}
                        </div>
                        <h3 className={`text-[15px] font-bold leading-tight ${sugg.textColor}`}>{sugg.title}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">{sugg.subtitle}</p>
                      </div>
                    </div>

                    <div className="mt-4 w-full bg-primary/5 hover:bg-primary text-primary hover:text-white font-bold text-[13px] py-2.5 rounded-xl transition-all text-center group-hover:shadow-md group-hover:shadow-primary/20">
                      View Providers
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ NEARBY PROFESSIONALS ═══ */}
        <motion.div variants={itemVariants} className="pt-6 pb-2">
          <div className="px-5 flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Nearby Professionals</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Top-rated experts in your area</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide">
            {realNearbyProviders.length === 0 ? (
              <div className="w-full text-center py-6 text-sm text-muted-foreground">
                No professionals currently online nearby.
              </div>
            ) : (
              realNearbyProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/provider/${p.id}`)}
                  className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <div className="relative w-12 h-12 mx-auto mb-2">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center font-bold text-primary text-lg">
                        {p.name?.charAt(0) || "P"}
                      </div>
                    )}
                    {p.is_online === 1 && (
                      <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-[12px] font-bold text-foreground text-center line-clamp-1">{p.name}</h4>
                  <div className="flex items-center justify-center gap-1 mt-1 text-muted-foreground">
                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-bold">{parseFloat(p.rating || "4.5").toFixed(1)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>


        {/* ═══ REFER & EARN ═══ */}
        <motion.div variants={itemVariants} className="px-5 pb-6 pt-4">
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
              <h3 className="text-[16px] font-extrabold text-foreground leading-tight">Refer and Earn</h3>
              <p className="text-[12px] font-bold text-accent/80 mt-1">
                Invite friends and get ₹500 on their first booking
              </p>
            </div>
            <ChevronRight size={20} className="text-accent flex-shrink-0 z-10 group-hover:translate-x-1 transition-transform" />
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

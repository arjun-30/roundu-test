import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Bell, ChevronRight, Menu, X, Home as HomeIcon, CalendarCheck,
  Settings, HelpCircle, LogOut, Smartphone, Wallet, Gift, Clock, Star, Plus, AlertTriangle, Sparkles, Crown, Wrench,
  Loader2,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { services, quickFixes, popularTasks } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";


const Home = () => {
  const navigate = useNavigate();
  const { user, dispatch, notifications, bookings } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locating, setLocating] = useState(false);

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

  return (
    <div className="min-h-full flex flex-col bg-background pb-28 relative">

      {/* ═══════ SLIDE-OUT MENU OVERLAY ═══════ */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Menu Header */}
          <div className="px-5 pt-8 pb-5 bg-gradient-to-br from-[#152E4B] to-[#1C3D63] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center">
                <span className="text-xl font-extrabold text-white">{user.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-[15px]">{user.name}</h3>
                <p className="text-white/60 text-[11px] mt-0.5">{user.phone}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 py-3 overflow-y-auto">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(item.path);
                }}
                className="w-full flex items-center gap-3.5 px-5 py-3 hover:bg-background transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-background group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <item.icon size={18} className="text-primary" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-semibold text-foreground">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <button
              onClick={() => {
                setMenuOpen(false);
                dispatch({ type: "LOGOUT" });
                navigate("/");
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="text-red-500" />
              <span className="text-[14px] font-bold text-red-500">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Header ─── */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between animate-fade-in bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Menu size={20} className="text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              Hi {user.name.split(" ")[0]}! 👋
            </h1>
            <p 
              onClick={() => navigate("/location")}
              className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 cursor-pointer hover:text-primary"
            >
              <MapPin size={11} className="text-primary" />
              {locating || gpsLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Detecting...
                </span>
              ) : (
                user.address || "Set Location"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "provider" && (
            <button
              onClick={() => navigate("/provider")}
              className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center relative active:scale-95 transition-transform"
              title="Switch Side"
            >
              <Wrench size={18} className="text-secondary" />
            </button>
          )}
          <button
            onClick={() => navigate("/wallet")}
            className="w-10 h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center relative active:scale-95 transition-transform"
          >
            <Wallet size={20} className="text-primary" />
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center relative active:scale-95 transition-transform"
          >
            <Bell size={20} className="text-primary" />
            {notifications.length > 0 && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-white" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="px-5 pb-5 bg-white animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <button
          onClick={() => navigate("/search")}
          className="w-full text-left relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <div className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-background border border-[#E8EBF0] text-sm text-muted-foreground font-medium">
            What service do you need today?
          </div>
        </button>
      </div>

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto">



        {/* ═══ AI RECOMMENDATIONS ═══ */}
        <div className="px-5 pb-2 animate-fade-in" style={{ animationDelay: "0.09s" }}>
          <button
            onClick={() => goToProviders("ac_cleaning")}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-secondary" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-[13px] font-extrabold text-primary">Your AC might need a filter clean</h3>
              <p className="text-[10px] text-secondary mt-0.5 leading-snug">Based on your home's previous history. Book now.</p>
            </div>
            <ChevronRight size={18} className="text-blue-400 flex-shrink-0" />
          </button>
        </div>

        {/* ═══ BROWSE SERVICES ═══ */}
        <div className="px-5 pt-3 pb-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-[17px] font-extrabold text-foreground">Browse Services</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Select a category to explore vetted specialists</p>
            </div>
            <button
              onClick={() => navigate("/services")}
              className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {browseServices.map((service, index) => (
              <button
                key={service.id}
                onClick={() => goToProviders(service.id)}
                className="bg-white rounded-2xl p-4 text-left hover:shadow-md transition-all active:scale-[0.97] relative overflow-hidden border border-border shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                {isConnected(service.id) && (
                  <div className="absolute top-3 right-3">
                    <span className="text-[8px] font-extrabold tracking-wider uppercase bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      ⚡ Connected
                    </span>
                  </div>
                )}

                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center mb-3">
                  <service.icon size={24} className="text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-[13px] font-bold text-foreground leading-tight">{service.label}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{service.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ QUICK FIXES ═══ */}
        <div className="pt-6 pb-2 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="px-5 mb-3">
            <h2 className="text-[17px] font-extrabold text-foreground">Quick Fixes</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Common issues solved instantly</p>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {quickFixes.map((fix) => (
              <button
                key={fix.id}
                onClick={() => goToProviders(fix.id === "pipe" || fix.id === "drain" ? "plumber" : fix.id === "fan" || fix.id === "switch" ? "electrician" : fix.id === "cleaning" ? "housekeeping" : fix.id === "driver" ? "drivers" : fix.id === "carwash" ? "carwash" : "security")}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-full whitespace-nowrap hover:bg-[#1C3D63] active:scale-95 transition-all flex-shrink-0 shadow-sm"
              >
                <fix.icon size={14} strokeWidth={2.5} />
                <span className="text-[13px] font-bold">{fix.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ POPULAR TASKS ═══ */}
        <div className="pt-5 pb-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="px-5 flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-extrabold text-foreground">Popular Tasks</h2>
            <button className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors">
              See History
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide snap-x snap-mandatory">
            {popularTasks.map((task) => (
              <div
                key={task.id}
                className="w-[260px] flex-shrink-0 bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-border snap-start"
              >
                <div className="relative h-[140px] bg-gray-100 overflow-hidden">
                  <img
                    src={task.image}
                    alt={task.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md">
                    <span className="text-[13px] font-extrabold text-foreground">{task.priceLabel}</span>
                  </div>
                </div>

                <div className="p-4">
                  <span className="text-[9px] font-extrabold tracking-[0.15em] uppercase text-secondary">
                    {task.category}
                  </span>
                  <h3 className="text-[15px] font-bold text-foreground mt-1 leading-tight">{task.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock size={10} /> {task.description}
                  </p>

                  <button
                    onClick={() => goToProviders(task.serviceId)}
                    className="w-full mt-3.5 bg-primary hover:bg-[#1C3D63] text-white font-bold text-[13px] py-2.5 rounded-xl transition-colors active:scale-[0.97]"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ REFER & EARN ═══ */}
        <div className="px-5 pb-6 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <button
            onClick={() => navigate("/refer-earn")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B]/20 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Gift size={24} className="text-secondary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[14px] font-extrabold text-foreground">Refer and Earn</h3>
              <p className="text-[11px] text-secondary mt-0.5">
                Invite friends and get $10 on their first booking
              </p>
            </div>
            <ChevronRight size={20} className="text-secondary flex-shrink-0" />
          </button>
        </div>
      </div>



      <BottomNav />
    </div>
  );
};

export default Home;

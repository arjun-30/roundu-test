import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, ShieldCheck, Info, Loader2, Activity, CheckCircle2 } from "lucide-react";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import { useApp } from "@/context/AppContext";
import { socket } from "@/lib/socket";
import { useWatchLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";

const GPSMonitor = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(location.state?.from === "profile" ? "/provider/profile" : "/provider");
    }
  };

  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [notification, setNotification] = useState("");

  const { providerRequests, dispatch } = useApp();
  const [displayAddress, setDisplayAddress] = useState("Detecting location...");
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  const toggleTracking = () => {
    setIsTrackingEnabled(!isTrackingEnabled);
    if (!isTrackingEnabled) {
      setNotification("Live GPS tracking & job routing enabled");
    } else {
      setNotification("GPS paused. You will not receive nearby job alerts.");
    }
    setTimeout(() => setNotification(""), 3500);
  };

  // Watch provider GPS continuously when tracking is enabled
  const handleProviderLocation = useCallback((latitude: number, longitude: number) => {
    dispatch({ type: "SET_CURRENT_LOCATION", lat: latitude, lng: longitude });
    setLiveCoords({ lat: latitude, lng: longitude });

    reverseGeocode(latitude, longitude)
      .then((result) => {
        setDisplayAddress(result.address || "Unknown Location");
      })
      .catch(() => {
        setDisplayAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      });

    const activeJob = providerRequests.find(
      (r) => r.status === "on_the_way" || r.status === "arrived" || r.status === "in_progress"
    );

    socket.emit("provider_location_update", {
      jobId: activeJob?.id ?? "",
      lat: latitude,
      lng: longitude,
    });

    // Auto-arrive check
    providerRequests.forEach((req) => {
      if (req.lat && req.lng && req.status === "on_the_way") {
        const R = 6371;
        const dLat = ((req.lat - latitude) * Math.PI) / 180;
        const dLng = ((req.lng - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((req.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        if (dist < 0.1) {
          socket.emit("update_job_status", { bookingId: req.id, status: "arrived" });
        }
      }
    });
  }, [dispatch, providerRequests]);

  useWatchLocation(handleProviderLocation, isTrackingEnabled);

  return (
    <div className="min-h-full flex flex-col bg-[#F8FAFC] pb-28 font-['DM_Sans',sans-serif]">
      {/* Premium Header */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between bg-white sticky top-0 z-20 border-b border-border/60 shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="w-10 h-10 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary active:scale-95 transition-all hover:bg-secondary/20 shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-[19px] font-extrabold text-foreground leading-tight">GPS & Privacy</h1>
            <p className="text-[12px] font-bold text-muted-foreground mt-0.5">Manage live tracking & job distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isTrackingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
            {isTrackingEnabled ? "Online" : "Paused"}
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        {notification && (
          <div className="bg-primary text-white px-5 py-3.5 rounded-[20px] text-[13px] font-bold shadow-xl flex items-center gap-3 animate-bounce">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Stunning Map Hero Section */}
        <div className="h-72 w-full bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.15)] border border-slate-800 relative flex items-center justify-center group">
          {/* Map Background */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80')] bg-cover bg-center opacity-40 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

          {/* Glowing Radar Pulse Animation */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isTrackingEnabled ? 'bg-primary/20 animate-ping absolute' : 'hidden'}`} />
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isTrackingEnabled ? 'bg-primary/30 animate-pulse' : 'bg-slate-800/80'} backdrop-blur-sm border border-white/10 shadow-2xl`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ring-4 ring-white/20 ${isTrackingEnabled ? 'bg-primary shadow-primary/50' : 'bg-slate-700'}`}>
                 <Navigation size={24} className="fill-white rotate-45 ml-0.5 mb-0.5" />
               </div>
            </div>
          </div>

          {/* Floating Location Overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 p-4 rounded-[24px] shadow-2xl flex items-center justify-between z-10">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-inner">
                   <MapPin size={20} className="text-blue-400" />
                </div>
                <div className="overflow-hidden">
                   <p className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                     <span className={`w-1.5 h-1.5 rounded-full ${isTrackingEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                     {isTrackingEnabled ? "Live GPS Active" : "Tracking Paused"}
                   </p>
                   {!liveCoords ? (
                     <p className="text-[14px] font-bold text-white/80 truncate flex items-center gap-1.5">
                       <Loader2 size={14} className="animate-spin text-blue-400" /> Detecting precise location...
                     </p>
                   ) : (
                     <p className="text-[15px] font-bold text-white truncate">{displayAddress}</p>
                   )}
                </div>
             </div>
             {liveCoords && (
               <div className="text-right shrink-0 hidden sm:block">
                 <span className="text-[10px] font-mono text-slate-400 block font-bold">LAT: {liveCoords.lat.toFixed(4)}</span>
                 <span className="text-[10px] font-mono text-slate-400 block font-bold">LNG: {liveCoords.lng.toFixed(4)}</span>
               </div>
             )}
          </div>
        </div>

        {/* Main Background Tracking Card */}
        <div className="bg-white border border-border/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between gap-4 hover:border-primary/20 transition-all">
           <div>
              <h3 className="text-[17px] font-extrabold text-foreground mb-1">Background Job Routing</h3>
              <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                Receive nearby service requests instantly even when RoundU is minimized or closed.
              </p>
           </div>
           <label className="relative inline-flex items-center cursor-pointer shrink-0">
             <input type="checkbox" className="sr-only peer" checked={isTrackingEnabled} onChange={toggleTracking} />
             <div className="w-14 h-8 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-border after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner border border-border/60"></div>
           </label>
        </div>

        {/* Fair Play & Route Optimization */}
        <div className="bg-white border border-border/80 rounded-[28px] p-6 shadow-sm flex gap-4 items-start hover:border-primary/20 transition-all">
           <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm mt-0.5">
              <ShieldCheck size={24} />
           </div>
           <div className="flex-1">
              <h3 className="text-[17px] font-extrabold text-foreground mb-1">Fair Play & Route Optimization</h3>
              <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                RoundU uses intelligent location matching to assign high-earning jobs closest to you. Maintaining active GPS ensures top priority in provider dispatching.
              </p>
           </div>
        </div>

        {/* Recent Tracking Activity */}
        <div className="bg-white border border-border/80 rounded-[28px] p-6 shadow-sm space-y-4 hover:border-primary/20 transition-all">
           <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                 <Activity size={18} className="text-primary" />
                 <h3 className="text-[16px] font-extrabold text-foreground">System Dispatch Log</h3>
              </div>
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full">Last 24 Hours</span>
           </div>
           
           <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between bg-[#F8FAFC] p-3.5 rounded-[20px] border border-border/40">
                 <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[14px] font-bold text-foreground">Secure Location Ping</span>
                 </div>
                 <span className="text-[12px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Active</span>
              </div>
              <div className="flex items-center justify-between bg-[#F8FAFC] p-3.5 rounded-[20px] border border-border/40">
                 <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[14px] font-bold text-foreground">Job Route Recorded</span>
                 </div>
                 <span className="text-[12px] font-bold text-muted-foreground">2 hours ago</span>
              </div>
           </div>
        </div>

        {/* Privacy & Transparency Notice */}
        <div className="bg-slate-900 text-white rounded-[28px] p-6 shadow-xl flex gap-4 items-start border border-slate-800">
           <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner mt-0.5">
              <Info size={24} />
           </div>
           <div className="flex-1">
              <h3 className="text-[17px] font-extrabold text-white mb-1">Privacy First Guarantee</h3>
              <p className="text-[13px] text-white/80 font-medium leading-relaxed">
                Your live location is only shared with verified customers during an active service booking. We never track or store location history when you are off-duty.
              </p>
           </div>
        </div>
      </div>

      <ProviderBottomNav />
    </div>
  );
};

export default GPSMonitor;

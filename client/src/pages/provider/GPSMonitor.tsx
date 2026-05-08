import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, ShieldCheck, Info } from "lucide-react";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { socket } from "@/lib/socket";

const GPSMonitor = () => {
  const navigate = useNavigate();
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);

  const { user, providerRequests } = useApp();

  const toggleTracking = () => {
    setIsTrackingEnabled(!isTrackingEnabled);
    if (!isTrackingEnabled) {
      toast.success("Background tracking enabled");
    } else {
      toast.warning("Tracking disabled. You won't receive job requests.");
    }
  };

  useEffect(() => {
    if (!isTrackingEnabled) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit("provider_location", {
          id: user.id || user.phone,
          lat: latitude,
          lng: longitude,
          name: user.name
        });

        // Auto-status update for active jobs
        providerRequests.forEach(req => {
          if (req.lat && req.lng) {
            // Re-calculate distance
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

            if (req.status === "assigned" && dist < 5) {
              socket.emit("update_job_status", { bookingId: req.id, status: "on_the_way" });
            } else if (req.status === "on_the_way" && dist < 0.2) {
              socket.emit("update_job_status", { bookingId: req.id, status: "arrived" });
            }
          }
        });
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTrackingEnabled, user.phone, user.name]);

  return (
    <div className="min-h-full flex flex-col bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white sticky top-0 z-10 border-b border-border shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">Location Settings</h1>
          <p className="text-xs text-muted-foreground">GPS Monitoring & Privacy</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Map Placeholder */}
        <div className="flex-1 bg-muted relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80')] bg-cover bg-center opacity-40 mix-blend-multiply" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
               <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/50 ring-4 ring-white">
                 <Navigation size={20} className="fill-white" />
               </div>
            </div>
            <div className="mt-4 bg-white/90 backdrop-blur-md border border-border px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
               <MapPin size={14} className="text-primary" />
               <span className="text-xs font-bold text-foreground">Koramangala, Bengaluru</span>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3">
             <div className="bg-white/90 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-foreground">Background Tracking</p>
                   <p className="text-[10px] text-muted-foreground font-semibold">Allow job requests while app is closed</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isTrackingEnabled} onChange={toggleTracking} />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                </label>
             </div>
          </div>
        </div>

        <div className="p-5 space-y-5 bg-white border-t border-border">
           <div className="flex gap-4">
               <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck size={20} />
               </div>
               <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Anti-Bypass Protection</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    We monitor location patterns to prevent off-app servicing. 3 suspicious patterns will lead to automatic account suspension.
                  </p>
               </div>
           </div>

           <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Recent Activity (Last 24h)</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                 <div className="p-3 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                       <span className="text-xs font-medium text-foreground">Location Tracking Active</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Always</span>
                 </div>
                 <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-blue-500" />
                       <span className="text-xs font-medium text-foreground">Job Route Recorded</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">2 hours ago</span>
                 </div>
              </div>
           </div>
           
           <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3 items-start">
              <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-orange-900 leading-relaxed">
                Why am I being tracked? Tracking allows us to show your live location to customers during active bookings and ensures fair job distribution.
              </p>
           </div>
        </div>

      </div>

      <ProviderBottomNav />
    </div>
  );
};

export default GPSMonitor;

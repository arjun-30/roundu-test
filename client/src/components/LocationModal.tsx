import React, { useState, useEffect } from "react";
import { Search, MapPin, Navigation, X, Loader2, Home, Briefcase, MapPin as MapPinIcon, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getSuggestions, reverseGeocode } from "@/lib/mapProvider";
import { Geolocation } from "@capacitor/geolocation";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const { user, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ address: string; lat: number; lng: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState("");

  const [isEditingManually, setIsEditingManually] = useState(false);
  const [manualAddress, setManualAddress] = useState(user.address || "");

  // Handle Search Autocomplete
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getSuggestions(searchQuery);
        setSuggestions(results);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (lat: number, lng: number, address: string) => {
    dispatch({ type: "SET_CURRENT_LOCATION", lat, lng });
    dispatch({ type: "UPDATE_USER", user: { address } });
    onClose();
  };

  const handleSaveManual = () => {
    dispatch({ type: "UPDATE_USER", user: { address: manualAddress } });
    onClose();
  };

  const detectCurrentLocation = async () => {
    setIsDetecting(true);
    setError("");

    try {
      let perm;
      try {
        perm = await Geolocation.checkPermissions();
      } catch (e) {
        perm = { location: "prompt" };
      }

      if (perm.location !== "granted") {
        try {
          perm = await Geolocation.requestPermissions();
        } catch (e) {
          perm = { location: "denied" };
        }
      }

      if (perm.location !== "granted") {
        setError("Unable to access current location. Please grant permission.");
        setIsDetecting(false);
        return;
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      try {
        const result = await reverseGeocode(lat, lng);
        handleSelectLocation(lat, lng, result.address);
      } catch (err: any) {
        setError(err.message || "Failed to resolve address. Please enter manually.");
        setIsDetecting(false);
      }
    } catch (err: any) {
      console.warn("Location detection error:", err);
      let msg = "Failed to get your location.";
      if (err.message?.includes("denied")) {
        msg = "Unable to access current location. Please grant permission.";
      }
      setError(msg);
      setIsDetecting(false);
    }
  };

  // Reset states and conditionally auto-detect location when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!user.address) {
        detectCurrentLocation();
      } else {
        setIsDetecting(false);
        setError("");
        setSearchQuery("");
        setSuggestions([]);
        setIsEditingManually(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              {isEditingManually ? "Edit Address" : "Select Location"}
            </h2>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              {isEditingManually ? "Enter your full address" : "Find your service area"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Detection Overlay */}
        {isDetecting && (
          <div className="absolute inset-0 z-[10000] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150" />
              <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <Navigation size={32} className="animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground">Detecting your location...</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
              Finding your current position for the best service experience.
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-8">
              Please allow location access
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isEditingManually ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider px-1">Detailed Address</label>
                <textarea
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="House No, Building Name, Street, Area..."
                  className="w-full p-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 text-sm font-semibold transition-all outline-none min-h-[120px] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingManually(false)}
                  className="flex-1 py-4 rounded-2xl bg-gray-50 text-foreground font-bold text-sm hover:bg-gray-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveManual}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Save Address
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Section */}
              <div className="space-y-3">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Search for area, building or street..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 text-sm font-semibold transition-all outline-none"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                    </div>
                  )}
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-top-2 duration-200">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectLocation(s.lat, s.lng, s.address)}
                        className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <MapPin className="text-gray-400 mt-0.5 flex-shrink-0" size={16} />
                        <span className="text-[13px] font-medium text-foreground leading-tight">{s.address}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Location Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[12px] font-extrabold text-muted-foreground uppercase tracking-widest">Current Location</h3>
                  <button
                    onClick={() => setIsEditingManually(true)}
                    className="text-[11px] font-extrabold text-primary uppercase tracking-wider hover:underline"
                  >
                    Enter Manually
                  </button>
                </div>
                <button
                  onClick={detectCurrentLocation}
                  disabled={isDetecting}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all group active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    {isDetecting ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-[14px] font-bold text-primary">Use Current Location</h4>
                    <p className="text-[11px] text-primary/60 font-medium mt-0.5">
                      {isDetecting ? "Detecting your GPS..." : "Automatically detect your address"}
                    </p>
                  </div>
                </button>
                {error && (
                  <div className="mt-2 p-4 rounded-2xl bg-red-50 border border-red-100 animate-in slide-in-from-top-2">
                    <p className="text-[12px] text-red-600 font-bold flex items-center gap-2">
                      <AlertTriangle size={14} />
                      {error}
                    </p>
                    <button
                      onClick={detectCurrentLocation}
                      className="mt-3 w-full py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Retry Detection
                    </button>
                  </div>
                )}
              </div>

              {/* Saved Addresses Section */}
              {user.savedAddresses && user.savedAddresses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[12px] font-extrabold text-muted-foreground uppercase tracking-widest px-1">Saved Addresses</h3>
                  <div className="grid gap-3">
                    {user.savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => handleSelectLocation(addr.lat, addr.lng, addr.address)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all text-left active:scale-[0.98]"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                          {addr.label === "Home" ? <Home size={20} /> : addr.label === "Work" ? <Briefcase size={20} /> : <MapPinIcon size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[14px] font-bold text-foreground">{addr.label}</h4>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Default</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5 line-clamp-1">{addr.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
          <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">
            Select a location to see nearby pros
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default LocationModal;

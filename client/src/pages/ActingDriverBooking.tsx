import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Calendar, FileText, ShieldCheck, Clock, ThumbsUp,
  ChevronRight, Star, Car
} from "lucide-react";
import { useApp } from "@/context/AppContext";

const ActingDriverBooking = () => {
  const navigate = useNavigate();
  const { serviceId = "drivers" } = useParams();
  const { dispatch } = useApp();

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [days, setDays] = useState(1);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ pickup?: string; drop?: string; days?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!pickup.trim()) newErrors.pickup = "Pickup location is required";
    if (!drop.trim()) newErrors.drop = "Drop location is required";
    if (!days || days < 1) newErrors.days = "Must be at least 1 day";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFindDrivers = () => {
    if (!validate()) return;

    const notes = [
      `Pickup: ${pickup.trim()}`,
      `Drop: ${drop.trim()}`,
      `Days: ${days}`,
      description.trim() ? `Notes: ${description.trim()}` : ""
    ].filter(Boolean).join(" | ");

    dispatch({ type: "SELECT_SERVICE", id: serviceId });
    dispatch({ type: "SET_NOTES", notes });

    sessionStorage.removeItem("searching_providers_state");
    sessionStorage.removeItem("searching_providers_scroll");
    navigate(`/searching-providers/${serviceId}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-foreground">

      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-background sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white flex flex-shrink-0 items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <div>
          <h1 className="text-[20px] font-extrabold text-foreground leading-tight">Acting Drivers</h1>
          <p className="text-[13px] text-muted-foreground font-medium">Book your chauffeur</p>
        </div>
      </div>

      {/* ── Scrollable Form ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-36 space-y-5">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#152E4B] to-[#1C3D63] p-5 shadow-lg">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/2 w-20 h-20 rounded-full bg-accent/10 -translate-x-1/2 translate-y-1/2" />

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Car size={28} className="text-white" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-[16px] leading-tight">Trusted Chauffeur Service</h2>
              <p className="text-white/60 text-[12px] mt-1 leading-snug">Verified, professional drivers for any duration</p>
              <div className="flex items-center gap-1 mt-1.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={11} className="text-accent fill-[#F59E0B]" />
                ))}
                <span className="text-white/70 text-[10px] ml-1">4.9 avg rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Location */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-extrabold text-foreground mb-2 px-1">
            <MapPin size={14} className="text-primary" />
            Pickup Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={pickup}
            onChange={e => { setPickup(e.target.value); setErrors(prev => ({ ...prev, pickup: undefined })); }}
            placeholder="Enter pickup spot (e.g., MG Road, Indiranagar)"
            className={`w-full bg-white rounded-[16px] px-4 py-3.5 text-[14px] font-medium text-foreground border-[1.5px] placeholder:text-muted-foreground focus:outline-none transition-all shadow-sm ${
              errors.pickup ? "border-red-400 focus:border-red-400" : "border-transparent focus:border-[#152E4B]/30"
            }`}
          />
          {errors.pickup && <p className="text-red-500 text-[11px] font-semibold mt-1.5 px-1">{errors.pickup}</p>}
        </div>

        {/* Drop Location */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-extrabold text-foreground mb-2 px-1">
            <MapPin size={14} className="text-accent" />
            Drop Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={drop}
            onChange={e => { setDrop(e.target.value); setErrors(prev => ({ ...prev, drop: undefined })); }}
            placeholder="Enter drop spot (e.g., Airport, Whitefield)"
            className={`w-full bg-white rounded-[16px] px-4 py-3.5 text-[14px] font-medium text-foreground border-[1.5px] placeholder:text-muted-foreground focus:outline-none transition-all shadow-sm ${
              errors.drop ? "border-red-400 focus:border-red-400" : "border-transparent focus:border-[#152E4B]/30"
            }`}
          />
          {errors.drop && <p className="text-red-500 text-[11px] font-semibold mt-1.5 px-1">{errors.drop}</p>}
        </div>

        {/* Route Summary Preview (when both fields filled) */}
        {pickup.trim() && drop.trim() && (
          <div className="bg-white rounded-[16px] p-4 border-[1.5px] border-[#152E4B]/10 shadow-sm flex items-center gap-3 animate-fade-in">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <div className="w-0.5 h-6 bg-dashed border-l border-dashed border-[#152E4B]/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-foreground truncate">{pickup.trim()}</p>
              <p className="text-[11px] text-muted-foreground my-1">to</p>
              <p className="text-[12px] font-bold text-foreground truncate">{drop.trim()}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </div>
        )}

        {/* Number of Days */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-extrabold text-foreground mb-2 px-1">
            <Calendar size={14} className="text-primary" />
            Number of Days <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4 bg-white rounded-[16px] px-4 py-3 shadow-sm border-[1.5px] border-transparent">
            <button
              onClick={() => setDays(d => Math.max(1, d - 1))}
              className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-primary font-extrabold text-xl active:scale-90 transition-transform select-none"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-[26px] font-extrabold text-foreground">{days}</span>
              <span className="text-[13px] text-muted-foreground font-medium ml-2">{days === 1 ? "day" : "days"}</span>
            </div>
            <button
              onClick={() => setDays(d => d + 1)}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-xl active:scale-90 transition-transform select-none"
            >
              +
            </button>
          </div>
          {errors.days && <p className="text-red-500 text-[11px] font-semibold mt-1.5 px-1">{errors.days}</p>}
          {days >= 7 && (
            <p className="text-[11px] text-secondary font-semibold mt-1.5 px-1 flex items-center gap-1">
              <Star size={10} className="fill-[#A95D06] text-secondary" />
              Long-term bookings get priority matching!
            </p>
          )}
        </div>

        {/* Description (Optional) */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-extrabold text-foreground mb-2 px-1">
            <FileText size={14} className="text-primary" />
            Description <span className="text-muted-foreground font-medium">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Any specific needs? (e.g., prefer non-smoker, need early morning pickup)"
            className="w-full bg-white rounded-[16px] px-4 py-3.5 text-[14px] font-medium text-foreground border-[1.5px] border-transparent placeholder:text-muted-foreground focus:outline-none focus:border-[#152E4B]/30 transition-all shadow-sm resize-none"
          />
        </div>

        {/* Trust Badges */}
        <div className="flex gap-4 items-end justify-between opacity-80 px-2 pt-2">
          <span className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-muted-foreground text-center uppercase tracking-wide">
            <ShieldCheck size={26} className="text-secondary mb-1" strokeWidth={1.5} />
            Verified Drivers
          </span>
          <span className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-muted-foreground text-center uppercase tracking-wide">
            <Clock size={26} className="text-primary mb-1" strokeWidth={1.5} />
            On-time Arrival
          </span>
          <span className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-muted-foreground text-center uppercase tracking-wide">
            <ThumbsUp size={26} className="text-accent mb-1" strokeWidth={1.5} />
            100% Satisfaction
          </span>
        </div>
      </div>

      {/* ── Fixed CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-5 py-4 bg-background border-t border-[#E0E6EE]">
        <button
          onClick={handleFindDrivers}
          className="w-full py-4 rounded-[18px] bg-primary text-white font-extrabold text-[15px] tracking-tight shadow-[0_4px_20px_rgba(21,46,75,0.35)] hover:bg-[#1C3D63] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Car size={18} strokeWidth={2.5} />
          Find Drivers
        </button>
        <p className="text-center text-[10px] text-muted-foreground font-medium mt-2">
          Matches you with the nearest available chauffeur
        </p>
      </div>
    </div>
  );
};

export default ActingDriverBooking;

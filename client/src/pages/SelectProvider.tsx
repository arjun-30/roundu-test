import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

import { useApp, ProviderQuote } from "@/context/AppContext";
import { createBooking } from "@/lib/api";
import { getServiceById } from "@/data/mockData";

/**
 * SELECT PROVIDER — Image 2
 *
 * Layout (top → bottom):
 *  ┌─────────────────────────────────────┐
 *  │ ← Service Name       PROVIDERS      │  Header
 *  │   🟠 Searching… 4:54  0 Available   │
 *  ├─────────────────────────────────────┤
 *  │ [All] [Best Price] [Top Rated]      │  Filter chips
 *  ├─────────────────────────────────────┤
 *  │                                     │
 *  │         ○ Search pulse animation    │  Center area
 *  │   Matching nearby experts…          │
 *  │   Broadcasting your request…        │
 *  │                                     │
 *  │ ┌────────┐ ┌────────┐              │  Horizontal quote cards
 *  │ │Provider│ │Provider│  …           │
 *  │ └────────┘ └────────┘              │
 *  ├─────────────────────────────────────┤
 *  │ [Select a Provider to Accept]       │  Bottom
 *  │ [Cancel Request]                    │
 *  └─────────────────────────────────────┘
 */

const SelectProvider = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const {
    user,
    nearbyProviders,
    currentLocation,
    dispatch,
    receivedQuotes,
    bookingNotes,
    bookingVoiceNote,
    bookingVoiceNoteUrl,
    bookingImages,
  } = useApp();

  const [error, setError] = useState("");
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  // ── Timer: inherited from sessionStorage so the clock continues from SearchingProviders ──
  const [searchStartTime] = useState<number>(() => {
    const stored =
      sessionStorage.getItem("search_start_time") ||
      localStorage.getItem("search_start_time");
    if (stored) return Number(stored);
    const now = Date.now();
    sessionStorage.setItem("search_start_time", String(now));
    localStorage.setItem("search_start_time", String(now));
    return now;
  });

  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [retryStartTime, setRetryStartTime] = useState<number | null>(null);

  useEffect(() => {
    const start = retryStartTime ?? searchStartTime;
    const update = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const secs = Math.max(300 - elapsed, 0);
      setRemainingSeconds(secs);
      if (secs <= 0 && !hasTimedOut) {
        setHasTimedOut(true);
        setShowTimeoutModal(true);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [searchStartTime, hasTimedOut, retryStartTime]);

  const [activeFilter, setActiveFilter] = useState<"all" | "price" | "rating">("all");
  const [selectedQuote, setSelectedQuote] = useState<ProviderQuote | null>(null);

  const foundCount = Math.max(
    Object.keys(nearbyProviders).length,
    receivedQuotes.length
  );

  const sortedQuotes = useMemo(() => {
    const copy = [...receivedQuotes];
    if (copy.length === 0) return [];

    if (activeFilter === "price") {
      copy.sort((a, b) => Number(a.price) - Number(b.price));
      return [copy[0]]; // Only the lowest price
    }
    if (activeFilter === "rating") {
      copy.sort((a, b) => Number(b.rating) - Number(a.rating));
      return [copy[0]]; // Only the highest rating
    }
    return copy;
  }, [receivedQuotes, activeFilter]);

  // Auto-select the top quote based on the current filter when quotes arrive or filter changes
  useEffect(() => {
    if (sortedQuotes.length > 0) {
      setSelectedQuote(sortedQuotes[0]);
    } else {
      setSelectedQuote(null);
    }
  }, [sortedQuotes]);

  // Sync sessionStorage so quotes aren't resurrected when going back to SearchingProviders
  useEffect(() => {
    sessionStorage.setItem("searching_providers_quotes", JSON.stringify(receivedQuotes));
  }, [receivedQuotes]);

  // Navigate back to searching if all quotes are cancelled
  useEffect(() => {
    if (receivedQuotes.length === 0 && serviceId) {
      navigate(`/searching-providers/${serviceId}`, { replace: true });
    }
  }, [receivedQuotes.length, serviceId, navigate]);

  const handleCancelRequest = () => {
    sessionStorage.removeItem("search_start_time");
    localStorage.removeItem("search_start_time");
    sessionStorage.removeItem("searching_providers_state");
    sessionStorage.removeItem("searching_providers_quotes");
    dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
    navigate("/home", { replace: true });
  };

  const handleAcceptQuote = async (quote: ProviderQuote) => {
    if (acceptingQuoteId) return;
    try {
      setError("");
      setAcceptingQuoteId(quote.providerId);

      const bookingData = {
        broadcast_id: quote.broadcastId,
        customer_id: String(user?.id || ""),
        provider_id: String(quote.providerId || ""),
        service_id: String(serviceId || ""),
        status: "assigned",
        scheduled_at: new Date().toISOString(),
        address:
          user?.address ||
          (currentLocation
            ? `${currentLocation.lat},${currentLocation.lng}`
            : "Customer Location"),
        lat: currentLocation?.lat || null,
        lng: currentLocation?.lng || null,
        price: Number(quote.price || 0),
        notes: bookingNotes || "",
        voice_note: bookingVoiceNote || false,
        voice_note_url: bookingVoiceNoteUrl || null,
        paid: false,
        images: bookingImages || [],
      };

      const res = await createBooking(bookingData);

      if (res?.success && res?.data?.id) {
        dispatch({ type: "ADD_BOOKING", booking: res.data });
        sessionStorage.removeItem("search_start_time");
        localStorage.removeItem("search_start_time");
        sessionStorage.removeItem("searching_providers_state");
        sessionStorage.removeItem("searching_providers_quotes");
        navigate(`/tracking/${res.data.id}`);
        return;
      }

      throw new Error(res?.message || "Booking creation failed");
    } catch (err: any) {
      console.error("ACCEPT QUOTE ERROR", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to confirm booking"
      );
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  const service = getServiceById(serviceId || "");
  const timeLabel = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── TIMEOUT MODAL ── */}
      {showTimeoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl mx-4">
            <h2 className="text-xl font-bold mb-3 text-[#152E4B]">No Providers Available</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              We couldn't find an available provider near your location right now.
              Please try again or schedule for another time.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  const now = Date.now();
                  sessionStorage.setItem("search_start_time", String(now));
                  localStorage.setItem("search_start_time", String(now));
                  setHasTimedOut(false);
                  setShowTimeoutModal(false);
                  setRetryStartTime(now);
                  setRemainingSeconds(300);
                }}
                className="px-5 py-2.5 bg-[#A95D06] hover:bg-[#A95D06]/90 text-white rounded-2xl font-bold text-sm active:scale-95 transition"
              >
                Try Again
              </button>
              <button
                onClick={handleCancelRequest}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm active:scale-95 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 bg-white border-b border-slate-100">
        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancelRequest}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm active:scale-95 transition"
          >
            <ArrowLeft size={18} className="text-[#152E4B]" />
          </button>
          <div>
            <h1 className="text-[18px] font-extrabold text-[#152E4B] leading-tight">
              {service?.label || "Service"}
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#A95D06] animate-pulse inline-block" />
              Searching… {timeLabel}
            </p>
          </div>
        </div>

        {/* Right: Providers badge */}
        <div className="border border-slate-200 rounded-2xl px-4 py-2 text-center bg-white shadow-sm">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#A95D06]">
            Providers
          </p>
          <p className="text-[13px] font-extrabold text-[#152E4B]">
            {foundCount} Available
          </p>
        </div>
      </div>

      {/* ── FILTER CHIPS ── */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-slate-50 overflow-x-auto scrollbar-hide">
        {(["all", "price", "rating"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-5 py-2 rounded-full font-bold text-xs capitalize transition active:scale-95 border ${
              activeFilter === f
                ? "bg-[#A95D06] text-white border-transparent shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All" : f === "price" ? "Best Price" : "Top Rated"}
          </button>
        ))}
      </div>

      {/* ── SCROLLABLE BODY: vertical quote list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {sortedQuotes.length === 0 ? (
          /* Skeleton placeholders */
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#F4F6FA] rounded-2xl p-4 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                    <div>
                      <div className="h-3.5 bg-slate-200 rounded w-28 mb-2" />
                      <div className="h-2.5 bg-slate-200 rounded w-20" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-slate-200 rounded w-12 mb-1" />
                    <div className="h-2.5 bg-slate-200 rounded w-16" />
                  </div>
                </div>
                <div className="h-9 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </>
        ) : (
          /* Real quote cards — vertical */
          <>
            {sortedQuotes.map((q) => {
              const isSelected = selectedQuote?.providerId === q.providerId;
              return (
                <div
                  key={q.providerId}
                  onClick={() => setSelectedQuote(q)}
                  className={`bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all duration-200 shadow-sm ${
                    isSelected
                      ? "border-[#152E4B] shadow-md"
                      : "border-slate-100 hover:border-slate-300"
                  }`}
                >
                  {/* Provider info row */}
                  <div className="flex items-center justify-between mb-3">
                    {/* Clickable left: avatar + name + rating */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/provider/${q.providerId}`, { state: { quote: q } });
                      }}
                      className="flex items-center gap-2.5 text-left flex-1 min-w-0 active:opacity-70 transition-opacity"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#152E4B] text-sm overflow-hidden shrink-0">
                        {q.providerAvatar && q.providerAvatar.length > 2 ? (
                          <img src={q.providerAvatar} alt={q.providerName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="lowercase">{q.providerAvatar || q.providerName?.charAt(0)}</span>
                        )}
                      </div>
                      {/* Name + rating */}
                      <div className="min-w-0">
                        <p className="font-bold text-[14px] text-[#152E4B] leading-tight truncate">{q.providerName}</p>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Star size={10} className="fill-[#A95D06] text-[#A95D06]" />
                          <span>{Number(q.rating || 0).toFixed(1)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{q.distanceKm} km away</span>
                        </div>
                      </div>
                    </button>
                    {/* Price + ETA */}
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[19px] font-black text-[#152E4B] leading-tight">₹{q.price}</p>
                      <p className="text-[11px] font-bold text-green-600 leading-tight">ETA {q.etaMin} mins</p>
                    </div>
                  </div>

                  {/* Select toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQuote(isSelected ? null : q);
                    }}
                    className={`w-full py-3 rounded-[14px] font-bold text-[13px] transition active:scale-95 flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-white text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="7" fill="#15803d"/>
                          <path d="M3.5 7L6 9.5L10.5 4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Selected
                      </>
                    ) : (
                      "Select"
                    )}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── BOTTOM ACTIONS ── */}
      <div className="px-5 py-5 bg-white border-t border-slate-100 flex flex-col gap-3">
        {error && (
          <p className="text-red-500 text-xs font-semibold text-center">{error}</p>
        )}

        {/* Accept selected quote */}
        <button
          disabled={!selectedQuote || !!acceptingQuoteId}
          onClick={() => selectedQuote && handleAcceptQuote(selectedQuote)}
          className={`w-full py-4 rounded-2xl font-bold text-[15px] transition active:scale-95 ${
            !selectedQuote
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : acceptingQuoteId
              ? "bg-[#152E4B]/70 text-white cursor-wait"
              : "bg-[#152E4B] text-white shadow-lg hover:bg-[#152E4B]/95"
          }`}
        >
          {acceptingQuoteId
            ? "Confirming Booking…"
            : selectedQuote
            ? `Accept Quote — ₹${selectedQuote.price}`
            : "Select a Provider to Accept"}
        </button>

        {/* Cancel */}
        <button
          onClick={handleCancelRequest}
          className="w-full py-3.5 rounded-2xl border-2 border-[#A95D06] bg-transparent text-[#A95D06] font-bold text-[14px] hover:bg-[#A95D06]/5 transition active:scale-95"
        >
          Cancel Request
        </button>
      </div>
    </div>
  );
};

export default SelectProvider;

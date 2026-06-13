import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Search,
} from "lucide-react";

import { useApp, ProviderQuote } from "@/context/AppContext";
import { createBooking } from "@/lib/api";
import { getServiceById } from "@/data/mockData";

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

  const [foundCount, setFoundCount] = useState(0);
  const [error, setError] = useState("");
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  // Sync Timer from sessionStorage/localStorage
  const [searchStartTime, setSearchStartTime] = useState<number>(() => {
    const stored = sessionStorage.getItem('search_start_time') || localStorage.getItem('search_start_time');
    if (stored) return Number(stored);
    const now = Date.now();
    sessionStorage.setItem('search_start_time', String(now));
    localStorage.setItem('search_start_time', String(now));
    return now;
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - searchStartTime) / 1000);
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
  }, [searchStartTime, hasTimedOut]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'price' | 'rating'>('all');
  const [selectedQuote, setSelectedQuote] = useState<ProviderQuote | null>(null);

  // Real provider count
  useEffect(() => {
    const providerCount = Object.keys(nearbyProviders).length;
    const quotesCount = receivedQuotes.length;
    setFoundCount(Math.max(providerCount, quotesCount));
  }, [nearbyProviders, receivedQuotes]);

  // Sort and filter quotes
  const sortedQuotes = useMemo(() => {
    const quotesCopy = [...receivedQuotes];
    if (activeFilter === 'price') {
      return quotesCopy.sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (activeFilter === 'rating') {
      return quotesCopy.sort((a, b) => Number(b.rating) - Number(a.rating));
    }
    return quotesCopy;
  }, [receivedQuotes, activeFilter]);

  // Handle auto-selecting the first quote when list changes
  useEffect(() => {
    if (sortedQuotes.length > 0) {
      if (!selectedQuote || !sortedQuotes.some(q => q.providerId === selectedQuote.providerId)) {
        setSelectedQuote(sortedQuotes[0]);
      }
    } else {
      setSelectedQuote(null);
    }
  }, [sortedQuotes, selectedQuote]);

  // Accept quote handler
  const handleAcceptQuote = async (quote: ProviderQuote) => {
    if (acceptingQuoteId) return;

    try {
      setError("");
      setAcceptingQuoteId(quote.providerId);

      const bookingData = {
        customer_id: String(user?.id || ""),
        provider_id: String(quote.providerId || ""),
        service_id: String(serviceId || ""),
        status: "assigned",
        scheduled_at: new Date().toISOString(),
        address:
          user?.address ||
          (currentLocation
            ? `${currentLocation?.lat},${currentLocation?.lng}`
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

      console.log("CONFIRM BOOKING PAYLOAD", bookingData);
      const res = await createBooking(bookingData);
      console.log("CONFIRM BOOKING RESPONSE", res);

      if (res?.success && res?.data?.id) {
        dispatch({ type: "ADD_BOOKING", booking: res.data });
        // Clear searching states
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

  const handleCancelRequest = () => {
    sessionStorage.removeItem("search_start_time");
    localStorage.removeItem("search_start_time");
    sessionStorage.removeItem("searching_providers_state");
    sessionStorage.removeItem("searching_providers_quotes");
    dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
    navigate("/home", { replace: true });
  };

  const service = getServiceById(serviceId || "");

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col relative font-sans overflow-hidden">
      
      {/* TIMEOUT MODAL */}
      {showTimeoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 mx-4">
            <h2 className="text-xl font-bold mb-3 text-[#152E4B]">No Providers Available</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              We couldn't find an available provider within 5 km of your location right now.
              Please try again later or schedule the service for another time.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  sessionStorage.removeItem('search_start_time');
                  localStorage.removeItem('search_start_time');
                  setHasTimedOut(false);
                  setShowTimeoutModal(false);
                  const now = Date.now();
                  sessionStorage.setItem('search_start_time', String(now));
                  localStorage.setItem('search_start_time', String(now));
                  setSearchStartTime(now);
                  setRemainingSeconds(300);
                }}
                className="px-5 py-2.5 bg-[#A95D06] hover:bg-[#A95D06]/90 text-white rounded-2xl font-bold text-sm active:scale-95 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  handleCancelRequest();
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm active:scale-95 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.02)] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Standard back navigates home and clears search context
              handleCancelRequest();
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#152E4B]/10 text-[#152E4B] hover:bg-slate-50 transition active:scale-95 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#152E4B]">
              {service?.label || "Service"}
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#A95D06] animate-ping" />
              Searching... {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
            </p>
          </div>
        </div>
        <div className="bg-[#152E4B]/5 border border-[#152E4B]/10 rounded-2xl px-4 py-2 text-right flex flex-col justify-center">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#A95D06]">
            Providers
          </span>
          <span className="text-sm font-extrabold text-[#152E4B]">
            {foundCount} Available
          </span>
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div className="flex gap-2 px-5 py-3 bg-white border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {(['all', 'price', 'rating'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-5 py-2 rounded-full font-bold text-xs capitalize transition active:scale-95 border ${
              activeFilter === f
                ? "bg-[#A95D06] text-white border-transparent shadow-sm shadow-[#A95D06]/20"
                : "bg-white text-slate-700 border-slate-200 hover:bg-[#152E4B]/5"
            }`}
          >
            {f === 'all' ? 'All' : f === 'price' ? 'Best Price' : 'Top Rated'}
          </button>
        ))}
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto min-h-0">
        
        {/* CENTER PULSING MAGNET ANIMATION */}
        <div className="flex-1 flex flex-col justify-center items-center py-8 px-5">
          <div className="relative w-36 h-36 flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#A95D06]/20 animate-spin duration-[15s]" />
            <div className="absolute w-28 h-28 rounded-full border border-slate-200 animate-pulse duration-[2s]" />
            <div className="absolute w-20 h-20 rounded-full bg-[#152E4B]/5 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#152E4B] flex items-center justify-center text-white shadow-md">
                <Search size={22} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-bold text-[#152E4B] mb-2">
              Matching nearby experts...
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Broadcasting your request to vetted technicians. Available quotes will appear below instantly.
            </p>
          </div>
        </div>

        {/* PROVIDERS SCROLL ROW */}
        <div className="pb-6">
          {sortedQuotes.length === 0 ? (
            /* Skeletons */
            <div className="flex gap-4 overflow-x-auto px-5 py-2 scrollbar-hide">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[270px] shrink-0 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse flex flex-col justify-between h-[210px]"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100" />
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                  </div>
                  <div className="mt-4">
                    <div className="h-9 bg-slate-100 rounded-2xl w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Quotes cards snap layout */
            <div className="flex gap-4 overflow-x-auto px-5 py-2 scrollbar-hide snap-x snap-mandatory">
              {sortedQuotes.map((q) => (
                <div
                  key={q.providerId}
                  onClick={() => setSelectedQuote(q)}
                  className={`w-[270px] shrink-0 bg-white rounded-3xl p-5 border flex flex-col justify-between snap-start cursor-pointer transition-all duration-300 ${
                    selectedQuote?.providerId === q.providerId
                      ? "border-2 border-[#A95D06] shadow-lg shadow-[#A95D06]/10 scale-[1.01]"
                      : "border-slate-100 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div>
                    {/* Provider Avatar & Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center font-bold text-white bg-[#152E4B] overflow-hidden">
                        {q.providerAvatar && q.providerAvatar.length > 2 ? (
                          <img src={q.providerAvatar} alt={q.providerName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{q.providerAvatar || q.providerName?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 truncate text-[15px]">
                          {q.providerName}
                        </h3>
                        <div className="flex items-center gap-1 text-[12px] text-[#A95D06] font-semibold mt-0.5">
                          <Star size={12} className="fill-[#A95D06] stroke-none" />
                          <span>{q.rating}</span>
                          <span className="text-slate-400 font-normal">(Verified)</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[12px] text-slate-500 line-clamp-2 mb-4 min-h-[32px] leading-relaxed">
                      Expert {service?.label || "Service"} provider. Specializes in quick installations, troubleshooting, and repairs.
                    </p>
                  </div>

                  <div>
                    {/* Price & ETA */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 mb-4">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none mb-1">
                          Price
                        </span>
                        <span className="text-[17px] font-black text-[#152E4B]">
                          ₹{q.price}/hr
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none mb-1">
                          Distance & ETA
                        </span>
                        <span className="text-[12px] font-bold text-slate-700">
                          {q.distanceKm} km · <span className="text-[#A95D06]">{q.etaMin} mins</span>
                        </span>
                      </div>
                    </div>

                    {/* Selector button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuote(q);
                      }}
                      className={`w-full py-2.5 rounded-2xl font-bold text-xs transition active:scale-95 ${
                        selectedQuote?.providerId === q.providerId
                          ? "bg-[#A95D06] text-white shadow-sm shadow-[#A95D06]/20"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {selectedQuote?.providerId === q.providerId ? "Selected" : "Select Provider"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS */}
      <div className="mt-auto px-5 py-5 bg-white border-t border-slate-100 z-30 flex flex-col gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        {error && (
          <div className="text-red-500 text-xs font-semibold text-center mb-1">
            {error}
          </div>
        )}

        <button
          disabled={!selectedQuote || acceptingQuoteId !== null}
          onClick={() => selectedQuote && handleAcceptQuote(selectedQuote)}
          className={`w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
            !selectedQuote
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              : acceptingQuoteId
              ? "bg-[#152E4B]/80 text-white cursor-wait"
              : "bg-[#152E4B] text-white hover:bg-[#152E4B]/95 shadow-[#152E4B]/15"
          }`}
        >
          {acceptingQuoteId ? (
            "Confirming Booking..."
          ) : selectedQuote ? (
            `Accept Quote — ₹${selectedQuote.price}`
          ) : (
            "Select a Provider to Accept"
          )}
        </button>

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

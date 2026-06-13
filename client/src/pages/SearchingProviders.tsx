import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  ChevronRight,
  Star,
} from "lucide-react";

import { useApp, ProviderQuote } from "@/context/AppContext";
import { socket } from "@/lib/socket";
import { createBooking } from "@/lib/api";
import { useCurrentLocation } from "@/hooks/useLocation";
import { getServiceById } from "@/data/mockData";
import { motion } from "framer-motion";

/**
 * MODERN SEARCHING EXPERIENCE
 */

const SECONDARY_STATUS_MESSAGES = [
  "Scanning nearby providers...",
  "Checking live availability...",
  "Matching top-rated providers...",
  "Looking for the fastest response...",
  "Verifying trusted professionals...",
  "Searching your surrounding area...",
];

interface CachedSearchState {
  serviceId: string;
  broadcastId: string;
  statusIndex: number;
  activeDotIndex: number;
  isLongWait: boolean;
}

const getCachedSearchState = (
  serviceId: string | undefined
): CachedSearchState | null => {
  try {
    const cached = sessionStorage.getItem("searching_providers_state");

    if (cached) {
      const parsed = JSON.parse(cached);

      if (parsed.serviceId === serviceId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse cached search state", e);
  }

  return null;
};

const SearchingProviders = () => {
  const { serviceId } = useParams();

  const navigate = useNavigate();

  const cachedState = getCachedSearchState(serviceId);

  const [foundCount, setFoundCount] = useState(0);

  const [statusIndex, setStatusIndex] = useState(
    () => cachedState?.statusIndex ?? 0
  );

  const [activeDotIndex, setActiveDotIndex] = useState(
    () => cachedState?.activeDotIndex ?? 0
  );

  const [isLongWait, setIsLongWait] = useState(
    () => cachedState?.isLongWait ?? false
  );

  const [error, setError] = useState("");

  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(
    null
  );

  // Timer state for provider search timeout
  const [searchStartTime, setSearchStartTime] = useState<number>(() => {
    const cached = getCachedSearchState(serviceId);
    if (cached) {
      const stored = sessionStorage.getItem('search_start_time') || localStorage.getItem('search_start_time');
      if (stored) return Number(stored);
    }
    const now = Date.now();
    sessionStorage.setItem('search_start_time', String(now));
    localStorage.setItem('search_start_time', String(now));
    return now;
  });
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);

  // Effect to update countdown every second
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

  const {
    user,
    nearbyProviders,
    currentLocation,
    dispatch,
    receivedQuotes,
    bookingNotes,
    bookingVoiceNoteUrl,
    bookingVoiceNote,
    bookingImages,
    selectedDate,
    selectedTime,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'price' | 'rating'>('all');
  const [selectedQuote, setSelectedQuote] = useState<ProviderQuote | null>(null);

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

  useEffect(() => {
    if (sortedQuotes.length > 0) {
      if (!selectedQuote || !sortedQuotes.some(q => q.providerId === selectedQuote.providerId)) {
        setSelectedQuote(sortedQuotes[0]);
      }
    } else {
      setSelectedQuote(null);
    }
  }, [sortedQuotes, selectedQuote]);

  const isRestoredRef = useRef(!!cachedState);

  const hasTriggered = useRef(!!cachedState);

  const [broadcastId] = useState(
    () => cachedState?.broadcastId || `bc-${user?.id || "anon"}-${Date.now()}`
  );

  // GPS -> SVG Position
  const getProviderPos = (lat: number, lng: number) => {
    if (!currentLocation) {
      return { x: 190, y: 170, opacity: 0 };
    }

    const zoom = 10000;

    const dx = (lng - currentLocation.lng) * zoom;

    const dy = (currentLocation.lat - lat) * zoom;

    return {
      x: 190 + dx,
      y: 170 + dy,
      opacity: 1,
    };
  };

  // LOCATION
  const coordsRef = useRef<{ lat: number; lng: number } | null>(
    currentLocation
  );

  const handleLocationUpdate = useCallback(
    (lat: number, lng: number) => {
      coordsRef.current = { lat, lng };

      dispatch({
        type: "SET_CURRENT_LOCATION",
        lat,
        lng,
      });
    },
    [dispatch]
  );

  useCurrentLocation(handleLocationUpdate);

  // SCROLL
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem(
        "searching_providers_scroll",
        scrollContainerRef.current.scrollTop.toString()
      );
    }
  };

  useEffect(() => {
    if (receivedQuotes.length > 0 && scrollContainerRef.current) {
      const savedScroll = sessionStorage.getItem(
        "searching_providers_scroll"
      );

      if (savedScroll) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
          }
        }, 50);
      }
    }
  }, [receivedQuotes.length]);

  // ANIMATIONS
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setActiveDotIndex((prev) => (prev + 1) % 5);
    }, 650);

    const statusInterval = setInterval(() => {
      setStatusIndex(
        (prev) => (prev + 1) % SECONDARY_STATUS_MESSAGES.length
      );
    }, 2600);

    const waitTimeout = setTimeout(() => {
      setIsLongWait(true);
    }, 15000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(statusInterval);
      clearTimeout(waitTimeout);
    };
  }, []);

  // REAL PROVIDER COUNT
  useEffect(() => {
    const providerCount = Object.keys(nearbyProviders).length;

    const quotesCount = receivedQuotes.length;

    setFoundCount(Math.max(providerCount, quotesCount));
  }, [nearbyProviders, receivedQuotes]);

  // CACHE STATE
  useEffect(() => {
    if (!serviceId) return;

    const stateToCache: CachedSearchState = {
      serviceId,
      broadcastId,
      statusIndex,
      activeDotIndex,
      isLongWait,
    };

    sessionStorage.setItem(
      "searching_providers_state",
      JSON.stringify(stateToCache)
    );
  }, [
    serviceId,
    broadcastId,
    statusIndex,
    activeDotIndex,
    isLongWait,
  ]);

  // CACHE QUOTES
  useEffect(() => {
    if (receivedQuotes.length > 0) {
      sessionStorage.setItem(
        "searching_providers_quotes",
        JSON.stringify(receivedQuotes)
      );
    }
  }, [receivedQuotes]);

  // BROADCAST
  useEffect(() => {
    if (isRestoredRef.current) {
      try {
        const cachedQuotes = sessionStorage.getItem(
          "searching_providers_quotes"
        );

        if (cachedQuotes) {
          const parsed = JSON.parse(cachedQuotes);

          parsed.forEach((q: any) => {
            dispatch({
              type: "ADD_RECEIVED_QUOTE",
              quote: q,
            });
          });
        }
      } catch (e) {
        console.error("Failed to restore quotes", e);
      }
    } else {
        dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
        // New quick‑fix request – clear any persisted start time so a fresh timer begins.
        sessionStorage.removeItem('search_start_time');
        localStorage.removeItem('search_start_time');
        // Re‑initialise the start timestamp for this new session.
        const freshNow = Date.now();
        sessionStorage.setItem('search_start_time', String(freshNow));
        localStorage.setItem('search_start_time', String(freshNow));
        setSearchStartTime(freshNow);
        setRemainingSeconds(300);
    }

    const buildPayload = () => ({
      broadcastId,
      customerId: user.id,
      customerName: user.name,
      serviceId: serviceId || "electrician",
      address: user.address || "Current Location",
      lat: coordsRef.current?.lat ?? null,
      lng: coordsRef.current?.lng ?? null,
      date: selectedDate || new Date().toISOString().slice(0, 10),
      time:
        selectedTime ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      notes: bookingNotes || "Quick fix request from customer",
      voiceNoteUrl: bookingVoiceNoteUrl,
      voiceNote: bookingVoiceNote,
      images: bookingImages || [],
    });

    const doEmit = () => {
      if (socket.connected) {
        socket.emit("broadcast_job", buildPayload());

        if (!hasTriggered.current) {
          dispatch({
            type: "ADD_NOTIFICATION",
            text: "Searching for nearby providers...",
          });

          hasTriggered.current = true;
        }
      }
    };

    if (socket.connected) {
      doEmit();
    } else {
      socket.once("connect", doEmit);
    }

    const interval = setInterval(doEmit, 5000);

    return () => {
      clearInterval(interval);
      socket.off("connect", doEmit);
    };
  }, [
    serviceId,
    user,
    dispatch,
    bookingNotes,
    bookingVoiceNoteUrl,
    bookingVoiceNote,
  ]);

  // ACCEPT QUOTE
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

      console.log("BOOKING PAYLOAD", bookingData);

      const res = await createBooking(bookingData);

      console.log("BOOKING RESPONSE", res);

      if (res?.success && res?.data?.id) {
        // Add booking to context and navigate to tracking page
        dispatch({ type: "ADD_BOOKING", booking: res.data });
        navigate(`/tracking/${res.data.id}`);
        return;
      }

      throw new Error(res?.message || "Booking creation failed");
    } catch (error: any) {
      console.error("ACCEPT QUOTE ERROR", error);
      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to confirm booking"
      );
    } finally {
      setAcceptingQuoteId(null);
    }
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
                  sessionStorage.removeItem("search_start_time");
                  localStorage.removeItem("search_start_time");
                  navigate(-1);
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
              sessionStorage.removeItem("search_start_time");
              localStorage.removeItem("search_start_time");
              navigate(-1);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#152E4B]/10 text-[#152E4B] hover:bg-slate-50 transition active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#152E4B]">
              {service?.label || "Quick Fix"}
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
                : "bg-transparent text-[#152E4B] border-[#152E4B]/20 hover:bg-[#152E4B]/5"
            }`}
          >
            {f === 'all' ? 'All' : f === 'price' ? 'Best Price' : 'Top Rated'}
          </button>
        ))}
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto min-h-0">
        
        {/* RADAR ANIMATION / INCOMING QUOTES SUMMARY */}
        {sortedQuotes.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center py-8 px-5">
            {/* Themed Pulse Radar */}
            <div className="relative w-44 h-44 flex items-center justify-center mb-8">
              <div className="absolute inset-0 rounded-full border border-[#A95D06]/10 animate-ping duration-[3000ms]" />
              <div className="absolute w-32 h-32 rounded-full border border-[#152E4B]/15 animate-pulse duration-[2000ms]" />
              <div className="absolute w-20 h-20 rounded-full border border-[#A95D06]/20" />
              <div className="w-12 h-12 rounded-full bg-[#152E4B] border-4 border-white shadow-xl flex items-center justify-center z-10">
                <span className="text-lg animate-bounce">🔍</span>
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
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center py-8 px-5">
            {/* Match Indicator */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#A95D06]/20 animate-spin duration-[15s]" />
              <div className="absolute w-28 h-28 rounded-full bg-[#152E4B]/5 flex items-center justify-center">
                <span className="text-4xl animate-pulse">🤝</span>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-[17px] font-bold text-[#152E4B] mb-2">
                Technicians are ready to help!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Review available quotes, check ratings and proximity, then select a provider to accept.
              </p>
            </div>
          </div>
        )}

        {/* PROVIDERS SCROLL ROW */}
        <div className="pb-6">
          {sortedQuotes.length === 0 ? (
            /* Loading Skeletons */
            <div className="flex gap-4 overflow-x-auto px-5 py-2 scrollbar-hide">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[270px] shrink-0 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse flex flex-col justify-between"
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
                  <div className="mt-6">
                    <div className="flex justify-between border-t border-slate-50 pt-3 mb-4">
                      <div className="h-4 bg-slate-100 rounded w-1/4" />
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                    </div>
                    <div className="h-9 bg-slate-100 rounded-2xl w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Actual Quotes List */
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
                    {/* Card Header: Avatar & Name */}
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
                          <Star size={12} className="fill-[#A95D06]" />
                          <span>{q.rating}</span>
                          <span className="text-slate-400 font-normal">(Verified)</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Description */}
                    <p className="text-[12px] text-slate-500 line-clamp-2 mb-4 min-h-[32px] leading-relaxed">
                      Expert {service?.label || "Service"} provider. Specializes in quick installations, troubleshooting, and repairs.
                    </p>
                  </div>

                  <div>
                    {/* Details Row: Price, Distance, ETA */}
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

                    {/* Select Button */}
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

      {/* BOTTOM ACTIONS BAR */}
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
          onClick={() => {
            sessionStorage.removeItem("search_start_time");
            localStorage.removeItem("search_start_time");
            navigate(-1);
          }}
          className="w-full py-3.5 rounded-2xl border-2 border-[#A95D06] bg-transparent text-[#A95D06] font-bold text-[14px] hover:bg-[#A95D06]/5 transition active:scale-95"
        >
          Cancel Request
        </button>
      </div>

    </div>
  );
};

export default SearchingProviders;
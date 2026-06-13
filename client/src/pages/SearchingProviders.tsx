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

  // Redirect to SelectProvider when a quote is received
  useEffect(() => {
    if (receivedQuotes.length > 0) {
      navigate(`/select-provider/${serviceId}`);
    }
  }, [receivedQuotes, serviceId, navigate]);

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
                    onClick={handleCancelRequest}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm active:scale-95 transition"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BACK BUTTON */}
          <div className="absolute top-6 left-5 z-30">
            <button
              onClick={handleCancelRequest}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#152E4B]/10 text-[#152E4B] hover:bg-slate-50 transition active:scale-95 shadow-md"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          {/* RADAR GRIDS & CONCENTRIC PULSE ANIMATION */}
          <div className="flex-1 relative flex flex-col justify-start items-center pt-24 min-h-[50vh]">
            {/* Live Search Badge */}
            <div className="bg-white shadow-md border border-slate-100 rounded-full px-4 py-2 flex items-center gap-2 z-20 mb-12">
              <span className="w-2 h-2 rounded-full bg-[#A95D06] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">LIVE SEARCH</span>
              <span className="text-[9px] font-bold text-slate-600">No providers nearby</span>
            </div>

            {/* Concentric Circle Radar */}
            <div className="relative w-[280px] h-[280px] flex items-center justify-center">
              {/* SVG Grid Lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <svg className="w-full h-full text-slate-400" viewBox="0 0 100 100">
                  <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.1" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.1" />
                  {[10, 20, 30, 40, 60, 70, 80, 90].map((v) => (
                    <g key={v}>
                      <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.05" strokeDasharray="1,1" />
                      <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.05" strokeDasharray="1,1" />
                    </g>
                  ))}
                </svg>
              </div>

              {/* Pulse circles */}
              <div className="absolute inset-0 rounded-full border border-[#152E4B]/5 animate-ping duration-[3.5s]" />
              <div className="absolute w-[220px] h-[220px] rounded-full border border-[#152E4B]/10 animate-pulse duration-[2.5s]" />
              <div className="absolute w-[140px] h-[140px] rounded-full border border-[#152E4B]/15" />
              <div className="absolute w-[70px] h-[70px] rounded-full bg-[#152E4B]/5 border border-[#152E4B]/20 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-[#152E4B] border-2 border-white shadow" />
              </div>
            </div>
          </div>

          {/* BOTTOM SHEET DETAILS CARD */}
          <div className="bg-white rounded-t-[40px] px-6 pt-5 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] border-t border-slate-100 flex flex-col items-center mt-auto z-10">
            {/* Bottom sheet drag handle style */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mb-6" />

            <h2 className="text-2xl font-extrabold text-[#152E4B] mb-4 text-center">
              Searching nearby providers
            </h2>

            {/* Countdown */}
            <div className="text-center mb-4">
              <span className="text-[10px] text-[#A95D06] font-extrabold uppercase tracking-wider block mb-1">
                Time Remaining
              </span>
              <span className="text-3xl font-black text-[#A95D06] tracking-wide">
                {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            </div>

            {/* Subtitle Message */}
            <p className="text-xs text-slate-500 font-semibold text-center mb-5 animate-pulse min-h-[16px]">
              {SECONDARY_STATUS_MESSAGES[statusIndex]}
            </p>

            {/* Dot Indicators */}
            <div className="flex gap-2 justify-center mb-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${activeDotIndex === i ? "bg-[#A95D06] scale-125" : "bg-slate-200"
                    }`}
                />
              ))}
            </div>

            {/* Checked Attributes */}
            <div className="flex justify-center items-center gap-4 py-2.5 px-4 bg-[#F4F7FB] rounded-2xl border border-slate-100 shadow-sm mb-8 w-full max-w-sm">
              <div className="flex items-center gap-1.5 text-slate-700 text-[10px] font-bold">
                <span className="w-3.5 h-3.5 rounded-full bg-[#152E4B] flex items-center justify-center text-white text-[9px]">✓</span>
                Verified
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 text-[10px] font-bold">
                <span className="w-3.5 h-3.5 rounded-full bg-[#152E4B] flex items-center justify-center text-white text-[9px]">✓</span>
                Trusted
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 text-[10px] font-bold">
                <span className="w-3.5 h-3.5 rounded-full bg-[#152E4B] flex items-center justify-center text-white text-[9px]">✓</span>
                Fast Response
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleCancelRequest}
              className="w-full max-w-sm py-4 rounded-2xl bg-red-50 hover:bg-red-100 text-[#DC3545] font-bold text-sm transition active:scale-95 border border-red-100/50"
            >
              Cancel Request
            </button>
          </div>

        </div>
      );
    };

    export default SearchingProviders;
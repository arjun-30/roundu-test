import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

import { useApp, ProviderQuote } from "@/context/AppContext";
import { getAbsoluteIsoTimestamp } from "@/lib/utils";
import { socket } from "@/lib/socket";
import { createBooking } from "@/lib/api";
import { useCurrentLocation } from "@/hooks/useLocation";
import { getServiceById } from "@/data/mockData";

/**
 * SEARCHING PROVIDERS — Radar map + live quote display
 * Image 1: Grid/radar map while searching
 * When quotes arrive: quote card appears at the bottom (same page)
 */

interface CachedSearchState {
    serviceId: string;
    broadcastId: string;
    selectedDate?: string | null;
    selectedTime?: string | null;
}

const getCachedSearchState = (
    serviceId: string | undefined
): CachedSearchState | null => {
    try {
        const cached = sessionStorage.getItem("searching_providers_state");
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.serviceId === serviceId) return parsed;
        }
    } catch (e) {
        console.error("Failed to parse cached search state", e);
    }
    return null;
};

const SearchingProviders = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const cachedState = getCachedSearchState(serviceId);

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
        selectedDate: contextDate,
        selectedTime: contextTime,
    } = useApp();

    const selectedDate = location.state?.selectedDate || contextDate;
    const selectedTime = location.state?.selectedTime || contextTime;

    const [error, setError] = useState("");
    const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);
    const [selectedQuote, setSelectedQuote] = useState<ProviderQuote | null>(null);
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const [pulseScale, setPulseScale] = useState(1);
    const [providerDots, setProviderDots] = useState<{ x: number; y: number; id: string }[]>([]);

    const isRestoredRef = useRef(!!cachedState);
    const hasTriggered = useRef(!!cachedState);

    const [broadcastId] = useState(
        () => cachedState?.broadcastId || `bc-${user?.id || "anon"}-${Date.now()}`
    );

    // Timer
    const [searchStartTime] = useState<number>(() => {
        if (cachedState) {
            const stored =
                sessionStorage.getItem("search_start_time") ||
                localStorage.getItem("search_start_time");
            if (stored) return Number(stored);
        }
        const now = Date.now();
        sessionStorage.setItem("search_start_time", String(now));
        localStorage.setItem("search_start_time", String(now));
        return now;
    });
    const [remainingSeconds, setRemainingSeconds] = useState(300);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - searchStartTime) / 1000);
            const secs = Math.max(300 - elapsed, 0);
            setRemainingSeconds(secs);
            if (secs <= 0 && !hasTimedOut && receivedQuotes.length === 0) {
                setHasTimedOut(true);
                setShowTimeoutModal(true);
            }
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [searchStartTime, hasTimedOut, receivedQuotes.length]);

    // Radar pulse animation
    useEffect(() => {
        let growing = true;
        const interval = setInterval(() => {
            setPulseScale((prev) => {
                if (prev >= 1.08) growing = false;
                if (prev <= 1.0) growing = true;
                return growing ? prev + 0.004 : prev - 0.004;
            });
        }, 30);
        return () => clearInterval(interval);
    }, []);

    // Provider dots on the radar
    useEffect(() => {
        const ids = Object.keys(nearbyProviders);
        const cx = 190, cy = 165, maxR = 140;
        const dots = ids.slice(0, 6).map((id, i) => {
            const angle = (i / Math.max(ids.length, 1)) * 2 * Math.PI;
            const r = 50 + Math.random() * (maxR - 50);
            return {
                id,
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle),
            };
        });
        setProviderDots(dots);
    }, [nearbyProviders]);

    // Selected quote: always default to first
    useEffect(() => {
        if (receivedQuotes.length > 0 && !selectedQuote) {
            setSelectedQuote(receivedQuotes[0]);
        }
        if (receivedQuotes.length === 0) {
            setSelectedQuote(null);
        }
    }, [receivedQuotes, selectedQuote]);

    // ── AUTO-REDIRECT: as soon as ANY quote arrives, go to the provider selection page ──
    useEffect(() => {
        if (receivedQuotes.length > 0 && serviceId) {
            navigate(`/select-provider/${serviceId}`, { replace: true });
        }
    }, [receivedQuotes.length, serviceId, navigate]);

    // GPS
    const coordsRef = useRef<{ lat: number; lng: number } | null>(currentLocation);
    const handleLocationUpdate = useCallback(
        (lat: number, lng: number) => {
            coordsRef.current = { lat, lng };
            dispatch({ type: "SET_CURRENT_LOCATION", lat, lng });
        },
        [dispatch]
    );
    useCurrentLocation(handleLocationUpdate);

    // Cancel
    const handleCancelRequest = () => {
        sessionStorage.removeItem("search_start_time");
        localStorage.removeItem("search_start_time");
        sessionStorage.removeItem("searching_providers_state");
        sessionStorage.removeItem("searching_providers_quotes");
        dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
        navigate(-1);
    };

    // Cache state
    useEffect(() => {
        if (!serviceId) return;
        const stateToCache: CachedSearchState = { serviceId, broadcastId };
        sessionStorage.setItem("searching_providers_state", JSON.stringify(stateToCache));
    }, [serviceId, broadcastId]);

    // Cache quotes
    useEffect(() => {
        sessionStorage.setItem("searching_providers_quotes", JSON.stringify(receivedQuotes));
    }, [receivedQuotes]);

    // BROADCAST
    useEffect(() => {
        if (isRestoredRef.current) {
            try {
                const cachedQuotes = sessionStorage.getItem("searching_providers_quotes");
                if (cachedQuotes) {
                    const parsed = JSON.parse(cachedQuotes);
                    parsed.forEach((q: any) => {
                        dispatch({ type: "ADD_RECEIVED_QUOTE", quote: q });
                    });
                }
            } catch (e) {
                console.error("Failed to restore quotes", e);
            }
        } else {
            dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
            sessionStorage.removeItem("search_start_time");
            localStorage.removeItem("search_start_time");
            const freshNow = Date.now();
            sessionStorage.setItem("searching_providers_state", JSON.stringify({
                serviceId,
                broadcastId,
                selectedDate,
                selectedTime
            }));
            sessionStorage.setItem("search_start_time", String(freshNow));
            localStorage.setItem("search_start_time", String(freshNow));
        }

        const buildPayload = () => {
            const finalDate = selectedDate || cachedState?.selectedDate || new Date().toISOString().slice(0, 10);
            const finalTime = selectedTime || cachedState?.selectedTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            
            return {
                broadcastId,
                customerId: user.id,
                customerName: user.name,
                serviceId: serviceId || "electrician",
                address: user.address || "Current Location",
                lat: coordsRef.current?.lat ?? null,
                lng: coordsRef.current?.lng ?? null,
                date: finalDate,
                time: finalTime,
                notes: bookingNotes || "Quick fix request from customer",
                voiceNoteUrl: bookingVoiceNoteUrl,
                voiceNote: bookingVoiceNote,
                images: bookingImages || [],
                jobType: (selectedDate || cachedState?.selectedDate) ? "scheduled" : "quick_fix",
            };
        };

        const doEmit = () => {
            if (socket.connected) {
                socket.emit("broadcast_job", buildPayload());
                if (!hasTriggered.current) {
                    dispatch({ type: "ADD_NOTIFICATION", text: "Searching for nearby providers..." });
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
    }, [serviceId, user, dispatch, bookingNotes, bookingVoiceNoteUrl, bookingVoiceNote, selectedDate, selectedTime]);

    // ACCEPT QUOTE
    const handleAcceptQuote = async (quote: ProviderQuote) => {
        if (acceptingQuoteId) return;
        try {
            setError("");
            setAcceptingQuoteId(quote.providerId);
            const actualSelectedDate = selectedDate || cachedState?.selectedDate;
            const actualSelectedTime = selectedTime || cachedState?.selectedTime;

            const finalScheduledAt = actualSelectedDate
                ? getAbsoluteIsoTimestamp(
                    actualSelectedDate,
                    actualSelectedTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  )
                : new Date().toISOString();

            const finalJobType = actualSelectedDate ? "scheduled" : "quick_fix";

            const bookingData = {
                broadcast_id: quote.broadcastId,
                customer_id: String(user?.id || ""),
                provider_id: String(quote.providerId || ""),
                service_id: String(serviceId || ""),
                status: "assigned",
                scheduled_at: finalScheduledAt,
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
                jobType: finalJobType,
            };

            const res = await createBooking(bookingData);

            if (res?.success && res?.data?.id) {
                socket.emit("accept_quote", {
                    broadcastId: quote.broadcastId,
                    acceptedProviderId: quote.providerId,
                    bookingId: res.data.id,
                    customerName: user?.name || "Customer",
                    customerPhone: user?.phone || "1234567890",
                    address:
                        user?.address ||
                        (currentLocation
                            ? `${currentLocation?.lat},${currentLocation?.lng}`
                            : "Customer Location"),
                    serviceId: serviceId,
                    price: quote.price,
                    lat: currentLocation?.lat || null,
                    lng: currentLocation?.lng || null,
                    scheduled_at: finalScheduledAt,
                    jobType: finalJobType,
                });

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
    const foundCount = Math.max(Object.keys(nearbyProviders).length, receivedQuotes.length);
    const hasQuotes = receivedQuotes.length > 0;
    const timeLabel = `${Math.floor(remainingSeconds / 60).toString().padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

    return (
        <div
            className="min-h-screen flex flex-col relative font-sans"
            style={{ background: "#F2F4F8" }}
        >
            {/* TIMEOUT MODAL */}
            {showTimeoutModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 mx-4">
                        <h2 className="text-xl font-bold mb-3 text-[#152E4B]">No Providers Available</h2>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            We couldn't find an available provider near your location right now.
                            Please try again or schedule for another time.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem("search_start_time");
                                    localStorage.removeItem("search_start_time");
                                    setHasTimedOut(false);
                                    setShowTimeoutModal(false);
                                    const now = Date.now();
                                    sessionStorage.setItem("search_start_time", String(now));
                                    localStorage.setItem("search_start_time", String(now));
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

            {/* ── RADAR MAP AREA ── */}
            <div className="relative flex-1 overflow-hidden" style={{ minHeight: hasQuotes ? "340px" : "55vh" }}>

                {/* Back button */}
                <button
                    onClick={handleCancelRequest}
                    className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 transition"
                >
                    <ArrowLeft size={20} className="text-[#152E4B]" />
                </button>

                {/* LIVE SEARCH badge */}
                <div className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                            Live Search
                        </p>
                        <p className="text-[12px] font-bold text-[#152E4B] leading-tight">
                            {foundCount} provider{foundCount !== 1 ? "s" : ""} found
                        </p>
                    </div>
                </div>

                {/* SVG Radar/Grid Map */}
                <svg
                    viewBox="0 0 380 340"
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="xMidYMid slice"
                >
                    {/* Background */}
                    <rect width="380" height="340" fill="#EEF1F7" />

                    {/* Grid lines – horizontal */}
                    {[40, 80, 120, 160, 200, 240, 280, 320].map((y) => (
                        <line key={`h${y}`} x1="0" y1={y} x2="380" y2={y} stroke="#D8DCE8" strokeWidth="1" />
                    ))}
                    {/* Grid lines – vertical */}
                    {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x) => (
                        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="340" stroke="#D8DCE8" strokeWidth="1" />
                    ))}

                    {/* Main roads */}
                    <line x1="190" y1="0" x2="190" y2="340" stroke="#C8CDD8" strokeWidth="2.5" />
                    <line x1="0" y1="165" x2="380" y2="165" stroke="#C8CDD8" strokeWidth="2.5" />

                    {/* Concentric radar circles */}
                    {[55, 95, 135].map((r, i) => (
                        <circle
                            key={`circle-${i}`}
                            cx="190"
                            cy="165"
                            r={r}
                            fill="none"
                            stroke="#B8BDC8"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Pulsing outer ring */}
                    <circle
                        cx="190"
                        cy="165"
                        r={130 * pulseScale}
                        fill="none"
                        stroke="#A0A8BA"
                        strokeWidth="0.8"
                        opacity={0.6}
                    />

                    {/* Provider dots */}
                    {providerDots.map((dot) => (
                        <g key={dot.id}>
                            <circle cx={dot.x} cy={dot.y} r="10" fill="rgba(169,93,6,0.15)" />
                            <circle cx={dot.x} cy={dot.y} r="5" fill="#A95D06" />
                        </g>
                    ))}

                    {/* Center customer pin */}
                    <circle cx="190" cy="165" r="14" fill="rgba(21,46,75,0.12)" />
                    <circle cx="190" cy="165" r="8" fill="#152E4B" />
                    <circle cx="190" cy="165" r="3" fill="white" />
                </svg>
            </div>

            {/* ── BOTTOM PANEL ── */}
            <div
                className="bg-white rounded-t-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.08)] z-10"
                style={{ marginTop: "-24px" }}
            >
                <div className="px-6 pt-6 pb-3">
                    {!hasQuotes ? (
                        /* Searching state (Image 1 bottom) */
                        <>
                            <h2 className="text-[22px] font-extrabold text-[#152E4B] text-center leading-tight">
                                Providers available<br />nearby
                            </h2>
                            <p className="text-center text-[13px] text-slate-400 font-medium mt-1">
                                Time Remaining
                            </p>
                            <p className="text-center text-[28px] font-extrabold text-[#A95D06] tracking-wider mt-0.5">
                                {timeLabel}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-center text-[13px] text-slate-400 font-medium">
                                Time Remaining&nbsp;
                                <span className="text-[#A95D06] font-bold">{timeLabel}</span>
                            </p>
                        </>
                    )}
                </div>

                {/* Quote cards horizontal scroll */}
                {hasQuotes && (
                    <div className="overflow-x-auto px-5 pb-3 scrollbar-hide">
                        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                            {receivedQuotes.map((q) => (
                                <div
                                    key={q.providerId}
                                    onClick={() => setSelectedQuote(q)}
                                    className={`w-[290px] bg-white rounded-2xl p-4 border shadow-sm cursor-pointer transition-all shrink-0 ${selectedQuote?.providerId === q.providerId
                                        ? "border-[#152E4B] shadow-md"
                                        : "border-slate-100 hover:border-slate-300"
                                        }`}
                                >
                                    {/* Provider row */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#152E4B] text-sm overflow-hidden shrink-0">
                                                {q.providerAvatar && q.providerAvatar.length > 2 ? (
                                                    <img src={q.providerAvatar} alt={q.providerName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="lowercase">{q.providerAvatar || q.providerName?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[14px] text-[#152E4B]">{q.providerName}</p>
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <Star size={10} className="fill-[#A95D06] text-[#A95D06]" />
                                                    <span>{Number(q.rating || 0).toFixed(1)}</span>
                                                    <span>·</span>
                                                    <span>{q.distanceKm} km away</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[18px] font-black text-[#152E4B]">₹{q.price}</p>
                                            <p className="text-[11px] font-bold text-green-600">ETA {q.etaMin} mins</p>
                                        </div>
                                    </div>

                                    {/* Accept button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcceptQuote(q);
                                        }}
                                        disabled={!!acceptingQuoteId}
                                        className="w-full py-3 rounded-2xl font-bold text-[14px] bg-[#152E4B] text-white hover:bg-[#152E4B]/90 active:scale-95 transition disabled:opacity-60 disabled:cursor-wait"
                                    >
                                        {acceptingQuoteId === q.providerId ? "Confirming..." : "Accept Quote"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-red-500 text-xs text-center font-semibold px-5 pb-2">{error}</p>
                )}

                {/* Cancel Request */}
                <div className="px-5 pb-6 pt-2">
                    <button
                        onClick={handleCancelRequest}
                        className="w-full py-3.5 rounded-2xl text-[#A95D06] font-bold text-[14px] border-0 bg-transparent hover:bg-[#A95D06]/5 active:scale-95 transition"
                    >
                        Cancel Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchingProviders;

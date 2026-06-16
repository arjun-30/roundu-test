import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useApp, ProviderQuote } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";

/**
 * ProviderQuotes – Displays quotes after a provider is found.
 * Includes filter tabs (All, Best Price, Top Rated) and preserves the countdown timer.
 */
const ProviderQuotes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId } = useParams();

  // Preserve timer start time
  const [searchStartTime, setSearchStartTime] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);

  // Filter state (default "all")
  const [activeFilter, setActiveFilter] = useState<'all' | 'price' | 'rating'>('all');

  // Initialise timer & filter from navigation state if present
  useEffect(() => {
    if (location.state) {
      const stateAny = location.state as any;
      if (stateAny.startTime) setSearchStartTime(stateAny.startTime);
      if (stateAny.filter) setActiveFilter(stateAny.filter);
    }
    // Fallback to stored start time
    if (!searchStartTime) {
      const stored = sessionStorage.getItem('search_start_time') || localStorage.getItem('search_start_time');
      if (stored) setSearchStartTime(Number(stored));
    }
  }, [location.state]);

  // Countdown logic – runs once timer is known
  useEffect(() => {
    if (!searchStartTime) return;
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

  const { receivedQuotes, user, dispatch } = useApp();
  const [selectedQuote, setSelectedQuote] = useState<ProviderQuote | null>(null);

  const sortedQuotes = useMemo(() => {
    const copy = [...receivedQuotes];
    if (copy.length === 0) return [];

    if (activeFilter === 'price') {
      copy.sort((a, b) => Number(a.price) - Number(b.price));
      return [copy[0]];
    }
    if (activeFilter === 'rating') {
      copy.sort((a, b) => Number(b.rating) - Number(a.rating));
      return [copy[0]];
    }
    return copy;
  }, [receivedQuotes, activeFilter]);

  useEffect(() => {
    if (sortedQuotes.length > 0) {
      setSelectedQuote(sortedQuotes[0]);
    } else {
      setSelectedQuote(null);
    }
  }, [sortedQuotes]);

  const service = getServiceById(serviceId || "");

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

  const handleSelect = (quote: ProviderQuote) => {
    setSelectedQuote(quote);
  };

  // Placeholder accept logic – just navigate back for now
  const handleAccept = () => {
    if (selectedQuote) {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans overflow-hidden">
      {/* Header with back button and timer */}
      <div className="flex items-center px-5 py-4 bg-white shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#152E4B]/10 text-[#152E4B] hover:bg-slate-50 transition active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-4 text-xl font-extrabold text-[#152E4B]">Provider Quotes</h1>
        <div className="ml-auto text-sm text-[#152E4B]">
          {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-5 py-3 bg-white border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {(['all', 'price', 'rating'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-5 py-2 rounded-full font-bold text-xs capitalize transition active:scale-95 border ${activeFilter === f
              ? "bg-[#A95D06] text-white border-transparent shadow-sm shadow-[#A95D06]/20"
              : "bg-transparent text-[#152E4B] border-[#152E4B]/20 hover:bg-[#152E4B]/5"}`}
          >
            {f === 'all' ? 'All' : f === 'price' ? 'Best Price' : 'Top Rated'}
          </button>
        ))}
      </div>

      {/* Quote list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {sortedQuotes.length === 0 ? (
          <p className="text-center text-slate-500">No quotes available yet.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            {sortedQuotes.map((q) => (
              <div
                key={q.providerId}
                onClick={() => handleSelect(q)}
                className={`w-[270px] shrink-0 bg-white rounded-3xl p-5 border flex flex-col justify-between snap-start cursor-pointer transition-all duration-300 ${selectedQuote?.providerId === q.providerId
                  ? "border-2 border-[#A95D06] shadow-lg shadow-[#A95D06]/10 scale-[1.01]"
                  : "border-slate-100 shadow-sm hover:shadow-md"}`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center font-bold text-white bg-[#152E4B] overflow-hidden">
                    {q.providerAvatar && q.providerAvatar.length > 2 ? (
                      <img src={q.providerAvatar} alt={q.providerName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{q.providerAvatar || q.providerName?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate text-[15px]">{q.providerName}</h3>
                    <div className="flex items-center gap-1 text-[12px] text-[#A95D06] font-semibold mt-0.5">
                      <Star size={12} className="fill-[#A95D06]" />
                      <span>{q.rating}</span>
                      <span className="text-slate-400 font-normal">(Verified)</span>
                    </div>
                  </div>
                </div>
                {/* Details */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none mb-1">Price</span>
                    <span className="text-[17px] font-black text-[#152E4B]">₹{q.price}/hr</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none mb-1">Distance & ETA</span>
                    <span className="text-[12px] font-bold text-slate-700">{q.distanceKm} km · <span className="text-[#A95D06]">{q.etaMin} mins</span></span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelect(q); }}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs transition active:scale-95 ${selectedQuote?.providerId === q.providerId
                    ? "bg-[#A95D06] text-white shadow-sm shadow-[#A95D06]/20"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"}`}
                >
                  {selectedQuote?.providerId === q.providerId ? "Selected" : "Select Provider"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-300 transition"
        >
          Back
        </button>
        <button
          disabled={!selectedQuote}
          onClick={handleAccept}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition active:scale-95 ${selectedQuote ? "bg-[#A95D06] text-white hover:bg-[#A95D06]/90" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
        >
          Accept Quote
        </button>
      </div>
    </div>
  );
};

export default ProviderQuotes;

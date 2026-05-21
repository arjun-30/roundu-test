import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { timeSlots } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

const BookingTime = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedDate, dispatch } = useApp();
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && time) {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [time]);

  if (!selectedDate) {
    navigate("/booking/date", { replace: true });
    return null;
  }

  const handleNext = () => {
    if (!time) return;
    dispatch({ type: "SELECT_TIME", time });
    
    if (location.state?.serviceId) {
      sessionStorage.removeItem("searching_providers_state");
      sessionStorage.removeItem("searching_providers_scroll");
      navigate(`/searching-providers/${location.state.serviceId}`);
    } else {
      navigate("/booking/notes");
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Step 2 of 3</p>
          <h1 className="text-lg font-bold text-foreground">Select Time</h1>
        </div>
      </div>

      <div className="flex-1 px-5 space-y-5">
        <div className="bg-input border border-border rounded-2xl p-3 flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span className="text-xs text-foreground">Booking for <strong>{selectedDate}</strong></span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {timeSlots.map((t) => (
            <button
              key={t}
              onClick={() => setTime(t)}
              className={`py-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                time === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:border-primary/30"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border">
        <button
          onClick={handleNext}
          disabled={!time}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default BookingTime;

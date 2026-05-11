import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";

const BookingDate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProvider, dispatch } = useApp();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selected) {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected]);

  if (!selectedProvider && !location.state?.serviceId) {
    navigate("/home", { replace: true });
    return null;
  }

  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleNext = () => {
    if (!selected) return;
    dispatch({ type: "SELECT_DATE", date: selected.toISOString().slice(0, 10) });
    navigate("/booking/time", { state: location.state });
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Step 1 of 3</p>
          <h1 className="text-lg font-bold text-foreground">Select Date</h1>
        </div>
      </div>

      <div className="flex-1 px-5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonth(new Date(year, m - 1, 1))} className="w-8 h-8 rounded-lg bg-input flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-bold text-foreground text-sm">
              {month.toLocaleString("en", { month: "long", year: "numeric" })}
            </h3>
            <button onClick={() => setMonth(new Date(year, m + 1, 1))} className="w-8 h-8 rounded-lg bg-input flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const date = new Date(year, m, d);
              const isPast = date < today;
              const isSelected = selected && date.toDateString() === selected.toDateString();
              const isToday = date.toDateString() === today.toDateString();
              return (
                <button
                  key={i}
                  disabled={isPast}
                  onClick={() => setSelected(date)}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isPast
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : isToday
                      ? "bg-accent/20 text-accent-foreground"
                      : "text-foreground hover:bg-input"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border">
        <button
          onClick={handleNext}
          disabled={!selected}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default BookingDate;

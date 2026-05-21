import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import BookingCard from "@/components/BookingCard";
import EmptyState from "@/components/EmptyState";

const tabs = ["Upcoming", "Active", "Completed"];

const Bookings = () => {
  const navigate = useNavigate();
  const { bookings } = useApp();
  const [tab, setTab] = useState(0);

  const filtered = bookings.filter((b) => {
    if (tab === 0) return ["pending", "accepted", "assigned"].includes(b.status);
    if (tab === 1) return ["on_the_way", "arrived", "in_progress"].includes(b.status);
    return ["completed", "paid"].includes(b.status);
  });

  return (
    <div className="min-h-full flex flex-col bg-background pb-24">
      <div className="px-5 pt-6 pb-2 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-foreground mb-4">My Bookings</h1>
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                i === tab ? "bg-primary text-primary-foreground" : "bg-input border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No bookings yet"
            description="Your bookings will appear here once you book a service."
            action={
              <button
                onClick={() => navigate("/services")}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
              >
                Browse Services
              </button>
            }
          />
        ) : (
          filtered.map((b) => (
            <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Bookings;

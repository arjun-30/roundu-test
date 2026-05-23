import { Home, CalendarCheck, User, Crown, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { id: "home", label: "Home", icon: Home, path: "/home" },
  { id: "bookings", label: "Bookings", icon: CalendarCheck, path: "/bookings" },
  { id: "subscriptions", label: "Subscribe", icon: Crown, path: "/subscriptions" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-card border-t border-border px-2 pt-2 pb-2 z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.id === "bookings" && pathname.startsWith("/bookings"));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{item.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;

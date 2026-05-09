import { useNavigate } from "react-router-dom";
import { ChevronRight, Edit3, History, LogOut, Bell, HelpCircle, Tag, Settings, Gift } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";

const Profile = () => {
  const navigate = useNavigate();
  const { user, dispatch } = useApp();

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm sticky top-0 z-10 flex items-center">
        <h1 className="text-xl font-extrabold text-foreground">Profile</h1>
      </div>

      <div className="px-5 pt-5 flex-1 overflow-y-auto space-y-4">
        
        {/* Profile Card */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4 relative">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-extrabold shadow-sm">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-extrabold text-foreground">{user.name}</h2>
            <p className="text-[13px] text-muted-foreground font-medium mt-0.5">+91 {user.phone || "—"}</p>
            <p className="text-[13px] text-muted-foreground font-medium truncate mt-0.5">{user.email || "hello@roundu.in"}</p>
          </div>
          <button
            onClick={() => navigate("/profile/edit")}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center active:scale-95 transition-all text-secondary hover:bg-blue-100"
          >
            <Edit3 size={16} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="bg-white border border-border rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <Item icon={History} label="My Bookings" onClick={() => navigate("/bookings")} />
          <Item icon={Bell} label="Notifications" onClick={() => navigate("/notifications")} />
          <Item icon={Tag} label="Offers & Promos" onClick={() => navigate("/offers")} />
          <Item icon={Gift} label="Refer & Earn" onClick={() => navigate("/refer-earn")} />
          <Item icon={Settings} label="Settings" onClick={() => navigate("/settings")} />
          <Item icon={HelpCircle} label="Help & Support" onClick={() => navigate("/support")} last />
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-white border border-red-100 shadow-sm text-red-500 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-50 mt-2"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

const Item = ({ icon: Icon, label, onClick, last }: any) => (
  <button onClick={onClick} className={`w-full px-5 py-4 flex items-center gap-4 active:bg-background transition-colors ${last ? "" : "border-b border-gray-50"}`}>
    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
      <Icon size={18} className="text-primary" />
    </div>
    <span className="flex-1 text-left text-[14.5px] font-bold text-gray-800">{label}</span>
    <ChevronRight size={18} className="text-gray-300" />
  </button>
);

export default Profile;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Briefcase, Wallet, LogOut, ChevronRight, User, SwitchCamera, MapPin, Clock, Image as ImageIcon, FileText, Settings } from "lucide-react";
import { useApp } from "@/context/AppContext";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import axios from "axios";

const ProviderProfile = () => {
  const navigate = useNavigate();
  const { user, dispatch, completedJobs, providerStats, isOnline } = useApp();

  const [isEditingRadius, setIsEditingRadius] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(15); // Default fallback
  const [notification, setNotification] = useState("");
  const [error, setError] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`/api/v1/providers/dashboard?userId=${user.id}`);
        if (response.data.success && response.data.data.provider) {
          setServiceRadius(response.data.data.provider.service_radius || 15);
        }
      } catch (error) {
        console.error("Failed to fetch provider profile:", error);
      }
    };
    if (user.id) {
      fetchProfile();
    }
  }, [user.id]);

  const handleUpdateRadius = async (radius: number) => {
    try {
      const response = await axios.post('/api/v1/providers/update-radius', {
        userId: user.id,
        serviceRadius: radius
      });
      
      if (response.data.success) {
        setServiceRadius(radius);
        setIsEditingRadius(false);
        showNotification("Service radius updated");
      }
    } catch (error) {
      console.error("Failed to update radius:", error);
      showError("Failed to update radius");
    }
  };

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login", { replace: true });
  };

  const switchToCustomer = () => {
    dispatch({ type: "SET_ROLE", role: "customer" });
    navigate("/home", { replace: true });
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-8">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Provider Profile</h1>
      </div>

      <div className="px-5 flex-1 space-y-4">
        {notification && <div className="bg-secondary/10 text-blue-700 p-3 rounded-xl text-sm font-semibold">{notification}</div>}
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary mx-auto flex items-center justify-center text-primary-foreground text-xl font-extrabold relative">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
          </div>
          <h2 className="text-base font-bold text-foreground mt-3">{user.name}</h2>
          <p className="text-xs text-muted-foreground">+91 {user.phone || "—"}</p>

          <div className="grid grid-cols-3 divide-x divide-border mt-5 border-t border-border pt-4">
            <div>
              <p className="text-lg font-extrabold text-foreground flex items-center justify-center gap-1">
                {providerStats.rating} <Star size={14} className="text-accent fill-accent" />
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Rating</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{completedJobs.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Jobs</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{providerStats.responseRate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Response</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <Item icon={User} label="Edit Profile" onClick={() => navigate("/profile/edit")} />
          <Item icon={ImageIcon} label="My Portfolio" onClick={() => navigate("/provider/portfolio")} />
          <Item icon={FileText} label="Documents & KYC" onClick={() => navigate("/provider/documents")} />
          <Item icon={Briefcase} label="My Jobs" onClick={() => navigate("/provider/jobs")} />
          <Item icon={Wallet} label="Earnings" onClick={() => navigate("/provider/earnings")} />
          <Item icon={Settings} label="Location Settings" onClick={() => navigate("/provider/gps-monitor")} last />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600"><Clock size={16} /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Working Hours</p>
                <p className="text-[10px] text-muted-foreground">9:00 AM - 6:00 PM</p>
              </div>
            </div>
            <button className="text-xs text-primary font-bold">Edit</button>
          </div>
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><MapPin size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Service Radius</p>
                  <p className="text-[10px] text-muted-foreground">Up to {serviceRadius} km</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingRadius(!isEditingRadius)} 
                className="text-xs text-primary font-bold"
              >
                {isEditingRadius ? "Cancel" : "Edit"}
              </button>
            </div>
            
            {isEditingRadius && (
              <div className="flex gap-2 mt-3 animate-fade-in">
                {[2, 5, 10, 15, 25, 50].map((rad) => (
                  <button
                    key={rad}
                    onClick={() => handleUpdateRadius(rad)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                      serviceRadius === rad 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground border border-border hover:bg-card'
                    }`}
                  >
                    {rad} km
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={switchToCustomer}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-card"
        >
          <SwitchCamera size={18} /> Switch as Customer
        </button>

        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl bg-transparent text-muted-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>

      <ProviderBottomNav />
    </div>
  );
};

interface ItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  last?: boolean;
}

const Item = ({ icon: Icon, label, onClick, last }: ItemProps) => (
  <button onClick={onClick} className={`w-full px-4 py-3.5 flex items-center gap-3 active:bg-input transition-colors ${last ? "" : "border-b border-border"}`}>
    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
      <Icon size={16} className="text-primary" />
    </div>
    <span className="flex-1 text-left text-sm font-semibold text-foreground">{label}</span>
    <ChevronRight size={16} className="text-muted-foreground" />
  </button>
);

export default ProviderProfile;

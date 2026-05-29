import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Briefcase, Wallet, LogOut, ChevronRight, User, SwitchCamera, MapPin, Clock, Image as ImageIcon, FileText, Settings } from "lucide-react";
import { useApp } from "@/context/AppContext";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import { getMembershipBadgeLabel } from "@/lib/membership";
import axios from "axios";

const ProviderProfile = () => {
  const navigate = useNavigate();
  const { user, dispatch, completedJobs, providerStats, isOnline, providerRegistrationDraft, membership } = useApp();

  const [isEditingRadius, setIsEditingRadius] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(providerRegistrationDraft?.serviceRadius || 15);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [workingHours, setWorkingHours] = useState(providerRegistrationDraft?.workingHours || "9:00 AM - 6:00 PM");
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
          if (response.data.data.provider.working_hours) {
            setWorkingHours(response.data.data.provider.working_hours);
          }
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
    // Update local state immediately for responsiveness
    setServiceRadius(radius);
    dispatch({ type: "UPDATE_REGISTRATION_DRAFT", patch: { serviceRadius: radius } });
    setIsEditingRadius(false);
    showNotification("Service radius updated");
    try {
      await axios.post('/api/v1/providers/update-radius', {
        userId: user.id,
        serviceRadius: radius
      });
    } catch (error) {
      console.error("API failed to update radius, but local state updated");
    }
  };

  const handleUpdateHours = async (hours: string) => {
    setWorkingHours(hours);
    dispatch({ type: "UPDATE_REGISTRATION_DRAFT", patch: { workingHours: hours } });
    setIsEditingHours(false);
    showNotification("Working hours updated");
    try {
      await axios.post('/api/v1/providers/update-hours', {
        userId: user.id,
        workingHours: hours
      });
    } catch (error) {
      console.error("API failed to update working hours, but local state updated");
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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/provider");
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-3 pb-2 flex items-center gap-3 animate-fade-in">
        <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Provider Profile</h1>
      </div>

      <div className="px-5 flex-1 space-y-4">
        {notification && <div className="bg-secondary/10 text-blue-700 p-3 rounded-xl text-sm font-semibold">{notification}</div>}
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card text-center">
          <div className="w-20 h-20 rounded-2xl mx-auto relative bg-slate-100 border border-border">
            <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <img 
                  src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6"/><stop offset="100%" stop-color="%232563EB"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`} 
                  alt="Default Avatar" 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card z-10 ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
          </div>
          <h2 className="text-base font-bold text-foreground mt-3">{user.name}</h2>
          <p className="text-xs text-muted-foreground">+91 {user.phone || "—"}</p>
          <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
            <Star size={12} className="fill-current" />
            {getMembershipBadgeLabel(membership.planId)}
          </span>

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
          <Item icon={User} label="Edit Profile" onClick={() => navigate("/profile/edit", { state: { from: "profile" } })} />
          <Item icon={ImageIcon} label="My Portfolio" onClick={() => navigate("/provider/portfolio", { state: { from: "profile" } })} />
          <Item icon={FileText} label="Documents & KYC" onClick={() => navigate("/provider/documents", { state: { from: "profile" } })} />
          <Item icon={Briefcase} label="My Jobs" onClick={() => navigate("/provider/jobs", { state: { from: "profile" } })} />
          <Item icon={Star} label="Membership" onClick={() => navigate("/provider/membership", { state: { from: "profile" } })} />
          <Item icon={Wallet} label="Earnings" onClick={() => navigate("/provider/earnings", { state: { from: "profile" } })} />
          <Item icon={Settings} label="Location Settings" onClick={() => navigate("/provider/gps-monitor", { state: { from: "profile" } })} last />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600"><Clock size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Working Hours</p>
                  <p className="text-[10px] text-muted-foreground">{workingHours}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingHours(!isEditingHours)} 
                className="text-xs text-primary font-bold"
              >
                {isEditingHours ? "Cancel" : "Edit"}
              </button>
            </div>
            {isEditingHours && (
              <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
                {["9:00 AM - 6:00 PM", "8:00 AM - 8:00 PM", "24 Hours", "10:00 AM - 5:00 PM"].map((hrs) => (
                  <button
                    key={hrs}
                    onClick={() => handleUpdateHours(hrs)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                      workingHours === hrs 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground border border-border hover:bg-card'
                    }`}
                  >
                    {hrs}
                  </button>
                ))}
              </div>
            )}
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

import { ArrowLeft, Bell, CalendarCheck, Gift, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications } = useApp();

  const getIcon = (type: string) => {
    switch(type) {
      case "booking": return <CalendarCheck size={18} className="text-blue-500" />;
      case "offer": return <Gift size={18} className="text-amber-500" />;
      case "payment": return <CheckCircle2 size={18} className="text-green-500" />;
      default: return <Bell size={18} className="text-muted-foreground" />;
    }
  };
  const getIconBg = (type: string) => {
    switch(type) {
      case "booking": return "bg-secondary/10 border-blue-100";
      case "offer": return "bg-amber-50 border-amber-100";
      case "payment": return "bg-green-50 border-green-100";
      default: return "bg-background border-border";
    }
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all">
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-xl font-extrabold text-foreground">Notifications</h1>
        </div>
        <button className="text-[11px] font-extrabold text-secondary bg-secondary/10 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-wider">
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground font-medium">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p>No new notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="p-4 rounded-2xl border transition-all bg-white border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-blue-50">
              <div className="flex gap-3.5">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center border flex-shrink-0 ${getIconBg("default")}`}>
                  {getIcon("default")}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[15px] font-extrabold text-foreground">Alert</h3>
                    <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">{formatTime(n.ts)}</span>
                  </div>
                  <p className="text-[13px] leading-snug mt-0.5 text-gray-600 font-semibold">{n.text}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default Notifications;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";
import EmptyState from "@/components/EmptyState";
import { Wallet } from "lucide-react";
import axios from "axios";

const Earnings = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const [balance, setBalance] = useState(0);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const dashboardRes = await axios.get(`/api/v1/providers/dashboard?userId=${user.id}`);
        if (dashboardRes.data.success) {
          setBalance(dashboardRes.data.data.wallet?.balance || 0);
          
          const providerId = dashboardRes.data.data.provider.id;
          
          const bookingsRes = await axios.get(`/api/v1/bookings/provider/${providerId}`);
          if (bookingsRes.data.success) {
            const completed = bookingsRes.data.data.filter((b: any) => b.status === 'completed');
            setCompletedJobs(completed);
          }
        }
      } catch (error) {
        console.error("Failed to fetch earnings:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user.id) {
      fetchEarnings();
    }
  }, [user.id]);

  const total = completedJobs.reduce((s, j) => s + (j.price || 0), 0);
  const thisWeek = completedJobs.filter((j) => Date.now() - new Date(j.scheduled_at || j.date).getTime() < 7 * 86400000);
  const weekTotal = thisWeek.reduce((s, j) => s + (j.price || 0), 0);

  return (
    <div className="min-h-full flex flex-col bg-background pb-8">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Earnings</h1>
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-slate-900 rounded-[28px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors" />
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Available Balance</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-4xl font-extrabold text-white">₹{balance.toLocaleString('en-IN')}</p>
            <div className="mb-1.5 flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full">
              <TrendingUp size={12} /> +12%
            </div>
          </div>
          <button className="w-full mt-6 py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            Withdraw to Bank
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {["Today", "This Week", "This Month"].map((label) => (
            <button
              key={label}
              className={`px-5 py-2.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all ${
                label === "This Week" 
                  ? "bg-primary border-primary text-primary-foreground shadow-md" 
                  : "bg-white border-border text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Stat label="Jobs Done" value={String(completedJobs.length)} color="text-blue-600" />
          <Stat label="Earned" value={`₹${weekTotal}`} color="text-emerald-600" />
        </div>
      </div>


      <div className="px-5 mt-6 flex-1 overflow-y-auto">
        <h2 className="text-sm font-bold text-foreground mb-3">Completed Jobs</h2>
        {completedJobs.length === 0 ? (
          <EmptyState icon={Wallet} title="No earnings yet" description="Completed jobs will appear here." />
        ) : (
          <div className="space-y-2">
            {completedJobs.map((j) => {
              const s = getServiceById(j.serviceId);
              return (
                <div key={j.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-card">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    {s && <s.icon size={16} className="text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{j.customerName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} /> {j.date}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-success">+₹{j.price}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) => (
  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{label}</p>
    <p className={`text-xl font-extrabold mt-0.5 ${color}`}>{value}</p>
  </div>
);


export default Earnings;

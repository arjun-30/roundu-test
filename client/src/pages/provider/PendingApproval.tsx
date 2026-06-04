import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, MoreHorizontal, MessageCircleQuestion, BellRing } from 'lucide-react';
import { registerProvider } from '@/lib/api';
import { useApp } from '@/context/AppContext';

const PendingApproval = () => {
  const navigate = useNavigate();
  const { providerRegistrationDraft, user, dispatch } = useApp();
  const { kyc } = providerRegistrationDraft;

  // We'll add a secret simulation feature for demo purposes: 
  // clicking the clock 5 times automatically "approves" the application.
  const [clicks, setClicks] = useState(0);
  const [notification, setNotification] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clicks >= 5) {
      setNotification("Application Approved (Simulation)!");
      setTimeout(() => navigate('/provider'), 1000);
    }
  }, [clicks, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative mb-8 mt-12 group">
        <div className="w-28 h-28 bg-accent/10 rounded-[36px] flex items-center justify-center animate-bounce-subtle">
          <Clock size={56} className="text-accent" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <MoreHorizontal size={20} className="text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-4 max-w-[320px]">
        {notification && <div className="bg-secondary/10 text-blue-700 p-3 rounded-xl text-sm font-semibold mb-2">{notification}</div>}
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold mb-2">{error}</div>}
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight animate-fade-in">
          Verification <br /><span className="text-accent">In Progress</span>
        </h1>
        
        <p className="text-sm text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
          We're currently reviewing your documents. Our team usually approves profiles within <span className="text-foreground font-bold">24 hours</span>.
        </p>
      </div>

      {/* Checklist */}
      <div className="w-full max-w-[320px] bg-card border border-border rounded-[32px] p-6 my-10 animate-fade-in shadow-xl shadow-accent/5 text-left relative z-10" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-5 px-1">Application Status</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-foreground/80">Identity Verified</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-foreground/80">Bank Account Linked</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-foreground/80">Portfolio Review</span>
          </div>
          
          <div className="h-px bg-border my-2 mx-1" />
          
          <div className="flex items-center gap-4 group">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-r-transparent animate-spin flex-shrink-0" />
            <span className="text-sm font-extrabold text-accent">Final Admin Approval</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-[320px] gap-3 mb-8 relative z-10">
        <button 
          disabled={isLoading}
          onClick={async () => {
            if (!user?.id) {
              setError("User not authenticated");
              setTimeout(() => setError(""), 3000);
              return;
            }
            setIsLoading(true);
            try {
              const res = await registerProvider({
                userId: user.id,
                bio: providerRegistrationDraft.bio,
                experienceYears: providerRegistrationDraft.experienceYears,
                workingHours: providerRegistrationDraft.workingHours,
                serviceRadius: providerRegistrationDraft.serviceRadius,
                serviceIds: providerRegistrationDraft.serviceIds
              });
              if (!res.success) throw new Error(res.message || "Registration failed");
              dispatch({ type: "SET_ROLE", role: "provider" });
              dispatch({ type: "UPDATE_USER", user: { role: "provider", accountType: "provider" } });
              setNotification("Registration successful! Redirecting to Dashboard...");
              setTimeout(() => navigate('/provider'), 1000);
            } catch (err: any) {
              setError(err.message || 'Connection failed');
              setTimeout(() => setError(""), 3000);
            } finally {
              setIsLoading(false);
            }
          }}
          className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-accent/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <CheckCircle2 size={20} strokeWidth={2.5} />
          {isLoading ? "Submitting..." : "Complete Registration"}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide flex items-center gap-2 uppercase">
        <Clock size={12} /> Pending since 2 hours ago
      </p>
    </div>
  );
};

export default PendingApproval;

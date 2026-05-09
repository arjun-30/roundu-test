import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, Wallet, User, MapPin, Calendar, Clock, Check, X, 
  Power, Star, TrendingUp, AlertTriangle, Lightbulb, 
  ChevronRight, Inbox, Briefcase, FileText, Image as ImageIcon, Video, Play, Mic, Eye,
  ClipboardCheck, Images, Wrench, LogOut
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById, ProviderRequest } from "@/data/mockData";
import EmptyState from "@/components/EmptyState";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import IncomingRequestPopup from "@/components/IncomingRequestPopup";
import PIPModal from "@/components/PIPModal";
import { socket } from "@/lib/socket";

const Dashboard = () => {
  const navigate = useNavigate();
  const { providerRequests, completedJobs, dispatch, user, isOnline, providerStats, liveBroadcasts } = useApp();
  const [showWarning, setShowWarning] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ProviderRequest | null>(null);
  const [simulatedRequest, setSimulatedRequest] = useState<ProviderRequest | null>(null);
  
  const [quotingBroadcast, setQuotingBroadcast] = useState<any | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteEta, setQuoteEta] = useState("15");
  
  const pending = providerRequests.filter((r) => r.status === "pending");
  const accepted = providerRequests.filter((r) => r.status === "accepted" || r.status === "assigned" || r.status === "in_progress" || r.status === "on_the_way" || r.status === "arrived");
  const earnings = completedJobs.reduce((s, j) => s + j.price, 0);

  const toggleOnline = () => {
    dispatch({ type: "SET_ONLINE", value: !isOnline });
  };

  const [showPip, setShowPip] = useState(false);

  const isCritical = providerStats.rating < 4.0 || providerStats.responseRate < 50;

  const [activeDirectRequest, setActiveDirectRequest] = useState<any | null>(null);

  // Alert provider when a new direct request arrives
  useEffect(() => {
    const handleNewRequest = (request: any) => {
      // Show the popup at the top
      setActiveDirectRequest(request);
      // Add to global state so it appears in the list without refresh!
      dispatch({ type: "ADD_PROVIDER_REQUEST", request });
    };
    socket.on("incoming_request", handleNewRequest);
    return () => {
      socket.off("incoming_request", handleNewRequest);
    };
  }, [dispatch]);

  useEffect(() => {
    if (isCritical) {
      setShowPip(true);
    }
  }, [isCritical]);

  useEffect(() => {
    const handleJobTaken = (data: { broadcastId: string; acceptedProviderId: string }) => {
      dispatch({ type: "REMOVE_LIVE_BROADCAST", broadcastId: data.broadcastId });
    };
    socket.on("job_taken", handleJobTaken);
    return () => {
      socket.off("job_taken", handleJobTaken);
    };
  }, [dispatch]);

  useEffect(() => {
    const handleQuoteAccepted = (data: { 
      broadcastId: string; 
      bookingId: string; 
      serviceId: string; 
      customerName: string; 
      address: string;
      lat?: number;
      lng?: number;
      price: number;
      date: string;
      time: string;
      status: string;
    }) => {
      console.log("[socket] quote_accepted received:", data);
      
      // Add to providerRequests so Job.tsx can find it
      dispatch({ 
        type: "ADD_REQUEST", 
        request: {
          id: data.bookingId,
          customerName: data.customerName || "Customer",
          serviceId: data.serviceId,
          address: data.address || "Customer Location",
          lat: data.lat,
          lng: data.lng,
          status: "assigned",
          date: data.date || new Date().toISOString().slice(0, 10),
          time: data.time || "Now",
          price: data.price || 0,
          quote: data.price || 0,
          notes: "",
        } 
      });
      
      // Navigate to Job page
      navigate(`/provider/job/${data.bookingId}`);
    };
    
    socket.on("quote_accepted", handleQuoteAccepted);
    return () => { socket.off("quote_accepted", handleQuoteAccepted); };
  }, [dispatch, navigate]);

  const handleSubmitQuote = () => {
    if (!quotingBroadcast || !quotePrice) return;
    
    socket.emit("submit_quote", {
      broadcastId: quotingBroadcast.broadcastId,
      providerId: user.id,
      providerName: user.name,
      providerAvatar: user.name.charAt(0),
      price: Number(quotePrice),
      rating: providerStats.rating || 0,
      distanceKm: 0,
      etaMin: Number(quoteEta),
      reviews: 0
    });
    
    dispatch({ type: "REMOVE_LIVE_BROADCAST", broadcastId: quotingBroadcast.broadcastId });
    setQuotingBroadcast(null);
    setQuotePrice("");
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 relative provider-theme">
      {/* PIP Modal */}
      {isCritical && showPip && (
        <PIPModal 
          reasons={[
            providerStats.rating < 4.0 ? "Low Customer Rating (< 4.0)" : "",
            providerStats.responseRate < 50 ? "Critically Low Response Rate (< 50%)" : ""
          ].filter(Boolean)} 
          onCommit={() => {
            setShowPip(false);
            dispatch({ type: "UPDATE_STATS", patch: { rating: 4.5, responseRate: 90 } });
          }}
        />
      )}
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between animate-fade-in bg-card sticky top-0 z-10 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground font-medium">Provider Dashboard</p>
          <h1 className="text-xl font-extrabold text-foreground mt-0.5">Hi, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2 items-center">
          {/* Online/Offline Toggle */}
          <div className="flex items-center gap-2 mr-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-success' : 'text-muted-foreground'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <button 
              onClick={toggleOnline}
              className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center ${isOnline ? 'bg-success' : 'bg-muted-foreground/30'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isOnline ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <button 
            onClick={() => navigate("/provider/profile")}
            className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center relative hover:bg-primary/10 transition-colors"
            title="Provider Profile"
          >
            <User size={18} className="text-foreground" />
          </button>
          <button 
            onClick={() => {
              dispatch({ type: "LOGOUT" });
              navigate("/login", { replace: true });
            }}
            className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center relative hover:bg-red-100 transition-colors"
            title="Log Out"
          >
            <LogOut size={18} className="text-red-500" />
          </button>
          <button 
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center relative hover:bg-primary/10 transition-colors"
            title="Notifications"
          >
            <Bell size={18} className="text-foreground" />
            {pending.length > 0 && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Dynamic Warning Banner */}
        {(() => {
          let warning = null;
          if (providerStats.rating < 4.0 || providerStats.responseRate < 50) {
            warning = {
              type: "critical",
              title: "Account at Risk",
              message: "Your performance is critically low. Please improve immediately to avoid permanent deactivation.",
              bg: "bg-red-50",
              border: "border-red-100",
              text: "text-red-800",
              subtext: "text-red-600",
              iconColor: "text-red-500"
            };
          } else if (providerStats.responseRate < 90) {
            warning = {
              type: "warning",
              title: "Response Rate Low",
              message: `Your response rate is ${providerStats.responseRate}%. Accept more jobs to stay in good standing.`,
              bg: "bg-orange-50",
              border: "border-orange-100",
              text: "text-orange-800",
              subtext: "text-orange-600",
              iconColor: "text-orange-500"
            };
          } else if (providerStats.rating < 4.5) {
            warning = {
              type: "caution",
              title: "Rating Dropping",
              message: `Your rating is ${providerStats.rating}. Try to provide better service to get 5-star reviews.`,
              bg: "bg-yellow-50",
              border: "border-yellow-100",
              text: "text-yellow-800",
              subtext: "text-yellow-600",
              iconColor: "text-yellow-500"
            };
          }

          if (!warning || !showWarning) return null;

          return (
            <div className={`mx-5 mb-5 mt-4 ${warning.bg} ${warning.border} border rounded-xl p-3.5 flex items-start gap-3 relative animate-fade-in`}>
              <AlertTriangle size={18} className={`${warning.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="pr-6">
                <p className={`text-sm font-bold ${warning.text}`}>{warning.title}</p>
                <p className={`text-xs ${warning.subtext} mt-0.5 leading-relaxed`}>{warning.message}</p>
              </div>
              <button onClick={() => setShowWarning(false)} className={`absolute top-3.5 right-3.5 p-1 ${warning.iconColor} opacity-50 hover:opacity-100 transition-opacity`}>
                <X size={14} />
              </button>
            </div>
          );
        })()}

        {/* Live Job Broadcasts (Moved to Top) */}
        {isOnline && liveBroadcasts.length > 0 && (
          <div className="px-5 mb-6 mt-4">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Live Job Requests
            </h2>
            <div className="space-y-3">
              {liveBroadcasts.map((b) => {
                const service = getServiceById(b.serviceId);
                return (
                  <div key={b.broadcastId} className="bg-[#FFF8E6] border border-[#FFD966] rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-[#FFD966] to-transparent opacity-20" />
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
                        {service && <service.icon size={18} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{b.customerName}</p>
                        <p className="text-[10px] text-[#D97706] font-medium uppercase tracking-wider">{service?.label || b.serviceId}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-[#78350F]">
                          <span className="flex items-center gap-1 font-medium"><MapPin size={11} /> {b.address}</span>
                          <span className="flex items-center gap-1 font-medium"><Clock size={11} /> {b.time}</span>
                        </div>
                        {b.notes && <p className="text-[11px] text-[#92400E] mt-2 italic">"{b.notes}"</p>}
                        
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={() => setQuotingBroadcast(b)}
                            className="flex-1 py-2 bg-accent text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
                          >
                            Provide Quote
                          </button>
                          <button 
                            onClick={() => dispatch({ type: "REMOVE_LIVE_BROADCAST", broadcastId: b.broadcastId })}
                            className="px-3 py-2 border border-[#FCD34D] text-[#B45309] rounded-lg text-xs font-bold bg-[#FEF3C7] active:scale-95 transition-transform"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="px-5 mb-6">
          <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar -mx-5 px-5">
            <div className="bg-card border border-border rounded-2xl p-3.5 min-w-[130px] shadow-card flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2 text-emerald-600">
                <Wallet size={14} />
                <span className="text-[10px] uppercase tracking-wider font-bold">Earnings Today</span>
              </div>
              <p className="text-xl font-extrabold text-foreground">₹{earnings} <span className="text-[10px] font-medium text-muted-foreground"> earned</span></p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3.5 min-w-[120px] shadow-card flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2 text-primary">
                <Briefcase size={14} />
                <span className="text-[10px] uppercase tracking-wider font-bold">Completed</span>
              </div>
              <p className="text-xl font-extrabold text-foreground">{completedJobs.length} <span className="text-[10px] font-medium text-muted-foreground"> jobs</span></p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3.5 min-w-[110px] shadow-card flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2 text-warning">
                <Star size={14} fill="currentColor" />
                <span className="text-[10px] uppercase tracking-wider font-bold">Rating</span>
              </div>
              <p className="text-xl font-extrabold text-foreground">{providerStats.rating} <span className="text-[10px] font-medium text-muted-foreground">/ 5.0</span></p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3.5 min-w-[120px] shadow-card flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2 text-success">
                <TrendingUp size={14} />
                <span className="text-[10px] uppercase tracking-wider font-bold">Response</span>
              </div>
              <p className="text-xl font-extrabold text-foreground">{providerStats.responseRate}<span className="text-[10px] font-medium text-muted-foreground">%</span></p>
            </div>
          </div>
        </div>

        {/* AI Tip Card */}
        <div className="px-5 mb-6">
          <div className="bg-white border border-border/50 rounded-[14px] p-4 flex gap-3 items-start shadow-sm">
            <div className="bg-primary/5 p-2.5 rounded-xl flex-shrink-0">
              <Lightbulb size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">Smart Suggestion</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stay online to receive real-time job requests and increase your earnings.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/provider/jobs')} 
              className="bg-white rounded-[14px] p-4 flex flex-col items-start gap-3 shadow-sm border border-border/50 active:scale-[0.97] active:bg-primary/5 transition-all duration-200 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary transition-colors">
                <ClipboardCheck size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">My Jobs</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{accepted.length + pending.length} active jobs</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/provider/earnings')} 
              className="bg-white rounded-[14px] p-4 flex flex-col items-start gap-3 shadow-sm border border-border/50 active:scale-[0.97] active:bg-primary/5 transition-all duration-200 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary transition-colors">
                <Wallet size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">My Earnings</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">₹{earnings} earned</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/provider/portfolio')} 
              className="bg-white rounded-[14px] p-4 flex flex-col items-start gap-3 shadow-sm border border-border/50 active:scale-[0.97] active:bg-primary/5 transition-all duration-200 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary transition-colors">
                <Images size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">My Portfolio</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Showcase work</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/provider/documents')} 
              className="bg-white rounded-[14px] p-4 flex flex-col items-start gap-3 shadow-sm border border-border/50 active:scale-[0.97] active:bg-primary/5 transition-all duration-200 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary transition-colors">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">My Documents</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">KYC & Verification</p>
              </div>
            </button>
          </div>
        </div>


        {/* Incoming Requests */}
        <div className="px-5 mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">Incoming Requests</h2>
          {!isOnline ? (
             <div className="bg-muted border border-border border-dashed rounded-2xl p-6 text-center shadow-sm">
               <Power size={24} className="text-muted-foreground mx-auto mb-2" />
               <p className="text-sm font-bold text-foreground">You are currently offline</p>
               <p className="text-xs text-muted-foreground mt-1">Go online to receive new job requests in your area.</p>
             </div>
          ) : pending.length === 0 ? (
            <EmptyState icon={Inbox} title="No new requests" description="New jobs will appear here." />
          ) : (
            <div className="space-y-3">
              {pending.map((r) => {
                const service = getServiceById(r.serviceId);
                return (
                  <div key={r.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                        {service && <service.icon size={18} className="text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{r.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{service?.label} · ₹{r.price}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin size={10} /> {r.address}</span>
                          <span className="flex items-center gap-1"><Calendar size={10} /> {r.date}</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {r.time}</span>
                        </div>
                        {r.notes && <p className="text-[11px] text-foreground mt-2 italic">"{r.notes}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          dispatch({ type: "ACCEPT_REQUEST", id: r.id });
                          navigate(`/provider/job/${r.id}`);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => setSelectedJob(r)}
                        className="flex-1 py-2.5 rounded-xl bg-input border border-border text-foreground text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Eye size={14} /> Details
                      </button>
                      <button
                        onClick={() => {
                          dispatch({ type: "REJECT_REQUEST", id: r.id });
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-input border border-border text-foreground text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Bookings */}
        {accepted.length > 0 && (
          <div className="px-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Upcoming Bookings</h2>
              <button className="text-[11px] font-bold text-primary flex items-center">
                See all <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {accepted.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/provider/job/${r.id}`)}
                  className="w-full bg-primary rounded-2xl p-4 text-left active:scale-[0.98] shadow-md flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs text-blue-200/80 mb-0.5">{r.date} at {r.time}</p>
                    <p className="text-base font-bold text-white">{getServiceById(r.serviceId)?.label}</p>
                    <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                      <User size={12} /> {r.customerName}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-white/50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            {completedJobs.slice(0, 3).map((job, idx) => {
              const req = providerRequests.find(r => r.id === job.id);
              const service = req ? getServiceById(req.serviceId) : null;
              
              return (
                <div key={job.id} className={`p-4 flex items-center justify-between ${idx !== 0 ? 'border-t border-border' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Check size={16} className="text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{service?.label || "Service Completed"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{job.date || 'Today'}</p>
                    </div>
                  </div>
                  <p className="text-sm font-extrabold text-foreground">+₹{job.price}</p>
                </div>
              );
            })}
            {completedJobs.length === 0 && (
              <div className="p-5 text-center">
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <ProviderBottomNav />

      {/* Floating Window for Job Details */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedJob(null)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
              <h2 className="text-lg font-bold text-foreground">Job Details</h2>
              <button onClick={() => setSelectedJob(null)} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 pb-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                  {selectedJob.customerName.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{selectedJob.customerName}</p>
                  <p className="text-xs text-muted-foreground">{getServiceById(selectedJob.serviceId)?.label}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-input rounded-xl p-3 shadow-sm border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Calendar size={12}/> Date</p>
                  <p className="text-sm font-semibold text-foreground">{selectedJob.date}</p>
                </div>
                <div className="bg-input rounded-xl p-3 shadow-sm border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Time</p>
                  <p className="text-sm font-semibold text-foreground">{selectedJob.time}</p>
                </div>
              </div>

              <div className="bg-input rounded-xl p-3 shadow-sm border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={12}/> Address</p>
                <p className="text-sm font-semibold text-foreground">{selectedJob.address}</p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 shadow-sm">
                <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1 flex items-center gap-1"><Wallet size={12}/> Earnings</p>
                <p className="text-xl font-extrabold text-emerald-700">₹{selectedJob.price}</p>
              </div>

              {selectedJob.notes && (
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 shadow-sm">
                  <p className="text-[10px] text-orange-600 uppercase font-bold mb-1 flex items-center gap-1"><FileText size={12}/> Notes from Customer</p>
                  <p className="text-xs text-orange-900 italic leading-relaxed">"{selectedJob.notes}"</p>
                </div>
              )}

              {/* Attachments Section */}
              {(selectedJob.photos?.length > 0 || selectedJob.video || selectedJob.voiceNote) ? (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 mt-2">Attachments provided</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {selectedJob.photos?.map((photo: string, idx: number) => (
                      <div key={idx} className="w-24 h-24 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border shadow-sm overflow-hidden relative">
                        <img src={photo} alt="Issue" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {selectedJob.video && (
                      <div className="w-24 h-24 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border relative shadow-sm overflow-hidden">
                        <Video size={24} className="text-muted-foreground/60 z-10" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-20">
                          <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <Play size={14} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedJob.voiceNote && (
                      <div className="w-32 h-24 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border flex-col gap-1 shadow-sm">
                        <Mic size={20} className="text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground font-semibold">Voice Note</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 mt-2">Attachments provided</h3>
                  <p className="text-xs text-muted-foreground">No attachments provided.</p>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border flex gap-2 bg-card">
              <button
                onClick={() => {
                  dispatch({ type: "REJECT_REQUEST", id: selectedJob.id });
                  setSelectedJob(null);
                }}
                className="flex-1 py-3.5 rounded-xl bg-input border border-border text-foreground text-sm font-bold active:scale-95 transition-transform"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  dispatch({ type: "ACCEPT_REQUEST", id: selectedJob.id });
                  navigate(`/provider/job/${selectedJob.id}`);
                }}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform shadow-md"
              >
                Accept Job
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Direct Request Popup (Top-aligned) */}
      {(simulatedRequest || activeDirectRequest) && (
        <IncomingRequestPopup 
          request={simulatedRequest || activeDirectRequest}
          isBroadcast={false}
          onAccept={() => {
            const req = simulatedRequest || activeDirectRequest;
            dispatch({ type: "ACCEPT_REQUEST", id: req.id });
            if (simulatedRequest) setSimulatedRequest(null);
            if (activeDirectRequest) setActiveDirectRequest(null);
            navigate(`/provider/job/${req.id}`);
          }}
          onReject={() => {
            const req = simulatedRequest || activeDirectRequest;
            dispatch({ type: "REJECT_REQUEST", id: req.id });
            if (simulatedRequest) setSimulatedRequest(null);
            if (activeDirectRequest) setActiveDirectRequest(null);
          }}
        />
      )}

      {/* Live Job Broadcast Popup (Top-aligned) */}
      {isOnline && liveBroadcasts.length > 0 && !quotingBroadcast && (
        <IncomingRequestPopup 
          request={{
            ...liveBroadcasts[0],
            serviceId: liveBroadcasts[0].serviceId,
            customerName: liveBroadcasts[0].customerName,
            customerRating: "4.8",
            distanceKm: "1.2",
            address: liveBroadcasts[0].address,
            date: liveBroadcasts[0].date,
            time: liveBroadcasts[0].time,
            price: 0,
            notes: liveBroadcasts[0].notes || "No notes provided."
          }}
          isBroadcast={true}
          onAccept={() => setQuotingBroadcast(liveBroadcasts[0])}
          onReject={() => dispatch({ type: "REMOVE_LIVE_BROADCAST", broadcastId: liveBroadcasts[0].broadcastId })}
        />
      )}

      {/* Quote Modal */}
      {quotingBroadcast && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-5 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-foreground mb-1">Submit Your Quote</h3>
            <p className="text-xs text-muted-foreground mb-4">Customer: {quotingBroadcast.customerName}</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Your Price (₹)</label>
                <input 
                  type="number" 
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full h-11 bg-muted border border-border rounded-xl px-3 font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Estimated Arrival (Mins)</label>
                <input 
                  type="number" 
                  value={quoteEta}
                  onChange={(e) => setQuoteEta(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full h-11 bg-muted border border-border rounded-xl px-3 font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setQuotingBroadcast(null)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitQuote}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md"
              >
                Send Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

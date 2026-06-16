import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CalendarCheck, Gift, CheckCircle2, Star, Clock, ChevronRight, X, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createBooking } from "@/lib/api";
import { socket } from "@/lib/socket";
import { formatDistance } from "@/lib/utils";

const Notifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    dispatch, 
    user, 
    role,
    currentLocation, 
    bookingNotes, 
    bookingVoiceNote, 
    bookingVoiceNoteUrl 
  } = useApp() as any;

  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  // Filter notifications strictly by targetRole matching the current active role:
  const filteredNotifications = (notifications || []).filter((n: any) => {
    return n.targetRole === role;
  });

  const getIcon = (type: string) => {
    switch(type) {
      case "booking": return <CalendarCheck size={16} className="text-blue-500" />;
      case "offer": return <Gift size={16} className="text-amber-500" />;
      case "payment": return <CheckCircle2 size={16} className="text-green-500" />;
      default: return <Bell size={16} className="text-slate-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch(type) {
      case "booking": return "bg-blue-50 border-blue-100";
      case "offer": return "bg-amber-50 border-amber-100";
      case "payment": return "bg-green-50 border-green-100";
      default: return "bg-slate-50 border-slate-100";
    }
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleDeclineQuote = (quote: any, notificationId: string) => {
    dispatch({ type: "REMOVE_RECEIVED_QUOTE", broadcastId: quote.broadcastId, providerId: quote.providerId });
    dispatch({ type: "REMOVE_NOTIFICATION", id: notificationId });
  };

  const handleAcceptQuote = async (quote: any, notificationId: string) => {
    if (acceptingQuoteId) return;
    if (!user || !user.id) {
      navigate("/login");
      return;
    }
    setAcceptingQuoteId(quote.providerId);

    const bookingData = {
      customer_id: user.id,
      provider_id: quote.providerId,
      service_id: quote.serviceId || "service",
      status: "assigned",
      scheduled_at: new Date(Date.now() + quote.etaMin * 60000).toISOString(),
      address: user.address || "Client Address",
      lat: currentLocation?.lat || null,
      lng: currentLocation?.lng || null,
      price: quote.price,
      notes: bookingNotes || "Quick fix requested",
      voice_note: bookingVoiceNote,
      voice_note_url: bookingVoiceNoteUrl || null,
    };

    try {
      const res = await createBooking(bookingData);
      if (res.success) {
        sessionStorage.removeItem("searching_providers_state");
        sessionStorage.removeItem("searching_providers_scroll");
        sessionStorage.removeItem("searching_providers_quotes");

        const enrichedBooking = {
          ...res.data,
          providerDetails: {
            name: quote.providerName,
            avatar: quote.providerAvatar,
            rating: quote.rating,
            experienceYrs: quote.reviews || 2,
            phone: quote.providerPhone || "",
          }
        };
        dispatch({ type: "ADD_BOOKING", booking: enrichedBooking });

        socket.emit("accept_quote", {
          broadcastId: quote.broadcastId,
          acceptedProviderId: quote.providerId,
          bookingId: res.data.id,
          customerName: user.name,
          customerPhone: user.phone,
          address: user.address || "Customer Location",
          serviceId: quote.serviceId || "service",
          price: quote.price,
          lat: currentLocation?.lat || null,
          lng: currentLocation?.lng || null,
          scheduled_at: res.data.scheduled_at,
        });

        dispatch({ type: "REMOVE_NOTIFICATION", id: notificationId });
        navigate(`/chat/${res.data.id}`);
      } else {
        alert("Failed to confirm booking.");
      }
    } catch (err) {
      console.error("Error accepting quote:", err);
      alert("Error confirming booking. Please check connection.");
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#F8FAFC] pb-24 font-sans select-none">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
        </div>
        {filteredNotifications.length > 0 && (
          <button 
            onClick={() => {
              filteredNotifications.forEach((n: any) => {
                dispatch({ type: "REMOVE_NOTIFICATION", id: n.id });
              });
            }}
            className="text-[10px] font-extrabold text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium">
            <div className="w-12 h-12 bg-white rounded-full border border-slate-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Bell size={20} className="text-slate-400 opacity-60" />
            </div>
            <p className="text-xs">No new notifications</p>
          </div>
        ) : (
          filteredNotifications.map((n: any) => {
            // ==========================================
            // CUSTOMER CARD: new_quote_received
            // ==========================================
            if (n.type === "new_quote_received") {
              const quote = n.metadata;
              if (!quote) return null;
              return (
                <div key={n.id} className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm flex flex-col gap-3 relative transition-all hover:shadow-md hover:border-slate-200">
                  
                  {/* Top Row: Provider Avatar, Name, Quote Info & ETA Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => navigate(`/provider/${quote.providerId}`, { state: { quote } })}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer text-sm shadow-sm"
                      >
                        {quote.providerAvatar || quote.providerName.charAt(0)}
                      </div>
                      
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-800 leading-tight">{quote.providerName}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          {quote.rating === 0 ? (
                            <span className="text-amber-600 font-bold uppercase text-[9px]">New</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Star size={10} className="fill-amber-500 text-amber-500" /> {Number(quote.rating || 0).toFixed(1)}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDistance(quote.distanceKm)}</span>
                          <span>•</span>
                          <span className="lowercase">{formatTime(n.ts)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-base font-extrabold text-slate-900 leading-none">₹{quote.price}</span>
                        <span className="text-[9px] text-[#B45309] font-bold bg-[#FEF3C7] px-1.5 py-0.5 rounded-full mt-1 border border-amber-200/50">
                          ETA: {quote.etaMin} mins
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row Buttons (Smaller modern buttons with equal spacing) */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-3">
                    <button 
                      onClick={() => navigate(`/provider/${quote.providerId}`, { state: { quote } })}
                      className="py-1.5 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold bg-white active:scale-95 transition-all hover:bg-slate-50 flex items-center justify-center"
                    >
                      View Profile
                    </button>
                    <button 
                      onClick={() => handleDeclineQuote(quote, n.id)}
                      className="py-1.5 border border-red-100 text-red-500 rounded-lg text-[11px] font-semibold bg-red-50/50 active:scale-95 transition-all hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                    >
                      Decline
                    </button>
                    <button 
                      disabled={acceptingQuoteId === quote.providerId}
                      onClick={() => handleAcceptQuote(quote, n.id)}
                      className="py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1 hover:bg-primary/95 disabled:opacity-70 disabled:scale-100"
                    >
                      {acceptingQuoteId === quote.providerId ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Quote"
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            // ==========================================
            // PROVIDER CARD: quote_sent_confirmation
            // ==========================================
            if (n.type === "quote_sent_confirmation") {
              return (
                <div key={n.id} className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-sm flex gap-3 relative transition-all hover:shadow-md hover:border-emerald-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-sm">
                    <CheckCircle2 size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-bold text-emerald-800">✅ Quote Sent Successfully</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{formatTime(n.ts)}</span>
                    </div>
                    
                    <p className="text-[12.5px] text-slate-600 font-semibold mt-1">
                      {n.text}
                    </p>
                    
                    <div className="flex items-center gap-1.5 text-[9.5px] text-[#047857] font-bold bg-[#ECFDF5] px-2 py-0.5 rounded-full mt-2 w-fit border border-emerald-200/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>⏳ Waiting for customer response</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                    className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            }

            // ==========================================
            // DEFAULT / GENERAL CARDS (Role Specific)
            // ==========================================
            return (
              <div key={n.id} className="p-3.5 rounded-xl border bg-white border-slate-100 shadow-sm relative flex items-start gap-3 transition-all hover:shadow-md hover:border-slate-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 shadow-sm ${getIconBg(n.type || "default")}`}>
                  {getIcon(n.type || "default")}
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                      {n.type === "booking" ? "Booking Update" : n.type === "offer" ? "Special Offer" : n.type === "payment" ? "Payment Receipt" : n.type === "chat" ? "New Message" : "Alert"}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">{formatTime(n.ts)}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-slate-600 font-semibold">{n.text}</p>
                </div>

                <button 
                  onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                  className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;

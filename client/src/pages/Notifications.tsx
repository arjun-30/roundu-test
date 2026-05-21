import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CalendarCheck, Gift, CheckCircle2, Star, Clock, ChevronRight, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createBooking } from "@/lib/api";
import { socket } from "@/lib/socket";

const Notifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    dispatch, 
    user, 
    currentLocation, 
    bookingNotes, 
    bookingVoiceNote, 
    bookingVoiceNoteUrl 
  } = useApp() as any;

  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

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

  const handleDeclineQuote = (quote: any, notificationId: string) => {
    dispatch({ type: "REMOVE_RECEIVED_QUOTE", broadcastId: quote.broadcastId, providerId: quote.providerId });
    dispatch({ type: "REMOVE_NOTIFICATION", id: notificationId });
  };

  const handleAcceptQuote = async (quote: any, notificationId: string) => {
    if (acceptingQuoteId) return;
    if (!user || !user.id) {
      navigate("/auth");
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
        // Clear searching page caches
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

        // Notify socket
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

        // Dismiss this quote notification
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
    <div className="min-h-full flex flex-col bg-background pb-24 font-sans select-none">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all">
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-xl font-extrabold text-foreground">Notifications</h1>
        </div>
        <button 
          onClick={() => {
            notifications.forEach((n: any) => {
              dispatch({ type: "REMOVE_NOTIFICATION", id: n.id });
            });
          }}
          className="text-[11px] font-extrabold text-secondary bg-secondary/10 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-wider"
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground font-medium">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p>No new notifications</p>
          </div>
        ) : (
          notifications.map((n: any) => {
            if (n.type === "new_quote_received") {
              const quote = n.metadata;
              if (!quote) return null;
              return (
                <div key={n.id} className="bg-white border border-[#FFD966] rounded-2xl p-4 shadow-[0_4px_20px_rgba(245,158,11,0.06)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#F59E0B]" />
                  
                  <div className="flex justify-between items-start mb-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      <span className="text-[11px] font-bold text-[#B45309] uppercase tracking-wider">New Quote Received</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{formatTime(n.ts)}</span>
                      <button 
                        onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                        className="p-1 hover:bg-gray-100 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => navigate(`/provider/${quote.providerId}`, { state: { quote } })}
                        className="w-11 h-11 rounded-full bg-[#FFF8E6] flex items-center justify-center font-extrabold text-[#B45309] border border-[#FFD966] hover:border-[#F59E0B] transition-colors cursor-pointer"
                      >
                        {quote.providerAvatar || quote.providerName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-extrabold text-foreground">{quote.providerName}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {quote.rating === 0 ? (
                            <span className="flex items-center gap-0.5 text-yellow-600 bg-yellow-100 px-1 py-0.5 rounded font-bold uppercase text-[9px]">New</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-yellow-500 font-bold">
                              <Star size={11} className="fill-yellow-500 text-yellow-500" /> {quote.rating}
                            </span>
                          )}
                          <span>• {quote.distanceKm}km away</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-extrabold text-primary">₹{quote.price}</p>
                      <p className="text-[9px] text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded-md mt-1 inline-block border border-green-100">ETA: {quote.etaMin} mins</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/provider/${quote.providerId}`, { state: { quote } })}
                      className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold bg-white active:scale-95 transition-all hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      View Profile <ChevronRight size={12} />
                    </button>
                    <button 
                      onClick={() => handleDeclineQuote(quote, n.id)}
                      className="px-3.5 py-2.5 border border-[#FECACA] text-[#DC2626] rounded-xl text-xs font-bold bg-[#FEF2F2] active:scale-95 transition-all hover:bg-[#FEE2E2]"
                    >
                      Decline
                    </button>
                    <button 
                      disabled={acceptingQuoteId === quote.providerId}
                      onClick={() => handleAcceptQuote(quote, n.id)}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:scale-100"
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

            if (n.type === "quote_sent_confirmation") {
              return (
                <div key={n.id} className="bg-white border border-[#A7F3D0] rounded-2xl p-4 shadow-[0_4px_20px_rgba(16,185,129,0.06)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#10B981]" />
                  
                  <div className="flex justify-between items-start mb-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <span className="text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Quote Sent Successfully</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{formatTime(n.ts)}</span>
                      <button 
                        onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                        className="p-1 hover:bg-gray-100 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-[13px] leading-snug text-gray-600 font-semibold mb-2">
                    {n.text}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#047857] font-bold bg-[#ECFDF5] px-2.5 py-1 rounded-lg inline-flex border border-[#A7F3D0]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span>Waiting for customer response...</span>
                  </div>
                </div>
              );
            }

            // Fallback default style for other notification types
            return (
              <div key={n.id} className="p-4 rounded-2xl border transition-all bg-white border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-blue-50 relative group">
                <button 
                  onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                  className="absolute top-3.5 right-3.5 p-1 hover:bg-gray-100 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
                <div className="flex gap-3.5">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border flex-shrink-0 ${getIconBg(n.type || "default")}`}>
                    {getIcon(n.type || "default")}
                  </div>
                  <div className="flex-1 pr-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[14px] font-extrabold text-foreground">
                        {n.type === "booking" ? "Booking Update" : n.type === "offer" ? "Special Offer" : n.type === "payment" ? "Payment Receipt" : "Alert"}
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{formatTime(n.ts)}</span>
                    </div>
                    <p className="text-[13px] leading-snug mt-0.5 text-gray-600 font-semibold">{n.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;

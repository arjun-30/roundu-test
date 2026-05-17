import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Phone, MoreVertical, MessageSquare } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProviderById } from "@/data/mockData";
import { socket } from "@/lib/socket";

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, bookings, providerRequests, chatHistories, dispatch } = useApp() as any;

  const [message, setMessage] = useState("");
  const [notification, setNotification] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Resolve booking / request / participant details
  const booking = bookings.find((b: any) => b.id === id);
  const request = providerRequests.find((r: any) => r.id === id);

  const roomId = booking?.id || request?.id || id || "";
  const messages = chatHistories[roomId] || [];

  let participantName = "User";
  let participantAvatar = "U";
  let participantPhone = "";

  if (role === "customer") {
    // Other person is the provider
    const providerId = booking?.providerId;
    const providerDetails = booking?.providerDetails || (providerId ? getProviderById(providerId) : null);
    
    participantName = providerDetails?.name || "Provider";
    participantAvatar = typeof providerDetails?.avatar === "string" && providerDetails.avatar.length <= 2 
      ? providerDetails.avatar 
      : (providerDetails?.name?.charAt(0) || "P");
    participantPhone = providerDetails?.phone || "+919999999992";
  } else if (role === "provider") {
    // Other person is the customer
    participantName = request?.customerName || "Customer";
    participantAvatar = request?.customerName 
      ? request.customerName.split(" ").map((n: string) => n[0]).join("") 
      : "C";
    participantPhone = request?.customerPhone || "+919876543210";
  }

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // 2. Auto-scroll to bottom of messages list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Socket Room Isolation
  useEffect(() => {
    if (!roomId) return;
    socket.emit("join_chat_room", { bookingId: roomId });
  }, [roomId]);

  const handleSendMessage = () => {
    if (!message.trim() || !roomId) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = {
      bookingId: roomId,
      text: message,
      senderId: user.id,
      senderRole: role,
      time
    };

    // Emit over socket
    socket.emit("send_chat_message", payload);

    // Dispatch locally to update global state and UI
    dispatch({ type: "ADD_CHAT_MESSAGE", payload });
    setMessage("");
  };

  const handleCall = () => {
    const dialPhone = participantPhone || "+911234567890";
    showNotification("Connecting via secure masked number...");
    window.open(`tel:${dialPhone}`, "_self");
  };

  return (
    <div className="h-screen flex flex-col bg-background font-['DM_Sans',sans-serif]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-card border-b border-border z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shadow-sm">
          {participantAvatar}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate">{participantName}</h1>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Active Booking
          </p>
        </div>

        <button onClick={handleCall} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95 transition-transform">
          <Phone size={18} className="text-primary" />
        </button>
        <button className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95 transition-transform">
          <MoreVertical size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-background to-secondary/5 no-scrollbar">
        {notification && (
          <div className="bg-secondary text-primary border border-primary/20 px-4 py-3 rounded-2xl text-xs font-semibold shadow-sm animate-fade-in text-center mx-auto max-w-[280px]">
            {notification}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 px-5 gap-3">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-1">
              <MessageSquare size={28} className="text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Start the Conversation</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Send a message to coordinate service coordinates, address entries, or status requests.
            </p>
          </div>
        ) : (
          messages.map((msg: any, index: number) => (
            <div key={index} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm transition-all ${
                msg.sender === "me" 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-card border border-border rounded-bl-none text-foreground"
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[9px] mt-1.5 text-right font-medium ${msg.sender === "me" ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-card border-t border-border shadow-lg">
        <div className="flex items-center gap-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3.5 rounded-2xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Chat;

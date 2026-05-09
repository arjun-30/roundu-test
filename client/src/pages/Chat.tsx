import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Phone, MoreVertical } from "lucide-react";


const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  
  // Mock messages
  const [messages, setMessages] = useState([
    { id: 1, sender: "other", text: "Hello! Are you on the way?", time: "10:30 AM" },
    { id: 2, sender: "me", text: "Yes, I am on the way. Will reach in 10 mins.", time: "10:31 AM" },
    { id: 3, sender: "other", text: "Great, thank you!", time: "10:32 AM" },
  ]);

  const [notification, setNotification] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const newMessage = {
      id: messages.length + 1,
      sender: "me",
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setMessage("");
  };

  const handleCall = () => {
    showNotification("Connecting via secure masked number...");
    window.open("tel:+911234567890", "_self");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-card border-b border-border z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground">Chat</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Online
          </p>
        </div>
        <button onClick={handleCall} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <Phone size={18} className="text-primary" />
        </button>
        <button className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {notification && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-sm font-semibold mb-2">
                {notification}
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl p-3 ${
                  msg.sender === "me" 
                    ? "bg-primary text-primary-foreground rounded-br-none" 
                    : "bg-card border border-border rounded-bl-none"
                }`}>
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${msg.sender === "me" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
      </div>

      {/* Input Area */}
      <div className="p-5 bg-card border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full pl-4 pr-12 py-3 rounded-2xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={handleSendMessage}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Navigation } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { getChatbotResponse, ChatMessage, ChatContext } from "@/data/chatbotKnowledge";
import "./chatbot.css";

const SupportChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, bookings, walletBalance } = useApp() as any;

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const activeCount = (bookings || []).filter((b: any) => 
        ['pending', 'accepted', 'assigned', 'on_the_way', 'arrived', 'in_progress'].includes(b.status)
      ).length;

      const context: ChatContext = {
        pathname,
        userRole: role || "customer",
        userName: user?.name?.split(" ")[0] || "there",
        walletBalance: walletBalance || 0,
        activeBookingsCount: activeCount
      };

      setIsTyping(true);
      setTimeout(() => {
        const response = getChatbotResponse("hi", context);
        setMessages([
          {
            id: Date.now().toString(),
            sender: "bot",
            text: response.text,
            timestamp: Date.now(),
            options: response.options
          }
        ]);
        setIsTyping(false);
      }, 500);
    }
  }, [isOpen, messages.length, pathname, role, user, bookings, walletBalance]);

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const activeCount = (bookings || []).filter((b: any) => 
        ['pending', 'accepted', 'assigned', 'on_the_way', 'arrived', 'in_progress'].includes(b.status)
      ).length;

      const context: ChatContext = {
        pathname,
        userRole: role || "customer",
        userName: user?.name?.split(" ")[0] || "there",
        walletBalance: walletBalance || 0,
        activeBookingsCount: activeCount
      };

      const response = getChatbotResponse(text.trim(), context);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: response.text,
        timestamp: Date.now(),
        options: response.options
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleOptionClick = (option: string) => {
    handleSend(option);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary text-white shadow-[0_8px_30px_rgba(21,46,75,0.3)] flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition-all animate-bounce-slight"
        >
          <div className="relative">
            <MessageSquare size={24} />
            <span className="absolute -top-1 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-primary animate-pulse" />
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 left-0 md:left-auto md:right-5 md:bottom-24 md:w-[380px] h-[80vh] md:h-[600px] bg-white md:rounded-[24px] shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-up border border-slate-100">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-[#1C3D63] px-5 py-4 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-sm">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-[15px] flex items-center gap-1.5">
                  RoundU Support <Sparkles size={12} className="text-amber-400" />
                </h3>
                <p className="text-white/70 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition-colors relative z-10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC] space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                    msg.sender === "user" 
                      ? "bg-slate-200 text-slate-600" 
                      : "bg-primary text-white"
                  }`}>
                    {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>

                  {/* Bubble */}
                  <div className={`px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-[20px] rounded-br-sm"
                      : "bg-white text-slate-700 rounded-[20px] rounded-bl-sm border border-slate-100"
                  }`}>
                    {msg.text.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i !== msg.text.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timestamp */}
                <span className={`text-[9px] text-slate-400 mt-1.5 px-9 font-medium`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Options (Bot only) */}
                {msg.sender === "bot" && msg.options && (
                  <div className="mt-2.5 flex flex-wrap gap-2 px-9">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleOptionClick(opt)}
                        className="text-[11px] font-bold text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-slate-100 px-4 py-3.5 rounded-[20px] rounded-bl-sm shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="w-full pl-4 pr-12 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-[18px] text-[13px] font-medium text-slate-700 focus:outline-none focus:border-primary/50 focus:bg-white transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="absolute right-1.5 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300 transition-colors"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
            
            {/* Context Hint */}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-semibold text-slate-400">
              <Navigation size={10} />
              <span>Context: {pathname.split('/')[1] || 'home'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatbot;

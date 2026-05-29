import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Bot, User, Sparkles, Navigation } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { getChatbotResponse, ChatMessage, ChatContext } from "@/data/chatbotKnowledge";

const Assistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, bookings, walletBalance } = useApp() as any;

  // Track the previous pathname passed in from state
  const fromPathname = location.state?.from || "/home";

  const handleBack = () => {
    // If we have browser history, just go back. Otherwise go to fromPathname.
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fromPathname, { replace: true });
    }
  };

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      const activeCount = (bookings || []).filter((b: any) => 
        ['pending', 'accepted', 'assigned', 'on_the_way', 'arrived', 'in_progress'].includes(b.status)
      ).length;

      const context: ChatContext = {
        pathname: fromPathname, // context based on where they came from
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
  }, [messages.length, fromPathname, role, user, bookings, walletBalance]);

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
        pathname: fromPathname,
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
    <div className="min-h-full flex flex-col bg-[#F8FAFC] font-sans absolute inset-0 z-50">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-[#1C3D63] px-5 pt-10 pb-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        
        <div className="flex items-center gap-3 relative z-10 w-full">
          <button 
            onClick={handleBack} 
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          
          <div className="flex items-center gap-3 ml-1">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-sm">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-[15px] flex items-center gap-1.5">
                RoundU Assistant <Sparkles size={12} className="text-amber-400" />
              </h3>
              <p className="text-white/70 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-4">
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
              <div className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                msg.sender === "user"
                  ? "bg-primary text-white rounded-[20px] rounded-br-sm"
                  : "bg-white text-slate-700 rounded-[20px] rounded-bl-sm border border-slate-200"
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
            <span className={`text-[10px] text-slate-400 mt-1.5 px-9 font-medium`}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Options (Bot only) */}
            {msg.sender === "bot" && msg.options && (
              <div className="mt-2.5 flex flex-wrap gap-2 px-9">
                {msg.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(opt)}
                    className="text-[12px] font-bold text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
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
            <div className="bg-white border border-slate-200 px-4 py-3.5 rounded-[20px] rounded-bl-sm shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 pb-8 max-w-[430px] mx-auto z-20">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything..."
            className="w-full pl-4 pr-12 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-[18px] text-[14px] font-medium text-slate-700 focus:outline-none focus:border-primary/50 focus:bg-white transition-colors shadow-inner"
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
          <span>Context: {fromPathname.split('/')[1] || 'home'}</span>
        </div>
      </div>

    </div>
  );
};

export default Assistant;

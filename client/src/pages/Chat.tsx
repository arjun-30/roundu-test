import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Phone, MoreVertical, MessageSquare,
  Mic, Square, Trash2, Play, Pause, CheckCheck, MicOff,
  Navigation, Minus, ChevronUp
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProviderById } from "@/data/mockData";
import { socket } from "@/lib/socket";
import { getChatHistory } from "@/lib/api";

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, bookings, providerRequests, chatHistories, onlineUsers, dispatch } = useApp() as any;

  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState("");
  const [notification, setNotification] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevMsgCountRef = useRef(0);

  // 1. Resolve booking / request / participant details
  const booking = bookings.find((b: any) => String(b.id) === id || String(b.id) === String(id).replace('req-', ''));
  const request = providerRequests.find((r: any) => String(r.id) === id || String(r.id) === `req-${id}`);

  const roomId = booking?.id || (request?.id ? String(request.id).replace('req-', '') : null) || id || "";
  const messages = chatHistories[roomId] || [];

  let participantName = "User";
  let participantAvatar = "U";
  let participantPhone = "";
  let participantId = "";

  if (role === "customer") {
    const providerId = booking?.providerId || booking?.provider_id;
    participantId = providerId || "";
    const providerDetails = booking?.providerDetails || (providerId ? getProviderById(providerId) : null);
    participantName = providerDetails?.name || "Provider";
    participantAvatar = typeof providerDetails?.avatar === "string" && providerDetails.avatar.length <= 2
      ? providerDetails.avatar
      : (providerDetails?.name?.charAt(0) || "P");
    participantPhone = providerDetails?.phone || "";
  } else if (role === "provider") {
    participantId = request?.customerId || booking?.customerId || booking?.customer_id || "";
    participantName = request?.customerName || booking?.customerName || "Customer";
    participantAvatar = participantName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "C";
    participantPhone = request?.customerPhone || booking?.customerPhone || "";
  }

  const isPartnerOnline = onlineUsers[participantId] || false;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Track new messages while minimized
  useEffect(() => {
    if (isMinimized && messages.length > prevMsgCountRef.current) {
      setUnreadCount(c => c + (messages.length - prevMsgCountRef.current));
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, isMinimized]);

  // Clear unread when maximized
  const handleMaximize = () => {
    setIsMinimized(false);
    setUnreadCount(0);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // 2. Auto-scroll to bottom
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, partnerTyping, isMinimized]);

  // 3. Join chat room, listen for typing, fetch history, and mark seen
  useEffect(() => {
    if (!roomId) return;
    socket.emit("join_chat_room", { bookingId: String(roomId) });

    if (!chatHistories[roomId] || chatHistories[roomId].length === 0) {
      getChatHistory(roomId).then(res => {
        if (res.success) {
          const formatted = res.data.map((m: any) => ({
            id: m.id,
            sender: (m.senderRole || m.sender_role) === role ? "me" : "other",
            text: m.text,
            time: m.time,
            audioBase64: m.audioBase64,
            isSeen: m.isSeen
          }));
          dispatch({ type: "SET_CHAT_HISTORY", payload: { bookingId: roomId, messages: formatted } });
        }
      }).catch(err => console.error("Failed to load chat history:", err));
    }

    if (participantId) {
      socket.emit("mark_messages_seen", { bookingId: String(roomId), recipientId: user.id });
    }

    const handleTyping = (data: { bookingId: string; senderId: string }) => {
      if (String(data.bookingId) === String(roomId) && data.senderId !== user?.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 2500);
      }
    };
    socket.on("typing_indicator", handleTyping);
    return () => { socket.off("typing_indicator", handleTyping); };
  }, [roomId, user?.id, participantId]);

  // 4. Typing indicator emission
  const handleInputChange = (val: string) => {
    setMessage(val);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing_indicator", { bookingId: roomId, senderId: user?.id });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 2000);
  };

  // 5. Send text message
  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !roomId) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = { bookingId: String(roomId), text: message.trim(), senderId: user.id, senderRole: role, time };
    socket.emit("send_chat_message", payload);
    dispatch({ type: "ADD_CHAT_MESSAGE", payload });
    setMessage("");
    setIsTyping(false);
  }, [message, roomId, user?.id, role, dispatch]);

  // 6. Send voice note
  const handleSendVoice = useCallback(() => {
    if (!audioBase64 || !roomId) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = { bookingId: roomId, text: "🎤 Voice message", senderId: user.id, senderRole: role, time, audioBase64 };
    socket.emit("send_chat_message", payload);
    dispatch({ type: "ADD_CHAT_MESSAGE", payload });
    setAudioBase64(null);
    setAudioBlobUrl(null);
    setRecordingSeconds(0);
  }, [audioBase64, roomId, user?.id, role, dispatch]);

  // 7. Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        const reader = new FileReader();
        reader.onloadend = () => { setAudioBase64(reader.result as string); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 60) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      showNotification("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const discardRecording = () => {
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    setAudioBlobUrl(null);
    setAudioBase64(null);
    setRecordingSeconds(0);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const handleCall = () => {
    if (!participantPhone) {
      showNotification("Phone number not available yet.");
      return;
    }
    showNotification("Connecting via secure masked number...");
    window.open(`tel:${participantPhone}`, "_self");
  };

  const handleTrackBooking = () => {
    navigate(`/tracking/${roomId}`);
  };

  const formatSeconds = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Minimized floating pill ──────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="h-screen flex flex-col bg-[#F0F4F8] font-['DM_Sans',sans-serif] relative">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-30 select-none pointer-events-none px-8 text-center">
          <MessageSquare size={52} className="text-primary" />
          <p className="text-sm font-bold text-muted-foreground">Chat minimized</p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="absolute top-5 left-4 w-10 h-10 rounded-[14px] bg-white border border-[#E1E8EF] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} className="text-primary" />
        </button>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-8 left-4 right-4"
        >
          <button
            onClick={handleMaximize}
            className="w-full flex items-center gap-3 bg-white border border-[#E1E8EF] rounded-[20px] px-4 py-3.5 shadow-xl active:scale-[0.98] transition-transform"
          >
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-primary/20">
                {participantAvatar}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isPartnerOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            </div>

            <div className="flex-1 text-left min-w-0">
              <p className="text-[14px] font-extrabold text-foreground truncate">{participantName}</p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {partnerTyping ? "typing…" : isPartnerOnline ? "Online · tap to chat" : "Offline · tap to chat"}
              </p>
            </div>

            {unreadCount > 0 && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow">
                <span className="text-[10px] text-white font-black">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}

            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ChevronUp size={16} className="text-primary" />
            </div>
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Full chat UI ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#F0F4F8] font-['DM_Sans',sans-serif]">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-4 pt-5 pb-3 flex items-center gap-3 bg-white border-b border-[#E1E8EF] shadow-sm z-10"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-[14px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={20} className="text-foreground" strokeWidth={2.5} />
        </motion.button>

        {/* Avatar */}
        <div className="w-11 h-11 rounded-[16px] bg-primary flex items-center justify-center text-white font-extrabold text-[15px] shadow-lg shadow-primary/20 relative">
          {participantAvatar}
          {isPartnerOnline && (
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h1 className="text-[16px] font-extrabold text-foreground truncate tracking-tight">{participantName}</h1>
          <p className={`text-[11px] font-bold mt-0.5 ${isPartnerOnline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {isPartnerOnline ? 'Online' : 'Offline'}
          </p>
        </div>

        {/* Minimize button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMinimized(true)}
          className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
          title="Minimize chat"
        >
          <Minus size={16} className="text-muted-foreground" strokeWidth={2.5} />
        </motion.button>

        <div className="flex gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={role === "provider" ? () => navigate(`/provider/job/${roomId}`) : handleTrackBooking}
            className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
          >
            <Navigation size={18} className="text-primary" strokeWidth={2.5} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCall}
            className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
          >
            <Phone size={18} className="text-primary" strokeWidth={2.5} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => showNotification("More options coming soon.")}
            className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
          >
            <MoreVertical size={18} className="text-primary" strokeWidth={2.5} />
          </motion.button>
        </div>
      </motion.div>

      {/* Safety Banner */}
      <div className="bg-orange-50 px-4 py-2 flex items-start gap-2 border-b border-orange-100 z-10">
        <div className="mt-0.5 text-xs">⚠️</div>
        <p className="text-[11px] text-orange-800 font-medium leading-tight">
          <span className="font-bold">For your safety:</span> Do not negotiate prices or share payment details outside the app.
        </p>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className="bg-primary/90 text-white px-4 py-2 text-xs font-semibold text-center z-20">
          {notification}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center opacity-60 px-5 gap-4 pt-20"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <MessageSquare size={32} className="text-primary" strokeWidth={2} />
              </div>
              <h3 className="text-[18px] font-extrabold text-foreground tracking-tight">Start the Conversation</h3>
              <p className="text-[14px] font-medium text-muted-foreground max-w-[220px] leading-relaxed">
                Send a message or voice note to coordinate with your {role === 'customer' ? 'provider' : 'customer'}.
              </p>
            </motion.div>
          ) : (
            messages.map((msg: any, index: number) => {
              const isMe = msg.sender === "me";
              const isSystem = msg.senderRole === "system";

              if (isSystem) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index}
                    className="flex justify-center my-4"
                  >
                    <div className="bg-[#FEF2F2] border-2 border-[#FECACA] px-4 py-2.5 rounded-[16px] max-w-[85%] text-center shadow-sm">
                      <p className="text-[12px] text-[#991B1B] font-extrabold leading-snug">{msg.text}</p>
                      <p className="text-[10px] text-[#F87171] font-bold mt-1">{msg.time}</p>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  key={index}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="w-8 h-8 rounded-[12px] bg-primary/10 flex items-center justify-center text-primary font-black text-[12px] mr-3 mt-auto flex-shrink-0 shadow-sm">
                      {participantAvatar.charAt(0)}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
                    {msg.audioBase64 ? (
                      <div className={`rounded-[24px] p-3 shadow-sm flex items-center gap-3 min-w-[180px] ${isMe ? "bg-primary text-white rounded-br-[8px] rounded-tl-[8px]" : "bg-white border-2 border-transparent rounded-bl-[8px] rounded-tr-[8px]"}`}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            if (playingMsgIndex === index) {
                              previewAudioRef.current?.pause();
                              setPlayingMsgIndex(null);
                            } else {
                              if (previewAudioRef.current) {
                                previewAudioRef.current.src = msg.audioBase64;
                                previewAudioRef.current.play();
                                setPlayingMsgIndex(index);
                                previewAudioRef.current.onended = () => setPlayingMsgIndex(null);
                              }
                            }
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-[#F8FAFC]"}`}
                        >
                          {playingMsgIndex === index
                            ? <Pause size={16} className={isMe ? "text-white" : "text-primary"} strokeWidth={2.5} />
                            : <Play size={16} className={isMe ? "text-white ml-0.5" : "text-primary ml-0.5"} strokeWidth={2.5} />
                          }
                        </motion.button>
                        <div className="flex-1">
                          <div className={`flex items-center gap-1 mb-1 ${isMe ? "opacity-90" : "opacity-60"}`}>
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className={`rounded-full ${isMe ? "bg-white" : "bg-primary"}`}
                                style={{ width: 3, height: `${6 + Math.random() * 14}px` }} />
                            ))}
                          </div>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${isMe ? "text-white/80" : "text-muted-foreground"}`}>Voice note</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-[24px] px-5 py-3 shadow-sm ${isMe ? "bg-primary text-white rounded-br-[8px]" : "bg-white border-2 border-transparent rounded-bl-[8px] text-foreground"}`}>
                        <p className="text-[15px] leading-relaxed font-medium">{msg.text}</p>
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 px-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      <p className="text-[10px] text-muted-foreground font-bold">{msg.time}</p>
                      {isMe && (
                        <CheckCheck size={14} className={msg.isSeen ? "text-[#3B82F6]" : "text-[#CBD5E1]"} strokeWidth={2.5} />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* Typing Indicator */}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-[12px] bg-primary/10 flex items-center justify-center text-primary font-black text-[12px] mr-3 flex-shrink-0">
              {participantAvatar.charAt(0)}
            </div>
            <div className="bg-white border-2 border-transparent rounded-[24px] rounded-bl-[8px] px-4 py-3 shadow-sm flex items-center gap-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={previewAudioRef} className="hidden" />

      {/* Voice Preview Bar */}
      <AnimatePresence>
        {audioBlobUrl && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-4 bg-white border-t border-[#E1E8EF] flex items-center gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-20"
          >
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={discardRecording} className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center shadow-sm">
              <Trash2 size={20} className="text-[#EF4444]" strokeWidth={2.5} />
            </motion.button>
            <div className="flex-1 bg-[#F8FAFC] rounded-full h-12 flex items-center px-5 gap-4 border-2 border-transparent">
              <button onClick={() => {
                if (isPlayingPreview) {
                  previewAudioRef.current?.pause();
                  setIsPlayingPreview(false);
                } else {
                  if (previewAudioRef.current) {
                    previewAudioRef.current.src = audioBlobUrl;
                    previewAudioRef.current.play();
                    setIsPlayingPreview(true);
                    previewAudioRef.current.onended = () => setIsPlayingPreview(false);
                  }
                }
              }} className="text-primary">
                {isPlayingPreview ? <Pause size={20} strokeWidth={2.5} /> : <Play size={20} className="ml-0.5" strokeWidth={2.5} />}
              </button>
              <div className="flex-1 flex items-center gap-1">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="rounded-full bg-primary/40 flex-1" style={{ height: `${4 + Math.random() * 16}px` }} />
                ))}
              </div>
              <span className="text-[12px] font-black text-primary font-mono">{formatSeconds(recordingSeconds)}</span>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSendVoice} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-[0_8px_20px_rgba(249,115,22,0.3)]">
              <Send size={20} className="text-white -ml-0.5" strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      {!audioBlobUrl && (
        <div className="px-4 py-4 bg-white border-t border-[#E1E8EF] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-20">
          {isRecording ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 h-[52px]">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={discardRecording} className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                <Trash2 size={20} className="text-[#EF4444]" strokeWidth={2.5} />
              </motion.button>
              <div className="flex-1 bg-[#FEF2F2] border-2 border-[#FECACA] rounded-full h-12 flex items-center justify-center gap-3 shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-[14px] font-extrabold text-[#991B1B] font-mono">{formatSeconds(recordingSeconds)}</span>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={stopRecording} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Square size={16} className="text-white fill-white" />
              </motion.button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-3">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={startRecording} className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center text-primary transition-colors">
                <Mic size={22} strokeWidth={2.5} />
              </motion.button>
              <input
                ref={inputRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 h-12 bg-[#F8FAFC] border-2 border-transparent rounded-full px-5 text-[15px] font-medium text-foreground focus:outline-none focus:border-primary/20 focus:bg-white transition-all shadow-inner placeholder:font-bold placeholder:text-muted-foreground/60"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${message.trim() ? "bg-primary text-white shadow-[0_8px_20px_rgba(249,115,22,0.3)]" : "bg-[#F8FAFC] text-[#CBD5E1]"
                  }`}
              >
                <Send size={20} className={message.trim() ? "-ml-0.5" : ""} strokeWidth={2.5} />
              </motion.button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Chat;

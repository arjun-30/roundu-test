import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Send, Phone, MoreVertical, MessageSquare,
  Mic, Square, Trash2, Play, Pause, CheckCheck, Check, MicOff,
  Navigation
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProviderById } from "@/data/mockData";
import { socket } from "@/lib/socket";

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, bookings, providerRequests, chatHistories, dispatch } = useApp() as any;

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

  // 1. Resolve booking / request / participant details
  const booking = bookings.find((b: any) => String(b.id) === id || String(b.id) === String(id).replace('req-', ''));
  const request = providerRequests.find((r: any) => String(r.id) === id || String(r.id) === `req-${id}`);

  const roomId = booking?.id || (request?.id ? String(request.id).replace('req-', '') : null) || id || "";
  const messages = chatHistories[roomId] || [];

  let participantName = "User";
  let participantAvatar = "U";
  let participantPhone = "";

  if (role === "customer") {
    const providerId = booking?.providerId || booking?.provider_id;
    const providerDetails = booking?.providerDetails || (providerId ? getProviderById(providerId) : null);
    participantName = providerDetails?.name || "Provider";
    participantAvatar = typeof providerDetails?.avatar === "string" && providerDetails.avatar.length <= 2
      ? providerDetails.avatar
      : (providerDetails?.name?.charAt(0) || "P");
    participantPhone = providerDetails?.phone || "";
  } else if (role === "provider") {
    participantName = request?.customerName || booking?.customerName || "Customer";
    participantAvatar = participantName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "C";
    participantPhone = request?.customerPhone || booking?.customerPhone || "";
  }

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // 2. Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // 3. Join chat room & listen for typing
  useEffect(() => {
    if (!roomId) return;
    socket.emit("join_chat_room", { bookingId: String(roomId) });

    const handleTyping = (data: { bookingId: string; senderId: string }) => {
      if (String(data.bookingId) === String(roomId) && data.senderId !== user?.id) {
        setPartnerTyping(true);
        setTimeout(() => setPartnerTyping(false), 2500);
      }
    };
    socket.on("typing_indicator", handleTyping);
    return () => { socket.off("typing_indicator", handleTyping); };
  }, [roomId, user?.id]);

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
        // Convert to base64 for socket transport
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
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

  return (
    <div className="h-screen flex flex-col bg-[#F0F4F8] font-['DM_Sans',sans-serif]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3 bg-white border-b border-[#E1E8EF] shadow-sm z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-[#F5F8FB] border border-[#E1E8EF] flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} className="text-primary" />
        </button>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-md">
          {participantAvatar}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-foreground truncate">{participantName}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[10px] text-emerald-600 font-semibold">Active Booking</p>
          </div>
        </div>

        <button
          onClick={handleTrackBooking}
          className="w-9 h-9 rounded-xl bg-[#F5F8FB] border border-[#E1E8EF] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Navigation size={16} className="text-primary" />
        </button>
        <button
          onClick={handleCall}
          className="w-9 h-9 rounded-xl bg-[#F5F8FB] border border-[#E1E8EF] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Phone size={16} className="text-primary" />
        </button>
        <button className="w-9 h-9 rounded-xl bg-[#F5F8FB] border border-[#E1E8EF] flex items-center justify-center active:scale-95 transition-transform">
          <MoreVertical size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Safety Banner */}
      <div className="bg-orange-50 px-4 py-2 flex items-start gap-2 border-b border-orange-100 z-10 shadow-sm">
        <div className="mt-0.5 text-xs">⚠️</div>
        <p className="text-[11px] text-orange-800 font-medium leading-tight">
          <span className="font-bold">For your safety:</span> Do not negotiate prices or share payment details outside the app. Violations may lead to account suspension.
        </p>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className="bg-primary/90 text-white px-4 py-2 text-xs font-semibold text-center animate-fade-in z-20">
          {notification}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 px-5 gap-3 pt-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <MessageSquare size={28} className="text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Start the Conversation</h3>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Send a message or voice note to coordinate with your {role === 'customer' ? 'provider' : 'customer'}.
            </p>
          </div>
        ) : (
          messages.map((msg: any, index: number) => {
            const isMe = msg.sender === "me";
            const isSystem = msg.senderRole === "system";

            if (isSystem) {
              return (
                <div key={index} className="flex justify-center my-2 animate-fade-in">
                  <div className="bg-red-50 border border-red-100 px-3 py-2 rounded-xl max-w-[85%] text-center shadow-sm">
                    <p className="text-[11px] text-red-600 font-bold leading-snug">{msg.text}</p>
                    <p className="text-[9px] text-red-400 mt-0.5">{msg.time}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-msg-in`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px] mr-2 mt-auto flex-shrink-0">
                    {participantAvatar.charAt(0)}
                  </div>
                )}
                <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {msg.audioBase64 ? (
                    // Voice message bubble
                    <div className={`rounded-2xl p-3 shadow-sm flex items-center gap-3 min-w-[160px] ${isMe ? "bg-primary text-white rounded-br-none" : "bg-white border border-[#E1E8EF] rounded-bl-none"}`}>
                      <button
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-primary/10"}`}
                      >
                        {playingMsgIndex === index
                          ? <Pause size={14} className={isMe ? "text-white" : "text-primary"} />
                          : <Play size={14} className={isMe ? "text-white" : "text-primary"} />
                        }
                      </button>
                      <div className="flex-1">
                        <div className={`flex items-center gap-0.5 mb-1 ${isMe ? "opacity-70" : "opacity-40"}`}>
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className={`rounded-full ${isMe ? "bg-white" : "bg-primary"}`}
                              style={{ width: 2, height: `${4 + Math.random() * 12}px` }} />
                          ))}
                        </div>
                        <p className={`text-[9px] font-medium ${isMe ? "text-white/70" : "text-muted-foreground"}`}>Voice note</p>
                      </div>
                    </div>
                  ) : (
                    // Text message bubble
                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? "bg-primary text-white rounded-br-none" : "bg-white border border-[#E1E8EF] rounded-bl-none text-foreground"}`}>
                      <p className="text-[14px] leading-relaxed">{msg.text}</p>
                    </div>
                  )}
                  <div className={`flex items-center gap-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    <p className="text-[9px] text-muted-foreground font-medium">{msg.time}</p>
                    {isMe && (
                      <CheckCheck size={11} className="text-primary/60" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {partnerTyping && (
          <div className="flex justify-start animate-msg-in">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px] mr-2 flex-shrink-0">
              {participantAvatar.charAt(0)}
            </div>
            <div className="bg-white border border-[#E1E8EF] rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={previewAudioRef} className="hidden" />

      {/* Voice Preview Bar */}
      {audioBlobUrl && !isRecording && (
        <div className="px-4 py-3 bg-white border-t border-[#E1E8EF] flex items-center gap-3">
          <button onClick={discardRecording} className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <Trash2 size={16} className="text-red-500" />
          </button>
          <div className="flex-1 bg-[#F0F4F8] rounded-full h-10 flex items-center px-4 gap-3">
            <button
              onClick={() => {
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
              }}
              className="text-primary"
            >
              {isPlayingPreview ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="flex-1 flex items-center gap-0.5">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="rounded-full bg-primary/40 flex-1" style={{ height: `${4 + Math.random() * 14}px` }} />
              ))}
            </div>
            <span className="text-[11px] font-bold text-primary">{formatSeconds(recordingSeconds)}</span>
          </div>
          <button
            onClick={handleSendVoice}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      )}

      {/* Input Area */}
      {!audioBlobUrl && (
        <div className="px-4 py-3 bg-white border-t border-[#E1E8EF]">
          {isRecording ? (
            <div className="flex items-center gap-3 h-12">
              <button onClick={discardRecording} className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center active:scale-95">
                <MicOff size={16} className="text-red-500" />
              </button>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-full h-10 flex items-center px-4 gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[13px] font-bold text-red-600">Recording... {formatSeconds(recordingSeconds)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md active:scale-95 transition-transform"
              >
                <Square size={14} className="text-white fill-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 h-10 bg-white border border-[#E1E8EF] rounded-full px-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-shadow"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  message.trim() ? "bg-primary text-white active:scale-95 shadow-md" : "bg-[#F0F4F8] text-[#A0B0C0]"
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-msg-in { animation: msg-in 0.2s ease-out forwards; }
        @keyframes fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.25s ease forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Chat;

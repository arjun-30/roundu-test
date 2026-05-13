import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, ShieldCheck, Clock, Zap, Mic, Trash2, Square, Play, Pause, XCircle, X } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getServiceById } from "@/data/mockData";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useApp } from "@/context/AppContext";
import { uploadVoiceNote } from "@/lib/voiceUpload";

const BookService = () => {
  const { serviceId = "s1" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const service = getServiceById(serviceId);
  const { dispatch, bookingNotes, bookingVoiceNote, bookingVoiceNoteUrl } = useApp();

  // Restore previously entered data and detect cancellation
  const [desc, setDesc] = useState(bookingNotes || "");
  const [scheduleType, setScheduleType] = useState<"now" | "later" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

  // On mount: if we landed here via a cancellation, flag it
  useEffect(() => {
    if ((location.state as any)?.cancelled) {
      setIsCancelled(true);
      // Clear the router state so a refresh doesn't re-show the banner
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const recorder = useVoiceRecorder();

  const handleScheduleSelect = async (type: "now" | "later") => {
    if (!desc && !recorder.audioBlob) {
      setError("Please describe your issue first (text or voice)");
      return;
    }
    setError("");
    // Dismiss cancellation banner when user re-books
    setIsCancelled(false);
    setScheduleType(type);
    
    let uploadedUrl: string | undefined = undefined;
    if (recorder.audioBlob) {
      setIsUploading(true);
      try {
        uploadedUrl = await uploadVoiceNote(recorder.audioBlob);
      } catch (err) {
        setError("Failed to upload voice note. Please try again.");
        setIsUploading(false);
        setScheduleType(null);
        return;
      }
      setIsUploading(false);
    }

    // Save to global context
    dispatch({ 
      type: "SET_NOTES", 
      notes: desc, 
      voiceNote: !!recorder.audioBlob, 
      voiceNoteUrl: uploadedUrl 
    });
    
    if (type === "later") {
      navigate("/booking/date", {
        state: {
          serviceId,
          desc,
          hasVoiceNote: !!recorder.audioBlob,
          voiceNoteUrl: uploadedUrl
        }
      });
      return;
    }
    
    navigate(`/searching-providers/${serviceId}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans pb-6">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-20">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all mr-3"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold text-foreground leading-tight">Book Service</h1>
          <p className="text-[12px] text-secondary font-bold mt-0.5">{service?.label || "Electrician"}</p>
        </div>
        {/* Booking status badge in header */}
        {isCancelled && (
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-[8px] animate-fade-in">
            <XCircle size={13} />
            Cancelled
          </span>
        )}
      </div>

      {/* ── Cancellation Banner ── */}
      {isCancelled && (
        <div className="mx-5 mt-4 rounded-[16px] bg-red-50 border border-red-200 p-4 flex items-start gap-3 animate-slide-down relative">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-extrabold text-red-700 leading-tight">Request Cancelled</p>
            <p className="text-[12px] text-red-500 font-medium mt-1 leading-snug">
              You can edit and rebook this request anytime.
            </p>
          </div>
          <button
            onClick={() => setIsCancelled(false)}
            className="p-1 rounded-full hover:bg-red-100 transition-colors text-red-400"
            aria-label="Dismiss cancellation notice"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-6">
        
        {/* Description */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border">
           <h2 className="text-[14px] font-extrabold text-foreground mb-3 block">Problem Description</h2>
           
           {!recorder.isRecording && !recorder.audioBlob && (
             <div className="relative">
               <textarea
                 rows={4}
                 value={desc}
                 onChange={e => setDesc(e.target.value)}
                 placeholder="Describe your issue (e.g., switch not working, water leakage)"
                 className="w-full bg-background rounded-xl p-4 pr-12 text-[14px] font-medium text-foreground border-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
               />
               <button 
                 onClick={recorder.startRecording}
                 className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-primary text-white"
               >
                 <Mic size={16} />
               </button>
             </div>
           )}

           {recorder.isRecording && (
             <div className="mt-2 p-4 bg-red-50 rounded-xl flex items-center justify-between border border-red-100 animate-pulse">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                   <span className="text-[14px] font-bold text-red-600">Recording... {recorder.formatTime(recorder.duration)}</span>
                </div>
                <button 
                  onClick={recorder.stopRecording}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                >
                   <Square size={14} fill="currentColor" />
                </button>
             </div>
           )}

           {recorder.audioBlob && !recorder.isRecording && (
             <div className="mt-2 p-3 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-100 animate-fade-in">
                <div className="flex items-center gap-3">
                   <button 
                     onClick={recorder.playAudio}
                     className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
                   >
                      {recorder.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                   </button>
                   <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-foreground">Voice Note</span>
                      <span className="text-[11px] text-primary font-medium">
                        {recorder.isPlaying 
                          ? `${recorder.formatTime(recorder.playbackTime)} / ${recorder.formatTime(recorder.duration)}` 
                          : recorder.formatTime(recorder.duration)}
                      </span>
                   </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={recorder.deleteRecording}
                    className="p-2.5 text-muted-foreground hover:text-red-500 bg-white rounded-full shadow-sm"
                  >
                     <Trash2 size={16} />
                  </button>
                </div>
             </div>
           )}
           
           {(error || recorder.error) && (
             <p className="text-xs text-red-500 mt-2 ml-1">{error || recorder.error}</p>
           )}

           {isUploading && (
             <p className="text-xs text-primary mt-2 ml-1 animate-pulse">Uploading voice note...</p>
           )}
        </div>

        {/* Address */}
        <div>
           <h2 className="text-[14px] font-extrabold text-foreground mb-3 px-1 block">Service Location</h2>
           <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                 <MapPin size={18} className="text-secondary" />
              </div>
              <div className="flex-1">
                 <h3 className="font-bold text-[14px] text-foreground">Home</h3>
                 <p className="text-[12px] text-muted-foreground font-medium line-clamp-1 mt-0.5">123, Gandhi Nagar, Chennai</p>
              </div>
              <button className="text-[11px] uppercase tracking-wider font-extrabold text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                Change
              </button>
           </div>
        </div>

        {/* Schedule */}
        <div>
           <h2 className="text-[14px] font-extrabold text-foreground mb-3 px-1 block">Schedule Service</h2>
           <div className="flex gap-3">
              <button 
                onClick={() => handleScheduleSelect("now")}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[16px] border-2 transition-all ${scheduleType === 'now' ? 'bg-amber-500 border-amber-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)]' : 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm hover:bg-amber-100'}`}
              >
                <Zap size={18} className={scheduleType === 'now' ? 'text-white' : 'text-amber-500'} />
                <span className="font-bold text-[14px]">Quick Fix</span>
              </button>
              <button 
                onClick={() => handleScheduleSelect("later")}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[16px] border-2 transition-all ${scheduleType === 'later' ? 'bg-primary border-gray-900 text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)]' : 'bg-white border-border text-gray-600 shadow-sm hover:border-gray-200'}`}
              >
                <Clock size={18} />
                <span className="font-bold text-[14px]">Schedule</span>
              </button>
           </div>
        </div>

        <div className="flex gap-4 pt-2 justify-center">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-green-700 bg-green-50 px-3 py-1.5 rounded-[8px]"><ShieldCheck size={14}/> Verified Pros</span>
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 bg-secondary/10 px-3 py-1.5 rounded-[8px]"><Clock size={14}/> Fast Arrival</span>
        </div>

      </div>

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.35s ease-out both; }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out both; }
      `}</style>

    </div>
  );
};

export default BookService;

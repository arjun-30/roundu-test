import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, MapPin, ShieldCheck, Clock, Zap, Mic, Trash2, Square, Play, Pause, XCircle, X, Loader2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getServiceById } from "@/data/mockData";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useApp } from "@/context/AppContext";
import { uploadVoiceNote } from "@/lib/voiceUpload";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";
import LocationModal from "@/components/LocationModal";

const BookService = () => {
  const { serviceId = "s1" } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const service = getServiceById(serviceId);
  const { dispatch, user, bookingNotes, bookingVoiceNote, bookingVoiceNoteUrl } = useApp();
  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Restore previously entered data
  const [desc, setDesc] = useState(bookingNotes || "");

  // Auto-fetch GPS if address is missing
  const handleLocationFetched = useCallback(async (lat: number, lng: number) => {
    if (user.address) return; // Don't overwrite if already set
    
    dispatch({ type: "SET_CURRENT_LOCATION", lat, lng });
    setLocating(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result.address) {
        const shortAddr = result.area
          ? `${result.area}${result.city ? ", " + result.city : ""}`
          : result.address.split(",").slice(0, 2).join(",");
        dispatch({ type: "UPDATE_USER", user: { address: shortAddr } });
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      dispatch({ type: "UPDATE_USER", user: { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } });
    } finally {
      setLocating(false);
    }
  }, [dispatch, user.address]);

  const { loading: gpsLoading, refetch: manualRefetch } = useCurrentLocation(handleLocationFetched);
  const [scheduleType, setScheduleType] = useState<"now" | "later" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

  // Restored voice note playback
  const restoredAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isRestoredPlaying, setIsRestoredPlaying] = useState(false);
  const [restoredCleared, setRestoredCleared] = useState(false);

  const recorder = useVoiceRecorder();

  const showRestoredVoice =
    !restoredCleared &&
    bookingVoiceNote &&
    !!bookingVoiceNoteUrl &&
    !recorder.audioBlob;

  useEffect(() => {
    if (bookingVoiceNoteUrl && !restoredCleared) {
      const audio = new Audio(bookingVoiceNoteUrl);
      audio.onended = () => setIsRestoredPlaying(false);
      restoredAudioRef.current = audio;
    }
    return () => {
      restoredAudioRef.current?.pause();
      restoredAudioRef.current = null;
    };
  }, [bookingVoiceNoteUrl, restoredCleared]);

  const toggleRestoredPlay = () => {
    const audio = restoredAudioRef.current;
    if (!audio) return;
    if (isRestoredPlaying) {
      audio.pause();
      setIsRestoredPlaying(false);
    } else {
      audio.play();
      setIsRestoredPlaying(true);
    }
  };

  const deleteRestoredVoice = () => {
    restoredAudioRef.current?.pause();
    restoredAudioRef.current = null;
    setIsRestoredPlaying(false);
    setRestoredCleared(true);
    dispatch({ type: "SET_NOTES", notes: desc, voiceNote: false, voiceNoteUrl: undefined });
  };

  useEffect(() => {
    if ((routerLocation.state as any)?.cancelled) {
      setIsCancelled(true);
      window.history.replaceState({}, "");
    }
  }, [routerLocation.state]);

  const handleScheduleSelect = async (type: "now" | "later") => {
    if (!desc && !recorder.audioBlob && !showRestoredVoice) {
      setError("Please describe your issue first (text or voice)");
      return;
    }
    setError("");
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

    dispatch({ 
      type: "SET_NOTES", 
      notes: desc, 
      voiceNote: !!recorder.audioBlob || showRestoredVoice, 
      voiceNoteUrl: uploadedUrl || (showRestoredVoice ? (bookingVoiceNoteUrl ?? undefined) : undefined) 
    });
    
    if (type === "later") {
      navigate("/booking/date", {
        state: { serviceId, desc, hasVoiceNote: !!recorder.audioBlob, voiceNoteUrl: uploadedUrl }
      });
      return;
    }
    
    navigate(`/searching-providers/${serviceId}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans pb-6">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-20">
        <button 
          onClick={() => {
            if (isCancelled) {
              navigate(`/service-select/${serviceId}`);
            } else {
              navigate(-1);
            }
          }}
          className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all mr-3"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold text-foreground leading-tight">Book Service</h1>
          <p className="text-[12px] text-secondary font-bold mt-0.5">{service?.label || "Electrician"}</p>
        </div>
        {isCancelled && (
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-[8px] animate-fade-in">
            <XCircle size={13} />
            Cancelled
          </span>
        )}
      </div>

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
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-6">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border">
          <h2 className="text-[14px] font-extrabold text-foreground mb-1 block">Problem Description</h2>
          <p className="text-[11px] text-muted-foreground mb-3 font-medium">
            You can type and record voice notes together for better explanation.
          </p>

          {/* Text area — always visible */}
          <div className="relative">
            <textarea
              rows={4}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe your issue (e.g., switch not working, water leakage)"
              className="w-full bg-background rounded-xl p-4 pr-12 text-[14px] font-medium text-foreground border-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
            {/* Mic button — hidden while recording or audio already captured */}
            {!recorder.isRecording && !recorder.audioBlob && !showRestoredVoice && (
              <button
                onClick={recorder.startRecording}
                className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-primary text-white active:scale-95 shadow"
              >
                <Mic size={16} />
              </button>
            )}
          </div>

          {/* Recording in progress — shown below textarea */}
          {recorder.isRecording && (
            <div className="mt-3 p-4 bg-red-50 rounded-xl flex items-center justify-between border border-red-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-[14px] font-bold text-red-600">
                  Recording… {recorder.formatTime(recorder.duration)}
                </span>
              </div>
              <button
                onClick={recorder.stopRecording}
                className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"
              >
                <Square size={14} fill="currentColor" />
              </button>
            </div>
          )}

          {/* Newly recorded audio card — shown below textarea */}
          {recorder.audioBlob && !recorder.isRecording && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={recorder.playAudio}
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
                  >
                    {recorder.isPlaying
                      ? <Pause size={18} fill="currentColor" />
                      : <Play size={18} fill="currentColor" className="ml-1" />}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-foreground">Voice Note Attached</span>
                    <span className="text-[11px] text-primary font-medium">
                      {recorder.isPlaying
                        ? `${recorder.formatTime(recorder.playbackTime)} / ${recorder.formatTime(recorder.duration)}`
                        : recorder.formatTime(recorder.duration)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={recorder.deleteRecording}
                  className="p-2.5 text-muted-foreground hover:text-red-500 bg-white rounded-full shadow-sm transition-colors"
                  title="Delete and re-record"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Restored (previously saved) voice note — shown below textarea */}
          {showRestoredVoice && !recorder.isRecording && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleRestoredPlay}
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
                  >
                    {isRestoredPlaying
                      ? <Pause size={18} fill="currentColor" />
                      : <Play size={18} fill="currentColor" className="ml-1" />}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-foreground">Voice Note Attached</span>
                    <span className="text-[11px] text-primary font-medium">
                      Tap to {isRestoredPlaying ? "pause" : "play"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={deleteRestoredVoice}
                  className="p-2.5 text-muted-foreground hover:text-red-500 bg-white rounded-full shadow-sm transition-colors"
                  title="Delete voice note"
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
            <p className="text-xs text-primary mt-2 ml-1 animate-pulse">Uploading voice note…</p>
          )}
        </div>

        <div>
          <h2 className="text-[14px] font-extrabold text-foreground mb-3 px-1 block">Service Location</h2>
          <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border flex items-center gap-3">
            <button 
              onClick={() => manualRefetch()}
              className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0 hover:bg-secondary/20 transition-colors active:scale-95"
              title="Detect Location"
            >
              {locating || gpsLoading ? (
                <Loader2 size={18} className="text-secondary animate-spin" />
              ) : (
                <MapPin size={18} className="text-secondary" />
              )}
            </button>
            <div className="flex-1">
              <h3 className="font-bold text-[14px] text-foreground">Home</h3>
              <p className="text-[12px] text-muted-foreground font-medium line-clamp-1 mt-0.5">
                {locating || gpsLoading ? "Detecting..." : user.address || "Set Location"}
              </p>
            </div>
            <button 
              onClick={() => setIsLocationModalOpen(true)}
              className="text-[11px] uppercase tracking-wider font-extrabold text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
            >
              Change
            </button>
          </div>
        </div>

        <LocationModal 
          isOpen={isLocationModalOpen} 
          onClose={() => setIsLocationModalOpen(false)} 
        />

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
        @keyframes slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-down { animation: slide-down 0.35s ease-out both; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out both; }
      `}</style>
    </div>
  );
};

export default BookService;

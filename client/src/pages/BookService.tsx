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
import { motion, AnimatePresence } from "framer-motion";

const BookService = () => {
  const { serviceId = "s1" } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const service = getServiceById(serviceId);
  const { dispatch, user, bookingNotes, bookingVoiceNote, bookingVoiceNoteUrl } = useApp();
  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const lockedDescription = (routerLocation.state as any)?.lockedDescription;
  const isDescriptionLocked = typeof lockedDescription === "string" && lockedDescription.trim().length > 0;

  // Restore previously entered data
  const [desc, setDesc] = useState(isDescriptionLocked ? lockedDescription : bookingNotes || "");

  useEffect(() => {
    if (isDescriptionLocked) {
      setDesc(lockedDescription);
    }
  }, [isDescriptionLocked, lockedDescription]);

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
    
    sessionStorage.removeItem("searching_providers_state");
    sessionStorage.removeItem("searching_providers_scroll");
    navigate(`/searching-providers/${serviceId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] font-sans pb-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-20"
      >
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (isCancelled) {
              dispatch({ type: "RESET_BOOKING_DRAFT" });
              navigate("/home", { replace: true });
            } else {
              navigate(-1);
            }
          }}
          className="w-11 h-11 rounded-[16px] bg-[#F8FAFC] flex flex-shrink-0 items-center justify-center border-2 border-transparent hover:border-primary/10 transition-all shadow-sm mr-4"
        >
          <ArrowLeft size={22} className="text-primary" strokeWidth={2.5} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-[20px] font-extrabold text-foreground leading-tight tracking-tight">Book Service</h1>
          <p className="text-[13px] text-accent font-bold mt-0.5">{service?.label || "Electrician"}</p>
        </div>
        <AnimatePresence>
          {isCancelled && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-[8px]"
            >
              <XCircle size={13} />
              Cancelled
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {isCancelled && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="mx-5 overflow-hidden"
          >
            <div className="rounded-[16px] bg-red-50 border border-red-200 p-4 flex items-start gap-3 shadow-sm">
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
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-6"
      >
        <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent hover:border-primary/5 transition-colors">
          <h2 className="text-[16px] font-extrabold text-foreground mb-1 block tracking-tight">Problem Description</h2>
          <p className="text-[12px] text-muted-foreground mb-4 font-medium leading-relaxed">
            {isDescriptionLocked ? "This recommendation includes a fixed problem description." : "Type or record a voice note for better context."}
          </p>

          {/* Text area — always visible */}
          <div className="relative group">
            <textarea
              rows={4}
              value={desc}
              onChange={e => {
                if (!isDescriptionLocked) setDesc(e.target.value);
              }}
              readOnly={isDescriptionLocked}
              placeholder="Describe your issue (e.g., switch not working, water leakage)"
              className={`w-full bg-[#F8FAFC] rounded-[18px] p-4 pr-12 text-[14px] font-semibold text-primary border-2 border-transparent focus:border-accent/50 placeholder:text-primary/30 focus:outline-none transition-all resize-none shadow-inner ${isDescriptionLocked ? "cursor-default select-text" : ""}`}
            />
            {/* Mic button — hidden while recording or audio already captured */}
            {!isDescriptionLocked && !recorder.isRecording && !recorder.audioBlob && !showRestoredVoice && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={recorder.startRecording}
                className="absolute right-3 bottom-3 w-10 h-10 rounded-[14px] flex items-center justify-center transition-all bg-white text-accent hover:bg-accent hover:text-white shadow-md"
              >
                <Mic size={20} strokeWidth={2.5} />
              </motion.button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {/* Recording in progress — shown below textarea */}
            {recorder.isRecording && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-3 p-4 bg-red-50 rounded-[18px] flex items-center justify-between border border-red-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-[14px] font-extrabold text-red-600">
                    Recording… {recorder.formatTime(recorder.duration)}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={recorder.stopRecording}
                  className="w-10 h-10 rounded-[14px] bg-red-100 text-red-600 flex items-center justify-center"
                >
                  <Square size={16} fill="currentColor" />
                </motion.button>
              </motion.div>
            )}

            {/* Newly recorded audio card — shown below textarea */}
            {recorder.audioBlob && !recorder.isRecording && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-3 p-4 bg-accent/5 rounded-[18px] border border-accent/20 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={recorder.playAudio}
                      className="w-12 h-12 rounded-[16px] bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20"
                    >
                      {recorder.isPlaying
                        ? <Pause size={20} fill="currentColor" />
                        : <Play size={20} fill="currentColor" className="ml-1" />}
                    </motion.button>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-extrabold text-foreground leading-tight">Voice Note</span>
                      <span className="text-[12px] text-accent font-bold mt-0.5">
                        {recorder.isPlaying
                          ? `${recorder.formatTime(recorder.playbackTime)} / ${recorder.formatTime(recorder.duration)}`
                          : recorder.formatTime(recorder.duration)}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={recorder.deleteRecording}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-red-500 bg-white rounded-[14px] shadow-sm transition-colors"
                    title="Delete and re-record"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Restored (previously saved) voice note — shown below textarea */}
            {showRestoredVoice && !recorder.isRecording && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-3 p-4 bg-accent/5 rounded-[18px] border border-accent/20 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleRestoredPlay}
                      className="w-12 h-12 rounded-[16px] bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20"
                    >
                      {isRestoredPlaying
                        ? <Pause size={20} fill="currentColor" />
                        : <Play size={20} fill="currentColor" className="ml-1" />}
                    </motion.button>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-extrabold text-foreground leading-tight">Attached Note</span>
                      <span className="text-[12px] text-accent font-bold mt-0.5">
                        Tap to {isRestoredPlaying ? "pause" : "play"}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={deleteRestoredVoice}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-red-500 bg-white rounded-[14px] shadow-sm transition-colors"
                    title="Delete voice note"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(error || recorder.error) && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-red-500 mt-3 ml-1">{error || recorder.error}</motion.p>
          )}
          {isUploading && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-accent mt-3 ml-1 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Uploading voice note…
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-[16px] font-extrabold text-foreground mb-3 px-1 block tracking-tight">Service Location</h2>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => manualRefetch()}
              className="w-12 h-12 rounded-[16px] bg-accent/10 flex items-center justify-center flex-shrink-0 hover:bg-accent/20 transition-colors"
              title="Detect Location"
            >
              {locating || gpsLoading ? (
                <Loader2 size={20} className="text-accent animate-spin" />
              ) : (
                <MapPin size={20} className="text-accent" strokeWidth={2.5} />
              )}
            </motion.button>
            <div className="flex-1">
              <h3 className="font-extrabold text-[15px] text-foreground">Home</h3>
              <p className="text-[13px] text-muted-foreground font-medium line-clamp-1 mt-0.5">
                {locating || gpsLoading ? "Detecting..." : user.address || "Set Location"}
              </p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLocationModalOpen(true)}
              className="text-[11px] uppercase tracking-widest font-extrabold text-accent bg-accent/10 px-4 py-2.5 rounded-xl shadow-sm"
            >
              Change
            </motion.button>
          </div>
        </motion.div>

        <LocationModal 
          isOpen={isLocationModalOpen} 
          onClose={() => setIsLocationModalOpen(false)} 
        />

        <motion.div variants={itemVariants}>
          <h2 className="text-[16px] font-extrabold text-foreground mb-3 px-1 block tracking-tight">Schedule Service</h2>
          <div className="flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleScheduleSelect("now")}
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-[24px] border-2 transition-all relative overflow-hidden ${scheduleType === 'now' ? 'bg-accent border-transparent text-white shadow-[0_8px_30px_rgba(245,158,11,0.25)]' : 'bg-white border-transparent text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-accent/20'}`}
            >
              {scheduleType === 'now' && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />}
              <Zap size={24} className={scheduleType === 'now' ? 'text-white' : 'text-accent'} strokeWidth={2} />
              <span className="font-extrabold text-[15px]">Quick Fix</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleScheduleSelect("later")}
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-[24px] border-2 transition-all relative overflow-hidden ${scheduleType === 'later' ? 'bg-primary border-transparent text-white shadow-[0_8px_30px_rgba(21,46,75,0.25)]' : 'bg-white border-transparent text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-primary/20'}`}
            >
              {scheduleType === 'later' && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />}
              <Clock size={24} className={scheduleType === 'later' ? 'text-white' : 'text-primary'} strokeWidth={2} />
              <span className="font-extrabold text-[15px]">Schedule</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-4 pt-4 justify-center">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-3 py-2 rounded-xl"><ShieldCheck size={16}/> Verified Pros</span>
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-accent/90 bg-accent/10 px-3 py-2 rounded-xl"><Clock size={16}/> Fast Arrival</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BookService;

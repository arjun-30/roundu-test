import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { uploadVoiceNote } from "@/lib/voiceUpload";
import { toast } from "sonner";

const BookingNotes = () => {
  const navigate = useNavigate();
  const { selectedProvider, selectedDate, selectedTime, dispatch } = useApp();
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  const recorder = useVoiceRecorder(60); // 60 seconds max

  const handleNext = useCallback(async () => {
    let uploadedUrl: string | null = null;
    if (recorder.audioBlob) {
      setIsUploading(true);
      toast.info("Uploading voice note...");
      try {
        uploadedUrl = await uploadVoiceNote(recorder.audioBlob);
        toast.success("Voice note uploaded!");
      } catch (err) {
        toast.error("Failed to upload voice note. Please try again.");
        setIsUploading(false);
        return; // Stop flow
      }
      setIsUploading(false);
    }
    
    dispatch({ type: "SET_NOTES", notes, voiceNote: !!recorder.audioBlob, voiceNoteUrl: uploadedUrl || undefined });
    navigate("/booking/payment");
  }, [dispatch, navigate, notes, recorder.audioBlob]);

  if (!selectedProvider || !selectedDate || !selectedTime) {
    navigate("/booking/date", { replace: true });
    return null;
  }

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Step 3 of 3</p>
          <h1 className="text-lg font-bold text-foreground">Add Notes</h1>
        </div>
      </div>

      <div className="flex-1 px-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Help your provider understand the job better (optional).
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Switchboard isn't working in the kitchen..."
          rows={5}
          className="w-full p-4 rounded-2xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />

        {/* Voice Note Section */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-foreground">Voice Description (Optional)</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">60s max</span>
          </div>

          {!recorder.isRecording && !recorder.audioBlob ? (
            <button
              onClick={recorder.startRecording}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
            >
              <Mic size={18} />
              <span className="text-[13px] font-bold">Hold to Record Voice</span>
            </button>
          ) : recorder.isRecording ? (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-4 bg-red-50 rounded-xl border-2 border-red-200 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[13px] font-bold text-red-600">Recording... {recorder.formatTime(recorder.duration)}</span>
              </div>
              <button 
                onClick={recorder.stopRecording}
                className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white"
              >
                <Square size={16} fill="currentColor" />
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center gap-3 py-3 px-4 bg-primary/5 rounded-xl border border-primary/20">
              <button 
                onClick={recorder.playAudio}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm"
              >
                {recorder.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
              </button>
              <div className="flex-1">
                <span className="text-[12px] font-bold text-primary">
                  {recorder.isPlaying 
                    ? `${recorder.formatTime(recorder.playbackTime)} / ${recorder.formatTime(recorder.duration)}` 
                    : recorder.formatTime(recorder.duration)}
                </span>
              </div>
              <button 
                onClick={recorder.deleteRecording}
                className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
          
          {recorder.error && (
             <p className="text-xs text-red-500 mt-2">{recorder.error}</p>
          )}
        </div>



        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <h3 className="text-xs font-bold text-foreground mb-3">Booking Summary</h3>
          <SummaryRow label="Provider" value={selectedProvider.name} />
          <SummaryRow label="Date" value={selectedDate} />
          <SummaryRow label="Time" value={selectedTime} />
          <SummaryRow label="Rate" value={`₹${selectedProvider.pricePerHr}/hr`} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border">
        <button
          onClick={handleNext}
          disabled={isUploading}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Continue to Payment"}
        </button>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-semibold text-foreground">{value}</span>
  </div>
);

export default BookingNotes;

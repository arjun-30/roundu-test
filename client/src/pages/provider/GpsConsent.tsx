import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Check, ShieldAlert, Navigation, Settings } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const GpsConsent = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const [agreed, setAgreed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requestLocation = () => {
    if (!agreed) return;
    
    setSubmitting(true);
    // Simulate browser/device location request
    setTimeout(() => {
      // We'll simulate a 90% success rate, 10% denial for realism
      const isGranted = Math.random() > 0.1;
      
      if (isGranted) {
        navigate('/provider/pending-approval', { replace: true });
      } else {
        setDenied(true);
        setSubmitting(false);
      }
    }, 1500);
  };

  const openSettings = () => {
    setError("Please enable GPS in your device settings and try again.");
    setDenied(false); // Reset to let them try again
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft size={22} className="text-foreground" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground">Location Consent</h1>
        <span className="text-xs font-semibold text-muted-foreground">Step 5 of 6</span>
      </div>

      <div className="flex-1 p-5 pb-28 flex flex-col justify-center max-w-[400px] mx-auto w-full">
        
        <div className="flex justify-center mb-6 animate-fade-in-up">
          <div className="relative">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
              <MapPin size={36} className="text-primary" />
            </div>
            <div className="absolute top-0 right-0 w-6 h-6 bg-background rounded-full flex items-center justify-center shadow-sm">
              <Navigation size={12} className="text-accent" fill="currentColor" />
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm font-semibold text-center mb-4">{error}</div>}

        <h2 className="text-2xl font-extrabold text-foreground text-center mb-2 animate-fade-in-up">
          Enable 24/7 location tracking
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8 px-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          GPS allows us to send you jobs and provide safety for everyone.
        </p>

        <div className="space-y-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {[
            "We track your location to show you nearby jobs.",
            "Customers see your live location during active bookings.",
            "We monitor patterns to prevent off-app servicing.",
            "GPS data is auto-deleted after 90 days."
          ].map((point, i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check size={12} className="text-primary" strokeWidth={3} />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground">{point}</p>
            </div>
          ))}
        </div>

        {denied && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 flex gap-3 animate-fade-in">
            <ShieldAlert size={20} className="text-destructive shrink-0" />
            <div>
              <p className="text-sm font-bold text-destructive mb-1">GPS is required</p>
              <p className="text-xs text-destructive/80 mb-3">Without location access, you can't receive bookings.</p>
              <button 
                onClick={openSettings}
                className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:opacity-80 transition-opacity"
              >
                <Settings size={14} />
                <span>Enable in Settings</span>
              </button>
            </div>
          </div>
        )}

        <label className="flex items-start gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="pt-0.5 shrink-0">
            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${agreed ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
              {agreed && <Check size={14} className="text-primary-foreground" />}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-0.5 mt-0.5">I understand and consent</p>
            <p className="text-xs text-muted-foreground">
              By checking this, you agree to our <span className="text-primary font-semibold underline underline-offset-2">Privacy Policy</span>.
            </p>
            {/* hidden checkbox for accessibility/state binding */}
            <input 
              type="checkbox" 
              className="hidden" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
            />
          </div>
        </label>
      </div>

      {/* Footer / Continue button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border z-10">
        <button
          onClick={requestLocation}
          disabled={!agreed || submitting}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg ${
            (agreed && !submitting)
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 shadow-none'
          }`}
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-muted-foreground border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <span className="text-[15px] font-bold">Enable Location & Submit</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default GpsConsent;

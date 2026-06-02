import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Camera, MapPin, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { reverseGeocode } from '@/lib/mapProvider';
import { Geolocation } from '@capacitor/geolocation';

const EXPERIENCE_LEVELS = ["0-1", "1-3", "3-5", "5-10", "10+"];
const RADIUS_OPTIONS = [2, 5, 10, 15, 25, 50];
const WORKING_HOURS = [
  "All day",
  "Morning (6AM-12PM)",
  "Afternoon (12PM-6PM)",
  "Evening (6PM-10PM)",
  "Night (10PM-6AM)"
];

const PersonalDetails = () => {
  const navigate = useNavigate();
  const { user, providerRegistrationDraft, dispatch } = useApp();
  
  // Local form state mapped from draft
  const [bio, setBio] = useState(providerRegistrationDraft.bio || '');
  const [experience, setExperience] = useState(providerRegistrationDraft.experienceYears); // maps to index roughly or we store string
  const [expIndex, setExpIndex] = useState(EXPERIENCE_LEVELS.indexOf(providerRegistrationDraft.experienceYears > 10 ? "10+" : "1-3"));
  const [radiusIndex, setRadiusIndex] = useState(RADIUS_OPTIONS.indexOf(providerRegistrationDraft.serviceRadius || 5));
  const [workingHours, setWorkingHours] = useState(providerRegistrationDraft.workingHours || "All day");
  
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState(user.address || "");
  const [city, setCity] = useState("Bangalore");
  const [pincode, setPincode] = useState("");

  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setDetectError("");

    try {
      let permResult;
      try {
        permResult = await Geolocation.checkPermissions();
      } catch (e) {
        permResult = { location: 'prompt' };
      }

      if (permResult.location !== 'granted') {
        try {
          permResult = await Geolocation.requestPermissions();
        } catch (e) {
          permResult = { location: 'denied' };
        }
      }

      if (permResult.location !== 'granted') {
        setDetectError("Location access denied. Please enable permission.");
        setIsDetecting(false);
        return;
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const { latitude, longitude } = pos.coords;
      try {
        const result = await reverseGeocode(latitude, longitude);
        if (result.address) setAddress(result.address);
        if (result.city) setCity(result.city);
        if (result.pincode) setPincode(result.pincode);
      } catch (err) {
        console.error("Reverse geocoding error:", err);
        setDetectError("Failed to resolve address. Please enter manually.");
      } finally {
        setIsDetecting(false);
      }
    } catch (err: any) {
      console.error("Geolocation error:", err);
      let msg = "Failed to detect location. Please check settings.";
      if (err.message?.includes("denied")) {
        msg = "Location access denied. Please enable permission.";
      }
      setDetectError(msg);
      setIsDetecting(false);
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhotoUri(URL.createObjectURL(file));
    }
  };

  const handleNext = useCallback(() => {
    // Save draft items needed
    dispatch({
      type: "UPDATE_REGISTRATION_DRAFT",
      patch: {
        bio,
        workingHours,
        serviceRadius: RADIUS_OPTIONS[radiusIndex] !== -1 ? RADIUS_OPTIONS[radiusIndex] : 5,
        // map expIndex to approx years
        experienceYears: expIndex === 0 ? 1 : expIndex === 1 ? 2 : expIndex === 2 ? 4 : expIndex === 3 ? 7 : 11,
      }
    });
    // In real app, we'd dispatch user updates too
    navigate("/provider/digilocker-kyc");
  }, [bio, dispatch, expIndex, navigate, radiusIndex, workingHours]);
  const canProceed = dob && gender && address && city && pincode.length === 6;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canProceed && document.activeElement?.tagName !== "TEXTAREA") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canProceed, handleNext]);

  const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString().split('T')[0];
  const minDob = new Date(new Date().setFullYear(new Date().getFullYear() - 60)).toISOString().split('T')[0];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft size={22} className="text-foreground" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground">Personal Details</h1>
        <span className="text-xs font-semibold text-muted-foreground">Step 2 of 6</span>
      </div>

      <div className="flex-1 p-5 pb-28 space-y-7 overflow-y-auto">
        {/* Profile Photo */}
        <section className="flex flex-col flex-1 items-center animate-fade-in">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-muted border-4 border-card shadow-sm flex items-center justify-center overflow-hidden">
              {profilePhotoUri ? (
                <img src={profilePhotoUri} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">{user.name.charAt(0)}</span>
              )}
            </div>
            <button 
              onClick={() => profilePhotoRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-md active:scale-95 transition-transform"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={profilePhotoRef} 
              onChange={handleProfilePhotoUpload} 
              className="hidden" 
            />
          </div>
          <p className="mt-3 font-bold text-foreground text-lg">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.phone}</p>
        </section>

        {/* Basic Info */}
        <section className="space-y-4 animate-fade-in">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Basic Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Date of Birth *</label>
              <input 
                type="date" 
                value={dob}
                min={minDob}
                max={maxDob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Gender *</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Location</h3>
            <button 
              type="button"
              onClick={handleAutoDetect}
              disabled={isDetecting}
              className="text-xs font-bold text-primary flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDetecting ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Detecting...
                </>
              ) : (
                <>
                  <MapPin size={12} /> Auto-detect
                </>
              )}
            </button>
          </div>
          {detectError && (
            <p className="text-[11px] text-destructive font-bold mt-1 px-1">
              {detectError}
            </p>
          )}
          <input 
            type="text" 
            placeholder="Full Address *" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
          />
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="text" 
              placeholder="City / District *" 
              value={city}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[a-zA-Z\s]*$/.test(val)) {
                  setCity(val);
                }
              }}
              className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
            />
            <input 
              type="text" 
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN Code *" 
              value={pincode}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val) && val.length <= 6) {
                  setPincode(val);
                }
              }}
              className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
            />
          </div>
        </section>

        {/* Service Preferences */}
        <section className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Service Preferences</h3>
          
          {/* Experience */}
          <div>
            <label className="text-sm font-bold text-foreground mb-3 block">Experience (Years) *</label>
            <div className="flex gap-2">
              {EXPERIENCE_LEVELS.map((level, idx) => (
                <button
                  key={level}
                  onClick={() => setExpIndex(idx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    expIndex === idx 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground border border-border hover:bg-card'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <label className="text-sm font-bold text-foreground mb-3 block">Working Hours *</label>
            <div className="flex flex-wrap gap-2">
              {WORKING_HOURS.map((hour) => (
                <button
                  key={hour}
                  onClick={() => setWorkingHours(hour)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    workingHours === hour 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'bg-muted text-muted-foreground border border-border hover:bg-card'
                  }`}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div>
            <label className="text-sm font-bold text-foreground mb-3 block">Travel Radius (km) *</label>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((rad, idx) => (
                <button
                  key={rad}
                  onClick={() => setRadiusIndex(idx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    radiusIndex === idx 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-muted text-muted-foreground border border-border hover:bg-card'
                  }`}
                >
                  {rad}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">About You (Optional)</h3>
            <span className={`text-xs ${bio.length > 200 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
              {bio.length}/200
            </span>
          </div>
          <div>
            <textarea 
              placeholder="Tell customers about yourself (e.g. 5 years experience in home wiring. Fast and clean work.)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground min-h-[100px] resize-none"
              maxLength={220}
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg ${
            canProceed 
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 shadow-none'
          }`}
        >
          <span className="text-[15px] font-bold">Continue to KYC</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default PersonalDetails;

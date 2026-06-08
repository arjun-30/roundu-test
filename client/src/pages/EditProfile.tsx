import { ArrowLeft, Camera, User, Mail, Phone, Briefcase, Image as ImageIcon, Trash2, X, AlertCircle, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { updateUser, fetchProviderDashboard } from "@/lib/api";
import { toast } from "sonner";

import { services } from "@/data/mockData";

const EditProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, providerRegistrationDraft, dispatch, refreshLocation } = useApp();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (location.state?.from === "profile") {
      navigate("/provider/profile");
    } else {
      if (user.role === "provider") {
        navigate("/provider");
      } else {
        navigate("/profile");
      }
    }
  };

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || "hello@roundu.in");
  const [phone, setPhone] = useState(user.phone);
  const [emailError, setEmailError] = useState('');
  const [serviceId, setServiceId] = useState(providerRegistrationDraft?.serviceIds?.[0] || services[0].id);

  useEffect(() => {
    const fetchCurrentService = async () => {
      try {
        const response = await fetchProviderDashboard(user.id);
        if (response.success && response.data?.provider) {
          const fetchedServiceIds = response.data.provider.serviceIds || [];
          if (fetchedServiceIds.length > 0) {
            setServiceId(fetchedServiceIds[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch provider service ID for profile edit:", err);
      }
    };
    if (user.role === "provider" && user.id) {
      fetchCurrentService();
    }
  }, [user.role, user.id]);

  const [profilePicture, setProfilePicture] = useState(user.profilePicture || "");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState("");
  const [isFlashing, setIsFlashing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6"/><stop offset="100%" stop-color="%232563EB"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`;

  const PRESET_AVATARS = [
    {
      id: "blue",
      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6"/><stop offset="100%" stop-color="%231D4ED8"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23b)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`
    },
    {
      id: "orange",
      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="o" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23o)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`
    },
    {
      id: "teal",
      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="t" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23t)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`
    },
    {
      id: "purple",
      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238B5CF6"/><stop offset="100%" stop-color="%236D28D9"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23p)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`
    }
  ];

  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
        toast.success("Profile picture loaded!");
      };
      reader.readAsDataURL(file);
    }
    setShowActionSheet(false);
  };

  const startWebcam = async () => {
    setShowActionSheet(false);
    setShowWebcamModal(true);
    setWebcamError("");
    
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
        setWebcamStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Webcam access error", err);
        setWebcamError("Could not access camera. Opening native camera instead...");
        setTimeout(() => {
          closeWebcam();
          if (cameraInputRef.current) {
            cameraInputRef.current.click();
          }
        }, 1500);
      }
    }, 100);
  };

  const closeWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setShowWebcamModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth, video.videoHeight) || 480;
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const startX = (video.videoWidth - size) / 2 || 0;
        const startY = (video.videoHeight - size) / 2 || 0;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setProfilePicture(dataUrl);
        toast.success("Snapshot captured!");
      }

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      setTimeout(() => {
        closeWebcam();
      }, 300);
    }
  };

  const handleSave = async () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');

    try {
      await updateUser(user.id, { 
        name,
        email,
        phone,
        avatar_url: profilePicture,
        serviceIds: user.role === "provider" ? [serviceId] : undefined
      });
      dispatch({
        type: "UPDATE_USER",
        user: {
          name,
          email,
          phone,
          profilePicture,
          avatar_url: profilePicture,
        },
      });
      if (user.role === "provider" && providerRegistrationDraft) {
        dispatch({ 
          type: "UPDATE_REGISTRATION_DRAFT", 
          patch: { serviceIds: [serviceId] } 
        });
      }
      try {
        await refreshLocation();
      } catch (locErr) {
        console.warn("Auto location refresh failed during profile save:", locErr);
      }
      toast.success("Profile saved successfully!");
      navigate(-1);
    } catch (err) {
      console.error("Failed to save profile", err);
      toast.error("Unable to save profile. Try again.");
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all">
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-xl font-extrabold text-foreground">Edit Profile</h1>
        </div>
      </div>

      <div className="px-5 pt-8 flex flex-col items-center">
        {/* Hidden inputs for gallery selection and camera capture fallback */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          accept="image/*" 
          capture="user" 
          onChange={handleFileChange} 
          className="hidden" 
        />

        <button 
          onClick={() => setShowActionSheet(true)}
          className="relative mb-8 focus:outline-none group active:scale-95 transition-all"
          aria-label="Change profile picture"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center relative">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-white text-xl font-extrabold">
                {name ? name.charAt(0) : "U"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary border-2 border-white flex items-center justify-center shadow-sm active:scale-95 transition-transform group-hover:scale-105">
            <Camera size={13} className="text-white" />
          </div>
        </button>

        <div className="w-full space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">Full Name *</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">Email Address *</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
              />
              {emailError && (
                <p className="text-sm text-destructive mt-1 pl-11">{emailError}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">Phone Number (Verified)</label>
            <div className="relative opacity-60">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="tel" 
                value={phone}
                readOnly
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-bold text-foreground focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {user.role === "provider" && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">Primary Service *</label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select 
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm appearance-none"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleSave}
          className="w-full mt-10 py-3.5 rounded-xl bg-primary text-white font-bold text-[15px] shadow-[0_4px_14px_rgba(21,46,75,0.2)] hover:bg-[#1C3D63] active:scale-[0.98] transition-all"
        >
          Save Changes
        </button>
      </div>

      {/* ═══════ BOTTOM ACTION SHEET ═══════ */}
      {showActionSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
            onClick={() => setShowActionSheet(false)}
          />
          {/* Content Drawer */}
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl relative z-10 animate-slide-up flex flex-col gap-4 border-t border-gray-100 pb-8">
            {/* Top Handle bar */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />
            
            <h3 className="text-lg font-extrabold text-foreground text-center">Change Profile Picture</h3>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                onClick={startWebcam}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-gray-100 hover:bg-slate-50 active:scale-98 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Camera size={20} />
                </div>
                <span className="text-[13.5px] font-bold text-gray-700">Take Photo</span>
              </button>

              <button 
                onClick={() => {
                  setShowActionSheet(false);
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-gray-100 hover:bg-slate-50 active:scale-98 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <ImageIcon size={20} />
                </div>
                <span className="text-[13.5px] font-bold text-gray-700">Upload Gallery</span>
              </button>
            </div>

            {/* Preset Avatars Selection */}
            <div className="mt-2 border-t border-gray-50 pt-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center mb-3">Or choose a preset avatar</p>
              <div className="flex items-center justify-center gap-4">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => {
                      setProfilePicture(avatar.url);
                      setShowActionSheet(false);
                      toast.success(`Selected ${avatar.id} preset avatar!`);
                    }}
                    className="w-12 h-12 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-transform border-2 border-transparent hover:border-primary shadow-sm"
                  >
                    <img src={avatar.url} alt={`${avatar.id} preset`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {profilePicture && (
              <button 
                onClick={() => {
                  setProfilePicture("");
                  setShowActionSheet(false);
                  toast.success("Profile photo removed!");
                }}
                className="w-full mt-2 py-3.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-98 font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 size={16} />
                Remove Current Photo
              </button>
            )}

            <button 
              onClick={() => setShowActionSheet(false)}
              className="w-full mt-1 py-3.5 rounded-xl bg-slate-100 text-gray-600 hover:bg-slate-200 active:scale-98 font-bold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══════ WEBCAM CAMERA MODAL ═══════ */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between items-center p-6 select-none">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between mt-4">
            <span className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Sparkles size={12} className="text-yellow-400" />
              Live Camera
            </span>
            <button 
              onClick={closeWebcam}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Camera View Finder Frame */}
          <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-primary shadow-2xl flex items-center justify-center bg-slate-900 my-auto">
            {/* Live Video */}
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover scale-x-[-1]" 
            />
            
            {/* Circular Overlay Mask */}
            <div className="absolute inset-0 border-[16px] border-black/25 pointer-events-none rounded-full" />

            {/* Flash effect overlay */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-[110]" />
            )}

            {/* Loading / Error Fallbacks */}
            {webcamError && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
                <AlertCircle size={32} className="text-yellow-400 mb-2" />
                <p className="text-white text-xs font-semibold leading-relaxed px-2">{webcamError}</p>
              </div>
            )}
            
            {!webcamStream && !webcamError && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Starting Camera...</p>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="w-full flex flex-col items-center gap-6 mb-6">
            <p className="text-white/60 text-[11px] font-medium tracking-wide">Align your face inside the circle and snap</p>
            
            <div className="flex items-center justify-center gap-8">
              <button 
                onClick={closeWebcam}
                className="text-white/70 hover:text-white active:scale-95 text-xs font-bold uppercase tracking-wider px-4 py-2"
              >
                Cancel
              </button>
              
              <button 
                onClick={capturePhoto}
                disabled={!webcamStream}
                className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-all focus:outline-none ${
                  webcamStream ? "bg-white hover:bg-slate-100 shadow-xl" : "bg-white/30 cursor-not-allowed border-white/30"
                }`}
              >
                <div className="w-16 h-16 rounded-full border-2 border-slate-900" />
              </button>

              <div className="w-16 h-10" /> 
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EditProfile;

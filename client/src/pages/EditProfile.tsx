import { ArrowLeft, Camera, User, Mail, Phone, Briefcase } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";

import { services } from "@/data/mockData";
import AvatarDisplay from "@/components/AvatarDisplay";
import { persistProfileImage, uploadProfileImage, validateProfileImageFile } from "@/lib/profileImage";

const EditProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, providerRegistrationDraft, dispatch } = useApp();

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoButtonClick = () => {
    if (uploadingPhoto) return;
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      setPhotoError(validationError);
      return;
    }

    setPhotoError("");
    setUploadingPhoto(true);

    try {
      const imageUrl = await uploadProfileImage(file);
      if (user.id) {
        await persistProfileImage(user.id, imageUrl);
      }
      dispatch({ type: "UPDATE_USER", user: { photoURL: imageUrl, avatar_url: imageUrl } });
    } catch (error) {
      console.error("Profile image upload failed:", error);
      setPhotoError("Could not upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    dispatch({ type: "UPDATE_USER", user: { name, email, phone } });
    if (user.role === "provider" && providerRegistrationDraft) {
      dispatch({ 
        type: "UPDATE_REGISTRATION_DRAFT", 
        patch: { serviceIds: [serviceId] } 
      });
    }
    navigate(-1);
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
        <div className="relative mb-3">
          <div className="rounded-full border-4 border-white shadow-md bg-white">
            <AvatarDisplay photoURL={user.photoURL} name={name} size={96} showStatus={false} />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            onClick={handlePhotoButtonClick}
            disabled={uploadingPhoto}
            aria-label="Upload profile photo"
            className="absolute bottom-0 right-0 z-20 w-9 h-9 rounded-full bg-primary border-2 border-white flex items-center justify-center shadow-md hover:bg-[#1C3D63] active:scale-90 transition-all disabled:opacity-70 disabled:cursor-wait touch-manipulation"
          >
            {uploadingPhoto ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Camera size={15} className="text-white" />
            )}
          </button>
        </div>
        <div className="min-h-5 mb-5">
          {photoError && <p className="text-xs font-semibold text-destructive text-center">{photoError}</p>}
        </div>

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
    </div>
  );
};
export default EditProfile;

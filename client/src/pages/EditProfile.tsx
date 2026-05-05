import { ArrowLeft, Camera, User, Mail, Phone, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import { services } from "@/data/mockData";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, providerRegistrationDraft } = useApp();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || "hello@roundu.in");
  const [phone, setPhone] = useState(user.phone);
  const [serviceId, setServiceId] = useState(providerRegistrationDraft?.serviceIds?.[0] || services[0].id);

  const handleSave = () => {
    // API call would go here
    toast.success("Profile updated successfully!");
    navigate(-1);
  };

  return (
    <div className="min-h-full flex flex-col bg-[#F5F6FA] pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all">
            <ArrowLeft size={20} className="text-[#152E4B]" />
          </button>
          <h1 className="text-xl font-extrabold text-[#030916]">Edit Profile</h1>
        </div>
      </div>

      <div className="px-5 pt-8 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-[#152E4B] flex items-center justify-center border-4 border-white shadow-md">
            <span className="text-3xl font-extrabold text-white">{name.charAt(0)}</span>
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
            <Camera size={14} className="text-white" />
          </button>
        </div>

        <div className="w-full space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Full Name *</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Email Address *</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Phone Number (Verified)</label>
            <div className="relative opacity-60">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="tel" 
                value={phone}
                readOnly
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {user.role === "provider" && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Primary Service *</label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select 
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm appearance-none"
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
          className="w-full mt-10 py-3.5 rounded-xl bg-[#152E4B] text-white font-bold text-[15px] shadow-[0_4px_14px_rgba(21,46,75,0.2)] hover:bg-[#1C3D63] active:scale-[0.98] transition-all"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};
export default EditProfile;

import { useState } from "react";
import { ArrowLeft, ImagePlus, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const CATEGORIES = [
  "Booking Issue",
  "Payment Issue",
  "Provider Behavior",
  "App Bug",
  "Other"
];

const ReportIssue = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const [category, setCategory] = useState("Booking Issue");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = () => {
    if (!description.trim()) {
      setError("Please provide a description of the issue.");
      return;
    }
    setError("");

    setIsSubmitting(true);
    
    // Simulate API Call: supportApi.createTicket()
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess("Your issue has been submitted. Our team will contact you soon.");
      setTimeout(() => navigate(-1), 1500);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#EEF2F7] font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-20">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-3 hover:bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} className="text-[#152E4B]" />
        </button>
        <h1 className="text-[19px] font-extrabold text-[#030916]">Report an Issue</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24 space-y-5">
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-semibold">{success}</div>}
        
        {/* Category Dropdown */}
        <div>
          <label className="text-[14px] font-extrabold text-[#030916] mb-2 block px-1">Issue Category</label>
          <div className="relative">
             <button 
               onClick={() => setIsCategoryOpen(!isCategoryOpen)}
               className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] active:scale-[0.99] transition-all"
             >
                <span className="text-[14px] font-bold text-gray-800">{category}</span>
                <ChevronDown size={18} className="text-gray-400" />
             </button>
             {isCategoryOpen && (
               <div className="absolute top-[110%] left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden animate-fade-in">
                 {CATEGORIES.map(c => (
                   <button 
                     key={c}
                     onClick={() => { setCategory(c); setIsCategoryOpen(false); }}
                     className={`w-full text-left px-5 py-3.5 text-[14px] font-medium transition-colors ${category === c ? "bg-[#EEF2FB] text-[#1C3F8F] font-bold" : "text-gray-700 hover:bg-gray-50"}`}
                   >
                     {c}
                   </button>
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* Description Input */}
        <div>
           <label className="text-[14px] font-extrabold text-[#030916] mb-2 block px-1">Description <span className="text-red-500">*</span></label>
           <textarea
             rows={5}
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             placeholder="Please describe your issue in detail..."
             className="w-full bg-white rounded-2xl p-4 text-[14px] font-medium text-gray-900 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1C3F8F]/20 transition-all resize-none"
           />
        </div>

        {/* Screenshot Upload */}
        <div>
           <label className="text-[14px] font-extrabold text-[#030916] mb-2 block px-1">Upload Screenshot <span className="opacity-50 text-xs font-medium">(Optional)</span></label>
           <button className="w-[80px] h-[80px] rounded-[18px] border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-1 hover:border-[#1C3F8F]/40 hover:bg-[#EEF2FB] transition-colors shadow-sm">
               <ImagePlus size={22} className="text-gray-400" />
               <span className="text-[10px] font-bold text-gray-400">Max 3</span>
           </button>
        </div>

        {/* Contact Info (Auto-filled) */}
        <div className="pt-2">
           <label className="text-[14px] font-extrabold text-[#030916] mb-2 block px-1">Contact Info</label>
           <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
              <p className="text-[14px] font-bold text-gray-800">{user.name || "Customer"}</p>
              <p className="text-[12px] font-medium text-gray-500 mt-0.5">{user.phone || "No phone linked"} • {user.email || "No email linked"}</p>
           </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#F5F6FA] via-[#F5F6FA] to-transparent pt-10 pointer-events-none z-10">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full pointer-events-auto flex items-center justify-center py-[16px] rounded-[16px] transition-all shadow-sm ${
            isSubmitting 
              ? "bg-[#E2E8F0] text-gray-400 cursor-not-allowed" 
              : "bg-[#152E4B] text-white hover:bg-[#1C3D63] active:scale-[0.98] shadow-[#152E4B]/20 shadow-lg"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 font-extrabold text-[15px]">
              <Loader2 className="animate-spin" size={18} /> Submitting...
            </span>
          ) : (
            <span className="font-extrabold text-[15px]">Submit Issue</span>
          )}
        </button>
      </div>

    </div>
  );
};

export default ReportIssue;

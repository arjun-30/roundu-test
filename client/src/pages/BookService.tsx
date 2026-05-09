import { useState } from "react";
import { ArrowLeft, ImagePlus, MapPin, ShieldCheck, Clock, Zap, Mic, Trash2, Volume2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getServiceById } from "@/data/mockData";

const suggestions = [
  "Switch not working",
  "Fan repair",
  "Water leakage",
  "AC not cooling"
];

const BookService = () => {
  const { serviceId = "s1" } = useParams();
  const navigate = useNavigate();
  const service = getServiceById(serviceId);
  const [desc, setDesc] = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "later" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const [error, setError] = useState("");

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasVoiceNote(true);
    } else {
      setIsRecording(true);
    }
  };
  
  const handleScheduleSelect = (type: "now" | "later") => {
    if (!desc) {
      setError("Please describe your issue first");
      return;
    }
    setError("");
    setScheduleType(type);
    
    if (type === "later") {
      navigate("/booking/date", {
        state: {
          serviceId,
          desc
        }
      });
      return;
    }
    
    navigate(`/searching-providers/${serviceId}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F5F6FA] font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-20">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all mr-3"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">Book Service</h1>
          <p className="text-[12px] text-blue-600 font-bold mt-0.5">{service?.label || "Electrician"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-6">
        


        {/* Description */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
           <h2 className="text-[14px] font-extrabold text-gray-900 mb-3 block">Problem Description</h2>
           <div className="relative">
             <textarea
               rows={4}
               value={desc}
               onChange={e => setDesc(e.target.value)}
               placeholder="Describe your issue (e.g., switch not working, water leakage)"
               className="w-full bg-[#F5F6FA] rounded-xl p-4 pr-12 text-[14px] font-medium text-gray-900 border-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
             />
             <button 
               onClick={toggleRecording}
               className={`absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}
             >
               <Mic size={16} />
             </button>
           </div>
           {error && <p className="text-red-500 text-xs mt-2 ml-1">{error}</p>}

           {hasVoiceNote && (
             <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-100 animate-fade-in">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Volume2 size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-gray-900">Voice Note</span>
                      <span className="text-[10px] text-blue-600 font-medium">0:12 • Recorded</span>
                   </div>
                </div>
                <button 
                  onClick={() => setHasVoiceNote(false)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                   <Trash2 size={16} />
                </button>
             </div>
           )}

        </div>

        {/* Address */}
        <div>
           <h2 className="text-[14px] font-extrabold text-gray-900 mb-3 px-1 block">Service Location</h2>
           <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                 <MapPin size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                 <h3 className="font-bold text-[14px] text-gray-900">Home</h3>
                 <p className="text-[12px] text-gray-500 font-medium line-clamp-1 mt-0.5">123, Gandhi Nagar, Chennai</p>
              </div>
              <button className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                Change
              </button>
           </div>
        </div>

        {/* Schedule */}
        <div>
           <h2 className="text-[14px] font-extrabold text-gray-900 mb-3 px-1 block">Schedule Service</h2>
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
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[16px] border-2 transition-all ${scheduleType === 'later' ? 'bg-blue-600 border-gray-900 text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)]' : 'bg-white border-gray-100 text-gray-600 shadow-sm hover:border-gray-200'}`}
              >
                <Clock size={18} />
                <span className="font-bold text-[14px]">Schedule</span>
              </button>
           </div>
        </div>



        <div className="flex gap-4 pt-2 justify-center">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-green-700 bg-green-50 px-3 py-1.5 rounded-[8px]"><ShieldCheck size={14}/> Verified Pros</span>
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 bg-blue-50 px-3 py-1.5 rounded-[8px]"><Clock size={14}/> Fast Arrival</span>
        </div>

      </div>

    </div>
  );
};

export default BookService;

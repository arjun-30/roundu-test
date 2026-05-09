import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wrench, Droplets, Zap, Sparkles, Car, Paintbrush, Box, CheckCircle2, HelpCircle, ShieldCheck, Clock, ThumbsUp, Loader2 } from "lucide-react";
import { getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

// Icon mapper
const getProblemIcon = (str: string) => {
  const l = str.toLowerCase();
  if (l.includes("water") || l.includes("leak") || l.includes("tap") || l.includes("clog") || l.includes("drain")) return Droplets;
  if (l.includes("electric") || l.includes("wire") || l.includes("switch") || l.includes("trip") || l.includes("fan") || l.includes("power") || l.includes("light") || l.includes("fuse")) return Zap;
  if (l.includes("clean") || l.includes("wash") || l.includes("spa") || l.includes("dust")) return Sparkles;
  if (l.includes("car") || l.includes("drive")) return Car;
  if (l.includes("paint") || l.includes("color")) return Paintbrush;
  if (l.includes("install") || l.includes("setup")) return Box;
  return Wrench;
};

const ServiceSelection = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const service = getServiceById(serviceId || "");
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!service) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-10 text-center bg-[#EEF2F7]">
        <h2 className="text-lg font-bold text-[#030916] mb-2">Service not found</h2>
        <button onClick={() => navigate("/home")} className="text-[#152E4B] font-bold">Go back home</button>
      </div>
    );
  }

  const toggleSelection = (problem: string) => {
    setSelectedProblem(problem);
    
    // Auto-navigate to the next page
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      dispatch({ type: "SELECT_SERVICE", id: service.id });
      navigate(`/book-service/${service.id}`, { 
        state: { 
          serviceId: service.id,
          issue: problem 
        } 
      });
    }, 300);
  };

  // Mock expansion to closely emulate user's examples
  const getExtendedProblems = () => {
    const list = service.commonProblems ? [...service.commonProblems] : [];
    if (service.id === "plumber" && !list.includes("Drain cleaning")) list.push("Drain cleaning", "Pipe installation", "Low water pressure", "Bathtub repair");
    if (service.id === "electrician" && !list.includes("Power outage")) list.push("Power outage", "Light installation", "Wiring issue", "Fuse problem");
    if (!list.includes("Other")) list.push("Other");
    return list;
  }

  const problemsList = getExtendedProblems();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#EEF2F7] pb-6 font-sans text-[#030916]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-[#EEF2F7] sticky top-0 z-20">
        <button 
          onClick={() => navigate("/home")} 
          className="w-10 h-10 rounded-full bg-white flex flex-shrink-0 items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-[#152E4B]" />
        </button>
        <div>
          <h1 className="text-[20px] font-extrabold text-[#030916] leading-tight">{service.label}</h1>
          <p className="text-[13px] text-gray-500 font-medium">Fine-tune your request</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 space-y-6">
        
        {/* Section Title */}
        <div>
           <h2 className="text-[18px] font-extrabold text-[#030916]">What's the problem?</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-snug">Choose an issue to help us match the right expert</p>
        </div>

        {/* Dynamic Grid */}
        {problemsList.length > 0 && (
          <div className="grid grid-cols-2 gap-[14px]">
            {problemsList.map((problem) => {
              const isActive = selectedProblem === problem;
              const IconComponent = getProblemIcon(problem);
              
              return (
                <button
                  key={problem}
                  onClick={() => toggleSelection(problem)}
                  className={`flex flex-col items-start p-4 rounded-[18px] border-[1.5px] transition-all duration-150 relative shadow-sm text-left active:scale-[0.97] ${
                    isActive 
                      ? "border-[#152E4B] bg-[#E2E8F0]" 
                      : "border-transparent bg-white hover:border-[#152E4B]/10"
                  }`}
                >
                  {/* SVG Icon Top */}
                  <IconComponent size={24} className={`mb-3 ${isActive ? 'text-[#152E4B]' : 'text-[#152E4B]/70'}`} strokeWidth={1.8} />
                  
                  {/* Label */}
                  <span className={`text-[13.5px] font-bold leading-tight ${
                    isActive ? "text-[#152E4B]" : "text-[#030916]"
                  }`}>
                    {problem}
                  </span>

                  {/* Active Indicator Checkmark */}
                  {isActive && (
                     <div className="absolute top-[14px] right-[14px] animate-fade-in">
                        <CheckCircle2 size={18} className="text-[#F59E0B] fill-[#F59E0B]/20" strokeWidth={2.5} />
                     </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Helper Section */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-transparent flex items-start gap-3 mt-8">
           <div className="w-12 h-12 rounded-full bg-[#152E4B]/5 flex items-center justify-center flex-shrink-0">
               <HelpCircle size={22} className="text-[#A95D06]" strokeWidth={2.5} />
           </div>
           <div className="flex-1">
               <h3 className="text-[15px] font-extrabold text-[#030916]">Not sure what's wrong?</h3>
               <p className="text-[11px] text-gray-500 mt-1 mb-4 leading-relaxed">Our experts can help you identify the issue</p>
               <button className="bg-[#152E4B]/5 text-[#152E4B] text-[12px] font-extrabold tracking-wide uppercase px-4 py-2.5 rounded-xl active:scale-95 transition-all">
                  Get Help
               </button>
           </div>
        </div>

        {/* Trust Bar */}
        <div className="flex gap-4 items-end justify-between opacity-80 px-2 pt-2">
            <span className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-gray-500 text-center uppercase tracking-wide"><ShieldCheck size={26} className="text-[#A95D06] mb-1" strokeWidth={1.5}/> Verified Experts</span>
            <span className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-gray-500 text-center uppercase tracking-wide"><Clock size={26} className="text-[#152E4B] mb-1" strokeWidth={1.5}/> On-time Service</span>
            <span className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-gray-500 text-center uppercase tracking-wide"><ThumbsUp size={26} className="text-[#F59E0B] mb-1" strokeWidth={1.5}/> 100% Satisfaction</span>
        </div>
      </div>

    </div>
  );
};

export default ServiceSelection;

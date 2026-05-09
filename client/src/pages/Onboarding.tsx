import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Home, Users, Calendar, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { services } from "@/data/mockData";

const Onboarding = () => {
  const navigate = useNavigate();
  const { dispatch, onboardingData } = useApp();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Step 1: Services
  const [selectedServices, setSelectedServices] = useState<string[]>(onboardingData.serviceIds);
  
  // Step 2: Home Details
  const [homeType, setHomeType] = useState(onboardingData.homeType);
  const [householdSize, setHouseholdSize] = useState(onboardingData.householdSize);

  // Step 3: Frequency
  const [frequency, setFrequency] = useState(onboardingData.frequency);


  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => {
    if (step === 1 && selectedServices.length === 0) {
      setError("Please select at least one service");
      return;
    }
    if (step === 2 && (!homeType || !householdSize)) {
      setError("Please select both home type and household size");
      return;
    }
    if (step === 3 && !frequency) {
      setError("Please select your frequency");
      return;
    }
    setError("");
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    dispatch({
      type: "UPDATE_ONBOARDING",
      patch: {
        serviceIds: selectedServices,
        homeType,
        householdSize,
        frequency,
      },
    });
    dispatch({ type: "SET_NEW_USER", value: false });
    setSuccess("Profile personalized successfully!");
    setTimeout(() => navigate("/home", { replace: true }), 1000);
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const cardClass = (selected: boolean) => `
    relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center gap-3
    ${selected 
      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20" 
      : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
    }
  `;

  const optionClass = (selected: boolean) => `
    flex-1 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-center
    ${selected 
      ? "border-primary bg-primary/5 text-primary font-bold" 
      : "border-border bg-card hover:border-primary/30 text-muted-foreground font-semibold"
    }
  `;

  return (
    <div className="min-h-full flex flex-col bg-background relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-32 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />

      {/* Header & Progress */}
      <div className="px-6 pt-8 pb-4 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">R</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Onboarding</p>
            <p className="text-sm font-bold text-foreground">Step {step}/3</p>
          </div>
        </div>
        
        <div className="h-1.5 w-full bg-input rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 overflow-y-auto relative z-10">
        {error && <div className="mt-4 bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        {success && <div className="mt-4 bg-green-50 text-green-600 p-3 rounded-xl text-sm font-semibold">{success}</div>}
        
        {step === 1 && (
          <div className="animate-fade-in space-y-6 pt-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground leading-tight">
                What services do<br />you <span className="text-primary">need?</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">Select one or more categories</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {services.map((s) => (
                <div 
                  key={s.id} 
                  className={cardClass(selectedServices.includes(s.id))}
                  onClick={() => toggleService(s.id)}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedServices.includes(s.id) ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground"}`}>
                    <s.icon size={24} />
                  </div>
                  <span className={`text-xs font-bold text-center ${selectedServices.includes(s.id) ? "text-primary" : "text-foreground"}`}>
                    {s.label}
                  </span>
                  {selectedServices.includes(s.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-8 pt-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground leading-tight">
                Tell us about<br />your <span className="text-primary">home</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">Help us tailor provider matching</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Home size={12} /> Home Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Apartment", "Villa / House", "PG / Studio", "Office"].map(type => (
                    <div 
                      key={type}
                      onClick={() => setHomeType(type)}
                      className={optionClass(type === homeType)}
                    >
                      <span className="text-xs">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Users size={12} /> Household Size
                </label>
                <div className="flex gap-2">
                  {["1-2 People", "3-4 People", "5+ People"].map(size => (
                    <div 
                      key={size}
                      onClick={() => setHouseholdSize(size)}
                      className={optionClass(size === householdSize)}
                    >
                      <span className="text-xs">{size}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in space-y-8 pt-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground leading-tight">
                How <span className="text-primary">often</span> do you<br />need services?
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">We'll set reminders accordingly</p>
            </div>

            <div className="space-y-3">
              {[
                { label: "Daily", desc: "For regular upkeep and help", icon: Calendar },
                { label: "Weekly", desc: "Perfect for deep cleaning", icon: Calendar },
                { label: "Monthly", desc: "General maintenance & checks", icon: Calendar },
                { label: "Occasionally", desc: "Only when something breaks", icon: Calendar },
              ].map(opt => (
                <div 
                  key={opt.label}
                  onClick={() => setFrequency(opt.label)}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 cursor-pointer 
                    ${frequency === opt.label ? "border-primary bg-primary/5" : "border-border bg-card"}
                  `}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${frequency === opt.label ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground"}`}>
                    <opt.icon size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-bold ${frequency === opt.label ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                  {frequency === opt.label && <CheckCircle2 size={20} className="text-primary" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-10 left-0 right-0 px-6 z-20">
        <button
          onClick={nextStep}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {step === totalSteps ? "Get Started" : "Continue"}
          <ArrowRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Quick Navigation Steps */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
        {[1, 2, 3].map(s => (
          <div 
            key={s} 
            className={`h-1 rounded-full transition-all duration-300 ${s === step ? "w-6 bg-primary" : "w-2 bg-input"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Onboarding;

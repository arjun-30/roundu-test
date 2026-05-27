import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HelpCircle, ShieldCheck, Mail, Phone, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const GetHelp = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const service = getServiceById(serviceId || "");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!service) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-10 text-center bg-background">
        <h2 className="text-lg font-bold text-foreground mb-2">Service not found</h2>
        <button onClick={() => navigate("/home")} className="text-primary font-bold">Go back home</button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      setError("Please describe the problem you are facing.");
      return;
    }
    if (!contact.trim()) {
      setError("Please provide a contact number or email address.");
      return;
    }

    setError("");
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        dispatch({ type: "SELECT_SERVICE", id: service.id });
        navigate(`/book-service/${service.id}`, {
          state: {
            serviceId: service.id,
            issue: `Help Request: ${desc} (Contact: ${contact})`
          }
        });
      }, 1000);
    }, 1200);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] font-sans pb-10 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white shadow-sm sticky top-0 z-20 border-b border-slate-100/50"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-[16px] bg-[#F8FAFC] flex flex-shrink-0 items-center justify-center border-2 border-transparent hover:border-primary/10 transition-all shadow-sm"
          id="get-help-back-btn"
        >
          <ArrowLeft size={22} className="text-primary" strokeWidth={2.5} />
        </motion.button>
        <div>
          <h1 className="text-[20px] font-extrabold text-[#0F172A] leading-tight tracking-tight">Get Expert Help</h1>
          <p className="text-[12px] text-accent font-bold mt-0.5">{service.label} Diagnostic</p>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 px-5 pt-6 relative z-10 max-w-md mx-auto w-full flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          {/* Animated Hero Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col items-center text-center space-y-4"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-[28px] bg-primary/5 flex items-center justify-center text-primary relative z-10 shadow-inner">
                <HelpCircle size={36} strokeWidth={2} />
              </div>
              <div className="absolute inset-0 bg-primary/10 rounded-[28px] blur-xl -z-10 animate-pulse" />
            </div>
            
            <div>
              <h2 className="text-[20px] font-extrabold text-[#0F172A]">Not sure what's wrong?</h2>
              <p className="text-[13px] text-slate-500 mt-1 leading-relaxed max-w-[260px] mx-auto">
                No worries! Let our certified experts inspect and identify the exact problem for you.
              </p>
            </div>
          </motion.div>

          {/* Form Fields Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-5"
          >
            {/* Description Textarea */}
            <div className="space-y-2">
              <label htmlFor="problem-desc" className="text-[13px] font-extrabold text-slate-700 uppercase tracking-widest pl-1">
                Describe the problem
              </label>
              <textarea
                id="problem-desc"
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What symptoms or issues are you experiencing? (e.g., tap dripping, water not cooling, sparkling switch...)"
                className="w-full bg-[#F8FAFC] rounded-[20px] p-4 text-[14px] font-semibold text-slate-900 border border-slate-200 focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:outline-none transition-all resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Contact Input */}
            <div className="space-y-2">
              <label htmlFor="contact-info" className="text-[13px] font-extrabold text-slate-700 uppercase tracking-widest pl-1">
                Contact Information
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 pointer-events-none">
                  <Phone size={18} strokeWidth={2} />
                </div>
                <input
                  id="contact-info"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone number or Email address"
                  className="w-full bg-[#F8FAFC] rounded-[20px] pl-11 pr-4 py-4 text-[14px] font-semibold text-slate-900 border border-slate-200 focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 text-[13px] font-bold pl-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Trust Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-accent/5 rounded-[24px] p-4 border border-accent/10 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5 text-accent">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[13px] font-extrabold text-slate-800">100% Honest Diagnostics</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Our specialist will inspect, identify the root cause, and provide a transparent quote before any work starts.
              </p>
            </div>
          </motion.div>
        </form>

        {/* Bottom Actions Sticky Container */}
        <div className="pt-6 pb-4">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full py-4 rounded-[20px] bg-green-500 text-white font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <CheckCircle2 size={20} className="animate-bounce" />
                Setting up diagnostic booking...
              </motion.div>
            ) : (
              <motion.button
                key="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-[20px] bg-accent text-white font-extrabold text-[16px] shadow-[0_8px_30px_rgba(245,158,11,0.25)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.35)] transition-all disabled:opacity-60 relative overflow-hidden"
                id="get-help-submit-btn"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirm Diagnostic Request
                    <ArrowRight size={20} strokeWidth={2.5} />
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GetHelp;

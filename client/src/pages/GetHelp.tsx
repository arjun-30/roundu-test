import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Mail,
  Contact,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const GetHelp = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { user, dispatch } = useApp();

  const service = serviceId ? getServiceById(serviceId) : undefined;

  // Render Diagnostics form if service exists
  if (service) {
    const [desc, setDesc] = useState("");
    const [contact, setContact] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!desc.trim()) {
        setError("Please describe the problem you are facing.");
        return;
      }
      
      const contactVal = contact.trim();
      if (!contactVal) {
        setError("Please provide a contact number or email address.");
        return;
      }

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactVal);
      const cleanPhone = contactVal.replace(/[-\s()]/g, "");
      const isPhone = /^\+?[0-9]{10,14}$/.test(cleanPhone);

      if (!isEmail && !isPhone) {
        setError("Please enter a valid phone number or email address.");
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
                  className="w-full bg-[#F8FAFC] rounded-[20px] p-4 text-[14px] font-semibold text-slate-900 border border-slate-200 focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:outline-none transition-all resize-none placeholder:text-slate-500"
                />
              </div>

              {/* Contact Input */}
              <div className="space-y-2">
                <label htmlFor="contact-info" className="text-[13px] font-extrabold text-slate-700 uppercase tracking-widest pl-1">
                  Contact Information
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
                    <Contact size={18} strokeWidth={2} />
                  </div>
                  <input
                    id="contact-info"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone number or Email address"
                    className="w-full bg-[#F8FAFC] rounded-[20px] pl-11 pr-4 py-4 text-[14px] font-semibold text-slate-900 border border-slate-200 focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:outline-none transition-all placeholder:text-slate-500"
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
  }

  // Otherwise, render general Support form
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [description, setDescription] = useState("");

  // Touch/Interaction states
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync user details if they load after initial render
  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.email && !email) setEmail(user.email);
  }, [user]);

  // Validation functions
  const validatePhone = (num: string) => {
    return /^\d{10}$/.test(num.trim());
  };

  const validateEmail = (mail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());
  };

  // Live validation checks
  const isPhoneValid = validatePhone(phone);
  const isEmailValid = validateEmail(email);
  const isDescValid = description.trim().length >= 5;

  const isFormValid = isPhoneValid && isEmailValid && isDescValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Auto redirect to home after 2.5s
      setTimeout(() => {
        navigate("/home");
      }, 2500);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] pb-6 font-sans text-foreground relative overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white shadow-sm sticky top-0 z-20"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/home")}
          className="w-11 h-11 rounded-[16px] bg-[#F8FAFC] flex flex-shrink-0 items-center justify-center border-2 border-transparent hover:border-primary/10 transition-all shadow-sm"
        >
          <ArrowLeft size={22} className="text-primary" strokeWidth={2.5} />
        </motion.button>
        <div>
          <h1 className="text-[22px] font-extrabold text-foreground leading-tight tracking-tight">Get Help</h1>
          <p className="text-[13px] text-muted-foreground font-medium">Get support from our experts</p>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 relative z-10 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header Info Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 rounded-3xl p-5 shadow-[0_8px_30px_rgba(21,46,75,0.02)]"
          >
            <h2 className="text-[16px] font-extrabold text-foreground leading-snug">Need Assistance?</h2>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              Fill in your contact details and describe the problem you're facing. Our dedicated support team will review your request and get in touch with you shortly.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="space-y-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
          >
            {/* Phone input */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">
                Phone Number *
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    phoneTouched ? (isPhoneValid ? "text-emerald-500" : "text-red-500") : "text-muted-foreground"
                  }`}
                />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setPhoneTouched(true);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  className={`w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#F8FAFC] border-2 text-sm font-semibold text-foreground focus:outline-none transition-all ${
                    phoneTouched
                      ? isPhoneValid
                        ? "border-emerald-500/30 focus:border-emerald-500 focus:bg-white"
                        : "border-red-500/30 focus:border-red-500 focus:bg-white"
                      : "border-transparent focus:border-primary/20 focus:bg-white"
                  }`}
                />
                {phoneTouched && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isPhoneValid ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={18} className="text-red-500" />
                    )}
                  </div>
                )}
              </div>
              <AnimatePresence>
                {phoneTouched && !isPhoneValid && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-[11px] font-semibold text-red-500 mt-1.5 pl-1"
                  >
                    Please enter a valid 10-digit phone number.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Email input */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">
                Email Address *
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    emailTouched ? (isEmailValid ? "text-emerald-500" : "text-red-500") : "text-muted-foreground"
                  }`}
                />
                <input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailTouched(true);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  className={`w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#F8FAFC] border-2 text-sm font-semibold text-foreground focus:outline-none transition-all ${
                    emailTouched
                      ? isEmailValid
                        ? "border-emerald-500/30 focus:border-emerald-500 focus:bg-white"
                        : "border-red-500/30 focus:border-red-500 focus:bg-white"
                      : "border-transparent focus:border-primary/20 focus:bg-white"
                  }`}
                />
                {emailTouched && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isEmailValid ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={18} className="text-red-500" />
                    )}
                  </div>
                )}
              </div>
              <AnimatePresence>
                {emailTouched && !isEmailValid && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-[11px] font-semibold text-red-500 mt-1.5 pl-1"
                  >
                    Please enter a valid email address.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Description textarea */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2 block">
                Describe the problem *
              </label>
              <div className="relative">
                <MessageSquare
                  size={18}
                  className="absolute left-4 top-[18px] text-muted-foreground"
                />
                <textarea
                  placeholder="Tell us what you need help with..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDescTouched(true);
                  }}
                  onBlur={() => setDescTouched(true)}
                  rows={4}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#F8FAFC] border-2 text-sm font-semibold text-foreground focus:outline-none transition-all resize-none ${
                    descTouched && !isDescValid
                      ? "border-red-500/30 focus:border-red-500 focus:bg-white"
                      : "border-transparent focus:border-primary/20 focus:bg-white"
                  }`}
                />
              </div>
              <AnimatePresence>
                {descTouched && !isDescValid && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-[11px] font-semibold text-red-500 mt-1.5 pl-1"
                  >
                    Please describe the problem in at least 5 characters.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.form>
        </div>

        {/* Submit button at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <motion.button
            whileHover={isFormValid ? { scale: 1.02 } : {}}
            whileTap={isFormValid ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-[20px] font-extrabold text-[16px] shadow-lg transition-all ${
              isFormValid
                ? "bg-primary text-white hover:bg-primary/95 shadow-primary/20 active:scale-[0.98]"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Submitting Request...
              </>
            ) : (
              "Submit Help Request"
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 text-emerald-600">
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-[20px] font-extrabold text-foreground leading-tight">
                Request Submitted!
              </h3>
              <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                Thank you for reaching out. We have received your query and verified your details. A support specialist will contact you shortly.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-[12px] font-bold text-primary">Redirecting you home...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GetHelp;

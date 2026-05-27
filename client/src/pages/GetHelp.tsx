import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const GetHelp = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  // State values initialized with user details if present
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [description, setDescription] = useState("");

  // Touch/Interaction states
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validation functions
  const validatePhone = (num: string) => {
    // 10 digit number validation
    return /^\d{10}$/.test(num.trim());
  };

  const validateEmail = (mail: string) => {
    // Standard email check
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
            transition={{ duration: 0.5, delay: 0.2 }}
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

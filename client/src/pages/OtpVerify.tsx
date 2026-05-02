import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

const OtpVerify = () => {
  const navigate = useNavigate();
  const { phone, dispatch } = useApp();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) navigate("/login", { replace: true });
    refs.current[0]?.focus();
  }, [phone, navigate]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "Enter" && otp.join("").length === 6) handleVerify();
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    
    setLoading(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
      const response = await axios.post(`${apiUrl}/auth/verify-otp`, {
        phone,
        otp: otpCode
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store token
        if (token) {
          localStorage.setItem("roundu_token", token);
        }

        // Update Context
        dispatch({ type: "SET_AUTH", value: true });
        dispatch({ type: "SET_USER_ID", id: user.id });
        dispatch({ type: "UPDATE_USER", user: {
          name: user.name || "",
          email: user.email || "",
          address: user.address || "",
          role: user.role || "customer"
        }});

        toast.success("Verified successfully");
        
        // Check if onboarding is needed
        if (user.name) {
          navigate("/home", { replace: true });
        } else {
          navigate("/onboarding-name", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Verify Error:", err);
      toast.error(err.response?.data?.error || "Verification failed. Check the code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col px-6 py-8 bg-background">
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="mt-10 mb-8 animate-fade-in">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">Verify your number</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          We sent a 6-digit code to <span className="font-semibold text-foreground">+91 {phone}</span>
        </p>
      </div>

      <div className="flex gap-2 justify-center mb-6 animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
        {otp.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            className="w-11 h-14 text-center text-xl font-extrabold rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mb-6">
        Didn't get a code? <button className="font-semibold text-primary">Resend</button>
      </p>

      <button
        onClick={handleVerify}
        disabled={otp.join("").length < 6 || loading}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          "Verify & Continue"
        )}
      </button>

      <div className="mt-8 flex items-center gap-2 justify-center text-xs text-muted-foreground">
        <ShieldCheck size={14} className="text-success" />
        Secured with end-to-end encryption
      </div>
    </div>
  );
};

export default OtpVerify;

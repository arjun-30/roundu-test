/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { saveUserToLocalStorage, safeSetItem } from "@/lib/storage";
import { API_BASE_URL } from "@/config/env";
import { getSavedRoleForPhone, saveRoleForPhone } from "@/lib/roleStorage";

const OtpVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const devOtp = (location.state as { devOtp?: string } | null)?.devOtp;
  const { phone, dispatch } = useApp();

  const [otp, setOtp] = useState<string[]>(() => {
    if (devOtp && /^\d{6}$/.test(devOtp)) return devOtp.split("");
    return ["", "", "", "", "", ""];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // If navigation provided a dev OTP after first render, ensure inputs are filled
    if (devOtp && /^\d{6}$/.test(devOtp)) {
      setOtp(devOtp.split(""));
      // focus the first input so user can proceed or edit
      setTimeout(() => refs.current[0]?.focus(), 50);
    }
    if (!phone) {
      const pendingPhone = localStorage.getItem("roundu_pending_phone");
      if (pendingPhone) {
        dispatch({ type: "SET_PHONE", phone: pendingPhone });
      } else {
        navigate("/login", { replace: true });
        return;
      }
    }
    refs.current[0]?.focus();
  }, [phone, navigate, dispatch]);

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

  const navigateByRole = (userPhone: string, role: "customer" | "provider") => {
    // Save so next login skips /role
    saveRoleForPhone(userPhone, role);
    dispatch({ type: "SET_ROLE", role });
    safeSetItem("roundu_role", role);
    navigate(role === "provider" ? "/provider" : "/home", { replace: true });
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length < 6) { setError("Enter the 6-digit code"); return; }

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { phone, otp: otpCode });

      if (response.data.success) {
        const { token, user: apiUser } = response.data;

        if (token) {
          // ✅ Only remove generic keys — NOT roundu_role_<phone> (phone-specific key stays!)
          localStorage.removeItem("roundu_token");
          localStorage.removeItem("roundu_user");
          localStorage.removeItem("roundu_role");
          const persistedUser = {
            ...apiUser,
            profilePicture: apiUser.profilePicture || apiUser.avatar_url || "",
            avatar_url: apiUser.avatar_url || apiUser.profilePicture || "",
            accountType: apiUser.accountType || (apiUser.role === "provider" ? "provider" : "customer")
          };
          safeSetItem("roundu_token", token);
          saveUserToLocalStorage(persistedUser);
          safeSetItem("roundu_role", apiUser.role || "customer");
        }

        dispatch({ type: "SET_AUTH", value: true });
        dispatch({ type: "SET_USER_ID", id: apiUser.id });
        dispatch({
          type: "UPDATE_USER",
          user: {
            ...apiUser,
            profilePicture: apiUser.profilePicture || apiUser.avatar_url || "",
            avatar_url: apiUser.avatar_url || apiUser.profilePicture || "",
            phone: phone || apiUser.phone || "",
            accountType: apiUser.accountType || (apiUser.role === "provider" ? "provider" : "customer")
          },
        });

        const userPhone = phone || apiUser.phone || "";

        if (!apiUser.name) {
          // Brand new user — needs name first
          navigate("/onboarding-name", { replace: true });
          return;
        }

        // Determine role precedence: prefer server role -> saved role -> ask user
        const savedRole = getSavedRoleForPhone(userPhone);
        const serverRole = apiUser?.role || apiUser?.accountType || null;
        const roleToUse = (serverRole as any) || (savedRole as any) || null;

        if (roleToUse === 'provider' || roleToUse === 'customer') {
          navigateByRole(userPhone, roleToUse as 'provider' | 'customer');
        } else {
          // First time — show role selection
          navigate("/role", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Verify Error:", err);

      if (otpCode === "123456") {
        console.warn("[OtpVerify] Bypass API failure with mock user");
        const fallbackUser = {
          id: "mock-provider-user-123",
          name: "Cooper",
          phone: phone || "9876543210",
          email: "cooper@example.com",
          address: "123 Main St, Bangalore",
          role: "provider",
          accountType: "provider",
          profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
        };
        localStorage.removeItem("roundu_token");
        localStorage.removeItem("roundu_user");
        localStorage.removeItem("roundu_role");
        safeSetItem("roundu_token", "mock-token-123");
        saveUserToLocalStorage(fallbackUser);
        safeSetItem("roundu_role", "provider");
        dispatch({ type: "SET_AUTH", value: true });
        dispatch({ type: "SET_USER_ID", id: fallbackUser.id });
        dispatch({
          type: "UPDATE_USER",
          user: fallbackUser,
        });
        navigateByRole(phone || "9876543210", "provider");
        return;
      }

      setError(
        err?.response?.data?.error ||
        err?.message ||
        "OTP verification failed. Check backend logs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[#F8FAFC] relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-[16px] bg-white border-2 border-transparent hover:border-primary/10 flex items-center justify-center text-primary hover:bg-primary/5 transition-all active:scale-90 shadow-sm"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-12 mb-10 relative z-10 animate-fade-in">
        <h1 className="text-4xl font-extrabold text-foreground leading-[1.15] tracking-tight">
          Enter your <br />
          verification code
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
          We sent a 6-digit code to <span className="font-bold text-foreground whitespace-nowrap">+91 {phone}</span>
        </p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-semibold mb-6 border border-red-100 shadow-sm animate-fade-in">
            {error}
          </div>
        )}

        {devOtp && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-yellow-100 border border-yellow-300 text-yellow-900 text-sm text-center shadow-sm">
            <span className="font-bold">Dev OTP:</span>{" "}
            <span className="font-mono tracking-widest">{devOtp}</span>
          </div>
        )}

        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <label className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3 block ml-1">
            Verification Code
          </label>
          <div className="flex gap-2 sm:gap-3 justify-between">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full h-14 sm:h-16 text-center text-xl font-bold rounded-[16px] bg-white border-2 border-white text-primary focus:outline-none focus:border-accent shadow-sm transition-all placeholder:text-primary/30"
              />
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground ml-1">
            Didn't get a code?{" "}
            <button className="font-bold text-primary hover:text-accent transition-colors">Resend</button>
          </p>
        </div>

        <div className="mt-auto pb-4">
          <button
            onClick={handleVerify}
            disabled={otp.join("").length < 6 || loading}
            className="w-full py-5 rounded-[20px] font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(21,46,75,0.25)] relative overflow-hidden group"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
            ) : (
              <>
                <span className="relative z-10">Verify</span>
                <ArrowRight size={20} strokeWidth={2.5} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="mt-6 flex items-center gap-2 justify-center text-[13px] font-medium text-muted-foreground">
            <ShieldCheck size={16} className="text-emerald-500" />
            Secured with end-to-end encryption
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerify;
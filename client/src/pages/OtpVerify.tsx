/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
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
    localStorage.setItem("roundu_role", role);
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
          localStorage.setItem("roundu_token", token);
          localStorage.setItem("roundu_user", JSON.stringify(apiUser));
          localStorage.setItem("roundu_role", apiUser.role || "customer");
        }

        dispatch({ type: "SET_AUTH", value: true });
        dispatch({ type: "SET_USER_ID", id: apiUser.id });
        dispatch({
          type: "UPDATE_USER",
          user: {
            name: apiUser.name || "",
            email: apiUser.email || "",
            address: apiUser.address || "",
            photoURL: apiUser.photoURL || apiUser.avatar_url || null,
            avatar_url: apiUser.avatar_url || apiUser.photoURL || null,
            role: apiUser.role || "customer",
            phone: phone || "",
          },
        });

        const userPhone = phone || apiUser.phone || "";

        if (!apiUser.name) {
          // Brand new user — needs name first
          navigate("/onboarding-name", { replace: true });
          return;
        }

        // ✅ Check if this phone already has a saved role → skip /role screen
        const savedRole = getSavedRoleForPhone(userPhone);
        if (savedRole) {
          navigateByRole(userPhone, savedRole);
        } else {
          // First time — show role selection
          navigate("/role", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Verify Error:", err);

      // Development Fallback
      if (import.meta.env.DEV) {
        console.warn("[OtpVerify] Using Mock Login fallback");

        const mockUser = {
          id: "mock-user-" + Date.now(),
          name: "Test User",
          phone: phone || "9999999999",
          email: "",
          address: "",
          role: "customer",
        };

        localStorage.removeItem("roundu_token");
        localStorage.removeItem("roundu_user");
        localStorage.removeItem("roundu_role");
        localStorage.setItem("roundu_token", "mock-token");
        localStorage.setItem("roundu_user", JSON.stringify(mockUser));
        localStorage.setItem("roundu_role", "customer");

        dispatch({ type: "SET_AUTH", value: true });
        dispatch({ type: "SET_USER_ID", id: mockUser.id });
        dispatch({
          type: "UPDATE_USER",
          user: { name: mockUser.name, email: "", address: "", role: "customer" },
        });

        const userPhone = phone || "9999999999";
        const savedRole = getSavedRoleForPhone(userPhone);
        if (savedRole) {
          navigateByRole(userPhone, savedRole);
        } else {
          navigate("/role", { replace: true });
        }
      } else {
        setError(err.response?.data?.error || "Verification failed. Check the code.");
      }
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
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">
          Enter your verification code
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">+91 {phone}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold mb-4">
          {error}
        </div>
      )}

      {devOtp && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-100 border border-yellow-300 text-yellow-900 text-sm text-center">
          <span className="font-semibold">Dev OTP:</span>{" "}
          <span className="font-mono tracking-widest">{devOtp}</span>
        </div>
      )}

      <div
        className="flex gap-2 justify-center mb-6 animate-fade-in-up"
        style={{ animationDelay: "0.15s", opacity: 1 }}
      >
        {otp.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-11 h-14 text-center text-xl font-extrabold rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mb-6">
        Didn't get a code?{" "}
        <button className="font-semibold text-primary">Resend</button>
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

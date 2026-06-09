import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useApp();

  useEffect(() => {
    const t = setTimeout(() => {
      if (isAuthenticated) {
        navigate(role === "provider" ? "/provider" : "/home", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [navigate, isAuthenticated, role]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-[#0a0a0a] px-6">
      <div className="flex flex-col items-center gap-2 animate-fade-in-up" style={{ opacity: 0 }}>
        <img
          src="/logo.png"
          alt="RoundU"
          className="w-44 h-44 object-contain drop-shadow-2xl"
        />
      </div>
      <p className="text-xs text-white/40 mt-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        Trusted professionals, on demand.
      </p>
    </div>
  );
};

export default Splash;

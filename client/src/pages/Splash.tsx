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
    <div className="min-h-full flex flex-col items-center justify-center bg-background px-6">
      <div className="flex items-center gap-3 animate-fade-in-up" style={{ opacity: 0 }}>
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-card">
          <span className="text-primary-foreground font-extrabold text-3xl">R</span>
        </div>
        <span className="text-4xl font-extrabold text-foreground tracking-tight">Roundu</span>
      </div>
      <p className="text-xs text-muted-foreground mt-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        Trusted professionals, on demand.
      </p>
    </div>
  );
};

export default Splash;

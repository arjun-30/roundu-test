import { useState } from "react";
import { User, Wrench, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const RoleSelect = () => {
  const navigate = useNavigate();
  const { dispatch, user } = useApp();

  const [loading, setLoading] = useState(false);

  const select = async (role: "customer" | "provider") => {
    dispatch({ type: "SET_ROLE", role });
    if (role === "customer") {
      navigate("/onboarding", { replace: true });
    } else {
      // If local state says they are a provider, trust it
      if (user.role === "provider") {
        navigate("/provider", { replace: true });
        return;
      }
      
      // Otherwise, double-check the database just in case the local state is stale
      setLoading(true);
      try {
        const { fetchProviderDashboard } = await import("@/lib/api");
        const res = await fetchProviderDashboard(user.id);
        if (res.success) {
          dispatch({ type: "UPDATE_USER", user: { role: "provider" } });
          navigate("/provider", { replace: true });
          return;
        }
      } catch (err) {
        // Not a provider yet or error
      } finally {
        setLoading(false);
      }
      
      navigate("/provider/select-service", { replace: true });
    }
  };

  return (
    <div className="min-h-full flex flex-col px-6 py-10 bg-background">
      <div className="flex items-center gap-2 mb-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-extrabold text-lg">R</span>
        </div>
        <span className="text-2xl font-extrabold text-foreground tracking-tight">Roundu</span>
      </div>

      <div className="mt-8 mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">
          How would you like<br />to get started?
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Choose your role to personalize your experience
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <button
          onClick={() => select("customer")}
          className="group bg-primary rounded-2xl p-6 text-left transition-all duration-300 hover:bg-secondary hover:scale-[1.02] active:scale-[0.98] animate-fade-in-up shadow-card hover:shadow-xl hover:shadow-primary/20"
          style={{ animationDelay: "0.2s", opacity: 0 }}
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
              <User className="text-primary-foreground" size={28} />
            </div>
            <ArrowRight className="text-primary-foreground/60 group-hover:text-accent group-hover:translate-x-1 transition-all" size={20} />
          </div>
          <h3 className="text-xl font-bold text-primary-foreground mb-1">Customer</h3>
          <p className="text-sm text-primary-foreground/70 leading-relaxed">
            Find & book trusted professionals near you in minutes
          </p>
        </button>

        <button
          onClick={() => select("provider")}
          className="group bg-primary rounded-2xl p-6 text-left transition-all duration-300 hover:bg-secondary hover:scale-[1.02] active:scale-[0.98] animate-fade-in-up shadow-card hover:shadow-xl hover:shadow-primary/20 relative overflow-hidden"
          style={{ animationDelay: "0.35s", opacity: 0 }}
        >
          <span className="absolute top-4 right-4 text-[10px] font-extrabold px-2 py-1 rounded-md bg-accent text-accent-foreground tracking-wider z-10">
            PRO
          </span>
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
              <Wrench className="text-primary-foreground" size={28} />
            </div>
            <ArrowRight className="text-primary-foreground/60 group-hover:text-accent group-hover:translate-x-1 transition-all mt-8" size={20} />
          </div>
          <h3 className="text-xl font-bold text-primary-foreground mb-1">Service Provider</h3>
          <p className="text-sm text-primary-foreground/70 leading-relaxed">
            Grow your business by connecting with local customers
          </p>
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        By continuing, you agree to our Terms & Privacy Policy
      </p>
    </div>
  );
};

export default RoleSelect;

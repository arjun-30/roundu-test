import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { updateUser } from "@/lib/api";

const OnboardingName = () => {
  const navigate = useNavigate();
  const { user, dispatch } = useApp();
  const [name, setName] = useState(user.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleContinue = async () => {
    if (name.trim().length < 2) {
      setError("Please enter a valid name");
      return;
    }
    setError("");
    
    setLoading(true);
    try {
      await updateUser(user.id, { name });
      dispatch({ type: "UPDATE_USER", user: { name } });
      setSuccess(`Welcome, ${name.split(" ")[0]}!`);
      setTimeout(() => navigate("/role", { replace: true }), 1000);
    } catch (error) {
      setError("Failed to save name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col px-6 py-8 bg-background">
      <div className="mt-10 mb-8 animate-fade-in">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">
          What should we<br />
          <span className="text-primary">call you?</span>
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Enter your name for a personalized experience
        </p>
      </div>

      {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-semibold mb-4">{success}</div>}

      <div className="animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Full Name *
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <User size={18} />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleContinue();
            }}
            placeholder="John Doe"
            autoFocus
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base"
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={name.trim().length < 2 || loading}
        className="mt-6 w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-secondary animate-fade-in-up flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        style={{ animationDelay: "0.3s", opacity: 0 }}
      >
        {loading ? "Saving..." : "Continue"}
        {!loading && <ArrowRight size={18} />}
      </button>

      <div className="mt-auto pt-10 text-center animate-fade-in" style={{ animationDelay: "0.5s", opacity: 0 }}>
        <p className="text-xs text-muted-foreground">
          You can always change this later in your profile
        </p>
      </div>
    </div>
  );
};

export default OnboardingName;

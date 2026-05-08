import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { API_BASE_URL } from "@/config/env";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  phone: z.string().length(10, "Phone number must be exactly 10 digits").regex(/^\d+$/, "Must be numbers only"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, { phone: data.phone });

      if (response.data.success) {
        dispatch({ type: "SET_PHONE", phone: data.phone });
        if (response.data.devOtp) {
          toast.success(`Dev OTP: ${response.data.devOtp}`, { duration: 10000 });
        } else {
          toast.success("OTP sent successfully!");
        }
        navigate("/otp", { state: { devOtp: response.data.devOtp } });
      } else {
        toast.error(response.data.message || "Failed to send OTP");
      }
    } catch (err: any) {
      console.error('Send OTP Failed:', err);
      toast.error(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col px-6 py-8 bg-background">
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-90"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="mt-10 mb-8 animate-fade-in">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight tracking-tight">
          Welcome to<br />
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">Roundu</span>
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">Enter your phone number to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Phone Number *
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
              <Phone size={18} />
              <span className="text-sm font-semibold text-foreground">+91</span>
              <div className="w-px h-5 bg-border" />
            </div>
            <input
              type="tel"
              {...register("phone")}
              placeholder="Enter your number"
              className={`w-full pl-24 pr-4 py-4 rounded-2xl bg-input border ${errors.phone ? 'border-red-500 focus:ring-red-500/20' : 'border-border focus:ring-primary/30'} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all text-base`}
            />
          </div>
          {errors.phone && (
            <p className="text-red-500 text-[10px] mt-2 font-semibold ml-1">{errors.phone.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-secondary animate-fade-in-up flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30"
          style={{ animationDelay: "0.3s", opacity: 0 }}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Next
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

    </div>
  );
};

export default Login;


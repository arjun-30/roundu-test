import { useState } from "react";
<<<<<<< Updated upstream
import { User, ArrowRight, Briefcase, Check } from "lucide-react";
=======
import { User, ArrowRight, Briefcase } from "lucide-react";
>>>>>>> Stashed changes
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { checkProviderExists } from "@/lib/api";
import { motion } from "framer-motion";

const PRIMARY = "#17375E";

const GOLD_GRADIENT =
  "linear-gradient(135deg,#8B6B2E 0%,#D89B1D 55%,#F4B942 100%)";

const RoleSelect = () => {
  const navigate = useNavigate();

  const { dispatch, user } = useApp();

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

<<<<<<< Updated upstream
  const [selectedRole, setSelectedRole] = useState<
    "customer" | "provider" | null
  >(null);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const select = async (
    role: "customer" | "provider"
  ) => {
=======
  const select = async (role: "customer" | "provider") => {
    if (!agreed) return;

>>>>>>> Stashed changes
    dispatch({ type: "SET_ROLE", role });

    if (role === "customer") {
      navigate("/onboarding", {
        replace: true,
      });
    } else {
      if (user.role === "provider") {
        navigate("/provider", {
          replace: true,
        });

        return;
      }

      setLoading(true);

      try {
<<<<<<< Updated upstream
        const res =
          await checkProviderExists(user.id);
=======
        const res = await checkProviderExists(user.id);
>>>>>>> Stashed changes

        if (res.exists) {
          dispatch({
            type: "UPDATE_USER",
            user: { role: "provider" },
          });

<<<<<<< Updated upstream
          navigate("/provider", {
            replace: true,
          });

=======
          navigate("/provider", { replace: true });
>>>>>>> Stashed changes
          return;
        }
      } catch (err) {
        console.error(
          "Failed to check provider:",
          err
        );
      } finally {
        setLoading(false);
      }

<<<<<<< Updated upstream
      navigate("/provider/select-service", {
        replace: true,
      });
    }
  };

  return (
    <div
      className="min-h-screen px-5 py-7 relative overflow-hidden"
      style={{
        background: "#F8FAFC",
      }}
    >
      {/* BACKGROUND DOTS */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(#dbe3ec 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* CONTENT */}
      <div className="relative z-10 max-w-md mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">

          {/* LOGO */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md"
            style={{
              background: PRIMARY,
            }}
          >
            <span
              className="font-black text-sm"
              style={{
                color: "#FFFFFF",
              }}
            >
              R
            </span>
          </div>

          {/* DOTS */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-2 rounded-full"
                style={{
                  width: s === 2 ? 28 : 8,
                  background:
                    s === 2
                      ? PRIMARY
                      : "#CBD5E1",
                }}
              />
            ))}
          </div>

          <div className="w-11 h-11" />
        </div>

        {/* TITLE */}
        <div className="mb-8">
          <h1
            className="text-[34px] font-extrabold leading-[1.1]"
            style={{
              color: "#0F172A",
            }}
          >
            How would you like
            <br />
            to get{" "}
            <span className="bg-gradient-to-r from-[#8B6B2E] via-[#D89B1D] to-[#F4B942] bg-clip-text text-transparent">
              started?
            </span>
          </h1>

          <p
            className="text-[15px] mt-3 leading-relaxed"
            style={{
              color: "#64748B",
            }}
          >
            Choose your account path to customize your
            experience.
          </p>
        </div>

        {/* CARDS */}
        <div className="space-y-5">

          {/* CUSTOMER */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              setSelectedRole("customer")
            }
            className="w-full rounded-[28px] border bg-white p-6 text-left transition-all duration-300 relative"
            style={{
              borderColor:
                selectedRole === "customer"
                  ? "#C69214"
                  : "#E2E8F0",

              boxShadow:
                selectedRole === "customer"
                  ? "0 10px 30px rgba(198,146,20,0.12)"
                  : "0 4px 14px rgba(15,23,42,0.04)",
            }}
          >
            {/* CHECK */}
            <div
              className="absolute top-5 right-5 w-6 h-6 rounded-full border flex items-center justify-center"
              style={{
                borderColor:
                  selectedRole === "customer"
                    ? "#C69214"
                    : "#CBD5E1",

                background:
                  selectedRole === "customer"
                    ? GOLD_GRADIENT
                    : "#fff",
              }}
            >
              {selectedRole === "customer" && (
                <Check
                  size={12}
                  color="#fff"
                  strokeWidth={3}
                />
              )}
            </div>

            {/* ICON */}
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-5"
              style={{
                background: "#F8FAFC",
                color: "#64748B",
              }}
            >
              <User size={26} />
            </div>

            {/* TITLE */}
            <h3
              className="text-[28px] font-bold"
              style={{
                color: "#0F172A",
              }}
            >
              Customer
            </h3>

            {/* DESC */}
            <p
              className="text-[15px] mt-2 leading-relaxed"
              style={{
                color: "#64748B",
              }}
            >
              Book trusted professionals for home and
              personal services.
            </p>
          </motion.button>

          {/* PROVIDER */}
=======
      navigate("/provider/select-service", { replace: true });
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },

    visible: {
      opacity: 1,

      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },

    visible: {
      opacity: 1,
      y: 0,

      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as any;

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-[#F8FAFC] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="absolute bottom-[10%] left-[-15%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3 mb-6 relative z-10"
      >
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white font-extrabold text-xl tracking-tighter">
            R
          </span>
        </div>

        <span className="text-2xl font-extrabold text-foreground tracking-tight">
          RoundU
        </span>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col relative z-10"
      >
        {/* Heading */}
        <motion.div variants={itemVariants} className="mt-6 mb-10">
          <h1 className="text-[34px] font-extrabold text-foreground leading-[1.15] tracking-tight">
            How would you like
            <br />

            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              to get started?
            </span>
          </h1>

          <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed max-w-[280px]">
            Choose your role to personalize your experience on the platform.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="flex flex-col gap-5 flex-1">
          {/* Customer */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => select("customer")}
            disabled={!agreed || loading}
            className={`group relative bg-white rounded-[24px] p-6 text-left transition-all duration-300 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]
              ${agreed
                ? "hover:border-accent/20 hover:shadow-[0_20px_40px_rgb(245,158,11,0.1)]"
                : "opacity-60 cursor-not-allowed"
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-14 h-14 rounded-[18px] bg-primary/5 flex items-center justify-center mb-5">
                <User
                  className="text-primary"
                  size={28}
                  strokeWidth={2}
                />
              </div>

              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                <ArrowRight
                  className="text-muted-foreground"
                  size={16}
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h3 className="text-[20px] font-bold text-foreground mb-2 relative z-10">
              Find a Service
            </h3>

            <p className="text-[14px] text-muted-foreground leading-relaxed relative z-10">
              Book trusted local professionals for your home needs in minutes.
            </p>
          </motion.button>

          {/* Provider */}
>>>>>>> Stashed changes
          <motion.button
            whileTap={{ scale: 0.98 }}
<<<<<<< Updated upstream
            onClick={() =>
              setSelectedRole("provider")
            }
            className="w-full rounded-[28px] border bg-white p-6 text-left transition-all duration-300 relative"
            style={{
              borderColor:
                selectedRole === "provider"
                  ? "#C69214"
                  : "#E2E8F0",

              boxShadow:
                selectedRole === "provider"
                  ? "0 10px 30px rgba(198,146,20,0.12)"
                  : "0 4px 14px rgba(15,23,42,0.04)",
            }}
          >
            {/* CHECK */}
            <div
              className="absolute top-5 right-5 w-6 h-6 rounded-full border flex items-center justify-center"
              style={{
                borderColor:
                  selectedRole === "provider"
                    ? "#C69214"
                    : "#CBD5E1",

                background:
                  selectedRole === "provider"
                    ? GOLD_GRADIENT
                    : "#fff",
              }}
            >
              {selectedRole === "provider" && (
                <Check
                  size={12}
                  color="#fff"
                  strokeWidth={3}
                />
              )}
            </div>

            {/* ICON */}
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-5"
              style={{
                background: "#F8FAFC",
                color: "#64748B",
              }}
            >
              <Briefcase size={26} />
            </div>

            {/* TITLE */}
            <h3
              className="text-[28px] font-bold"
              style={{
                color: "#0F172A",
              }}
            >
              Service Provider
            </h3>

            {/* DESC */}
            <p
              className="text-[15px] mt-2 leading-relaxed"
              style={{
                color: "#64748B",
              }}
            >
              Offer your services and connect with nearby
              customers.
=======
            onClick={() => select("provider")}
            disabled={!agreed || loading}
            className={`group relative bg-white rounded-[24px] p-6 text-left transition-all duration-300 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]
              ${agreed
                ? "hover:border-primary/20 hover:shadow-[0_20px_40px_rgb(21,46,75,0.1)]"
                : "opacity-60 cursor-not-allowed"
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-14 h-14 rounded-[18px] bg-accent/10 flex items-center justify-center mb-5">
                <Briefcase
                  className="text-accent"
                  size={28}
                  strokeWidth={2}
                />
              </div>

              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                <ArrowRight
                  className="text-muted-foreground"
                  size={16}
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h3 className="text-[20px] font-bold text-foreground mb-2 relative z-10">
              Offer a Service
            </h3>

            <p className="text-[14px] text-muted-foreground leading-relaxed relative z-10">
              Grow your business by connecting with local customers instantly.
>>>>>>> Stashed changes
            </p>
          </motion.button>
        </div>

<<<<<<< Updated upstream
        {/* TERMS */}
        <div className="flex items-start gap-3 mt-7">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) =>
              setAcceptedTerms(
                e.target.checked
              )
            }
            className="mt-1 w-4 h-4 accent-[#17375E]"
          />

          <p
            className="text-[13px] leading-relaxed"
            style={{
              color: "#64748B",
            }}
          >
            By continuing, you agree to our{" "}
            <span
              style={{
                color: PRIMARY,
                fontWeight: 600,
              }}
            >
              Terms of Service
            </span>{" "}
            and{" "}
            <span
              style={{
                color: PRIMARY,
                fontWeight: 600,
              }}
            >
              Privacy Policy
            </span>
            .
          </p>
        </div>

        {/* BUTTON */}
        <button
          disabled={
            !selectedRole ||
            !acceptedTerms ||
            loading
          }
          onClick={() =>
            selectedRole &&
            select(selectedRole)
          }
          className="w-full mt-7 py-5 rounded-[24px] text-white font-bold text-[17px] flex items-center justify-center gap-3 transition-all duration-300"
          style={{
            background:
              selectedRole && acceptedTerms
                ? PRIMARY
                : "#CBD5E1",

            boxShadow:
              selectedRole && acceptedTerms
                ? "0 12px 30px rgba(23,55,94,0.22)"
                : "none",

            cursor:
              selectedRole && acceptedTerms
                ? "pointer"
                : "not-allowed",
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Continue</span>

              <ArrowRight
                size={20}
                strokeWidth={2.8}
              />
            </>
          )}
        </button>
      </div>
=======
        {/* Checkbox Section */}
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 mt-8 mb-4"
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary cursor-pointer"
          />

          <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">
            You agree to our Terms and Conditions and Privacy Policy
          </p>
        </motion.div>
      </motion.div>
>>>>>>> Stashed changes
    </div>
  );
};

export default RoleSelect;
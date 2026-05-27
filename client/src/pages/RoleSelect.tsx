import { useState } from "react";
import { User, ArrowRight, Briefcase, Check } from "lucide-react";
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

  const [selectedRole, setSelectedRole] = useState<
    "customer" | "provider" | null
  >(null);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const select = async (
    role: "customer" | "provider"
  ) => {
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
        const res =
          await checkProviderExists(user.id);

        if (res.exists) {
          dispatch({
            type: "UPDATE_USER",
            user: { role: "provider" },
          });

          navigate("/provider", {
            replace: true,
          });

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
          <motion.button
            whileTap={{ scale: 0.98 }}
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
            </p>
          </motion.button>
        </div>

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
    </div>
  );
};

export default RoleSelect;
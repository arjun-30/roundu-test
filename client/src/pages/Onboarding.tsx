import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Home,
  Users,
  Calendar,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { services } from "@/data/mockData";

import { motion, AnimatePresence } from "framer-motion";

const PRIMARY = "#17375E";
const LIGHT_BG = "#F6F7F9";

const GOLD_GRADIENT =
  "linear-gradient(135deg,#8B6B2E 0%,#D89B1D 55%,#F4B942 100%)";

const Onboarding = () => {
  const navigate = useNavigate();

  const { dispatch, onboardingData } = useApp();

  const [step, setStep] = useState(1);

  const [error, setError] = useState("");

  const [selectedServices, setSelectedServices] = useState<string[]>(
    onboardingData.serviceIds
  );

  const [homeType, setHomeType] = useState(
    onboardingData.homeType
  );

  const [householdSize, setHouseholdSize] = useState(
    onboardingData.householdSize
  );

  const [frequency, setFrequency] = useState(
    onboardingData.frequency
  );

  const totalSteps = 3;

  const nextStep = () => {
    if (step === 1 && selectedServices.length === 0) {
      setError("Please select at least one service");
      return;
    }

    if (step === 2 && (!homeType || !householdSize)) {
      setError("Please complete all selections");
      return;
    }

    if (step === 3 && !frequency) {
      setError("Please select frequency");
      return;
    }

    setError("");

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      dispatch({
        type: "UPDATE_ONBOARDING",
        patch: {
          serviceIds: selectedServices,
          homeType,
          householdSize,
          frequency,
        },
      });

      dispatch({
        type: "SET_NEW_USER",
        value: false,
      });

      navigate("/home", {
        replace: true,
      });
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id]
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: LIGHT_BG,
      }}
    >
      {/* HEADER */}
      <div className="px-7 pt-8 pb-5 flex items-center justify-between bg-white border-b border-slate-100">

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

        {/* STEP DOTS */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: s === step ? 32 : 8,
                background:
                  s === step
                    ? PRIMARY
                    : "#CBD5E1",
              }}
            />
          ))}
        </div>

        <div className="w-11 h-11" />
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-7 pb-8">

        {/* ERROR */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className="mt-6 px-5 py-4 rounded-3xl text-sm font-semibold border"
              style={{
                background: "#FEF2F2",
                borderColor: "#FECACA",
                color: "#DC2626",
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 1 */}
        {step === 1 && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="pt-8 space-y-8"
          >
            {/* TITLE */}
            <div>
              <h1
                className="text-[36px] font-extrabold tracking-tight leading-[1.05]"
                style={{
                  color: "#0F172A",
                }}
              >
                What services do
                <br />
                you{" "}
                <span className="bg-gradient-to-r from-[#8B6B2E] via-[#D89B1D] to-[#F4B942] bg-clip-text text-transparent">
                  need?
                </span>
              </h1>

              <p
                className="text-[15px] mt-3 leading-relaxed font-medium"
                style={{
                  color: "#64748B",
                }}
              >
                Select one or more categories
              </p>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 gap-6">
              {services.map((s) => {
                const isSelected =
                  selectedServices.includes(s.id);

                return (
                  <motion.button
                    key={s.id}
                    whileHover={{
                      scale: 1.02,
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() =>
                      toggleService(s.id)
                    }
                    className="relative overflow-hidden rounded-[30px] border p-6 flex flex-col items-center gap-5 transition-all duration-300"
                    style={{
                      background: "#FFFFFF",
                      borderColor: isSelected
                        ? "#C69214"
                        : "#E2E8F0",
                      boxShadow: isSelected
                        ? "0 10px 30px rgba(198,146,20,0.14)"
                        : "0 4px 14px rgba(15,23,42,0.04)",
                    }}
                  >
                    {/* CHECK */}
                    <div
                      className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isSelected
                          ? GOLD_GRADIENT
                          : "#F1F5F9",
                        color: isSelected
                          ? "white"
                          : "transparent",
                      }}
                    >
                      <Check
                        size={12}
                        strokeWidth={3}
                      />
                    </div>

                    {/* ICON */}
                    <div
                      className="w-16 h-16 rounded-[22px] flex items-center justify-center"
                      style={{
                        background: "#F8FAFC",
                        color: isSelected
                          ? "#C69214"
                          : "#64748B",
                        boxShadow:
                          "inset 0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <s.icon size={30} />
                    </div>

                    {/* LABEL */}
                    <span
                      className="text-[15px] font-bold text-center leading-snug"
                      style={{
                        color: "#1E293B",
                      }}
                    >
                      {s.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="pt-8 space-y-8">

            <div>
              <h1
                className="text-[36px] font-extrabold tracking-tight leading-[1.05]"
                style={{
                  color: "#0F172A",
                }}
              >
                Tell us about
                <br />
                your{" "}
                <span className="bg-gradient-to-r from-[#8B6B2E] via-[#D89B1D] to-[#F4B942] bg-clip-text text-transparent">
                  home
                </span>
              </h1>

              <p
                className="text-[15px] mt-3 leading-relaxed font-medium"
                style={{
                  color: "#64748B",
                }}
              >
                Help us tailor provider matching
              </p>
            </div>

            {/* HOME TYPE */}
            <div className="bg-white rounded-[30px] border border-slate-200 p-6 shadow-sm">
              <label
                className="text-[11px] font-bold uppercase tracking-[0.25em] flex items-center gap-2 mb-5"
                style={{
                  color: "#64748B",
                }}
              >
                <Home size={14} />
                Home Type
              </label>

              <div className="grid grid-cols-2 gap-4">
                {[
                  "Apartment",
                  "Villa / House",
                  "PG / Studio",
                  "Office",
                ].map((type) => {
                  const isSelected =
                    homeType === type;

                  return (
                    <button
                      key={type}
                      onClick={() =>
                        setHomeType(type)
                      }
                      className="rounded-[22px] border p-5 font-bold text-[15px] transition-all duration-300"
                      style={{
                        background: "#fff",
                        color: "#1E293B",
                        borderColor: isSelected
                          ? "#C69214"
                          : "#E2E8F0",
                        boxShadow: isSelected
                          ? "0 10px 25px rgba(198,146,20,0.12)"
                          : "none",
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HOUSEHOLD */}
            <div className="bg-white rounded-[30px] border border-slate-200 p-6 shadow-sm">
              <label
                className="text-[11px] font-bold uppercase tracking-[0.25em] flex items-center gap-2 mb-5"
                style={{
                  color: "#64748B",
                }}
              >
                <Users size={14} />
                Household Size
              </label>

              <div className="grid grid-cols-2 gap-4">
                {[
                  "1–2 People",
                  "3–4 People",
                  "5+ People",
                ].map((size) => {
                  const isSelected =
                    householdSize === size;

                  return (
                    <button
                      key={size}
                      onClick={() =>
                        setHouseholdSize(size)
                      }
                      className="rounded-[22px] border p-5 font-bold text-[15px] transition-all duration-300"
                      style={{
                        background: "#fff",
                        color: "#1E293B",
                        borderColor: isSelected
                          ? "#C69214"
                          : "#E2E8F0",
                        boxShadow: isSelected
                          ? "0 10px 25px rgba(198,146,20,0.12)"
                          : "none",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="pt-8 space-y-8">

            <div>
              <h1
                className="text-[36px] font-extrabold tracking-tight leading-[1.05]"
                style={{
                  color: "#0F172A",
                }}
              >
                How often do
                <br />
                you need{" "}
                <span className="bg-gradient-to-r from-[#8B6B2E] via-[#D89B1D] to-[#F4B942] bg-clip-text text-transparent">
                  services?
                </span>
              </h1>

              <p
                className="text-[15px] mt-3 leading-relaxed font-medium"
                style={{
                  color: "#64748B",
                }}
              >
                We’ll set reminders accordingly
              </p>
            </div>

            <div className="space-y-5">
              {[
                {
                  label: "Daily",
                  desc: "For regular upkeep and help",
                },
                {
                  label: "Weekly",
                  desc: "Perfect for deep cleaning",
                },
                {
                  label: "Monthly",
                  desc: "General maintenance & checks",
                },
                {
                  label: "Occasionally",
                  desc: "Only when something breaks",
                },
              ].map((item) => {
                const isSelected =
                  frequency === item.label;

                return (
                  <button
                    key={item.label}
                    onClick={() =>
                      setFrequency(item.label)
                    }
                    className="w-full rounded-[28px] border p-5 flex items-center gap-5 transition-all duration-300"
                    style={{
                      background: "#fff",
                      borderColor: isSelected
                        ? "#C69214"
                        : "#E2E8F0",
                      boxShadow: isSelected
                        ? "0 10px 30px rgba(198,146,20,0.12)"
                        : "0 4px 14px rgba(15,23,42,0.04)",
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-[20px] flex items-center justify-center"
                      style={{
                        background: "#F8FAFC",
                        color: isSelected
                          ? "#C69214"
                          : "#64748B",
                      }}
                    >
                      <Calendar size={26} />
                    </div>

                    <div className="flex-1 text-left">
                      <p
                        className="text-[18px] font-bold"
                        style={{
                          color: "#0F172A",
                        }}
                      >
                        {item.label}
                      </p>

                      <p
                        className="text-[13px] mt-1"
                        style={{
                          color: "#64748B",
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>

                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: isSelected
                          ? GOLD_GRADIENT
                          : "#F1F5F9",
                        color: isSelected
                          ? "white"
                          : "transparent",
                      }}
                    >
                      <Check
                        size={12}
                        strokeWidth={3}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-7 pt-4 pb-8 bg-transparent">
        <button
          onClick={nextStep}
          className="w-full py-5 rounded-[26px] text-white font-bold text-[17px] flex items-center justify-center gap-3 transition-all duration-300"
          style={{
            background: PRIMARY,
            boxShadow:
              "0 12px 30px rgba(23,55,94,0.22)",
          }}
        >
          <span>
            {step === totalSteps
              ? "Get Started"
              : "Continue"}
          </span>

          <ArrowRight
            size={20}
            strokeWidth={2.8}
          />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
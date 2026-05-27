import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Wrench,
  Droplets,
  Zap,
  Sparkles,
  Car,
  Paintbrush,
  Box,
  ShieldCheck,
  Clock,
  ThumbsUp,
  Loader2,
  ArrowRight,
  Check,
  HelpCircle,
} from "lucide-react";

import { getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

/* =========================================
   ICON MAPPER
========================================= */

const getProblemIcon = (str: string) => {
  const l = str.toLowerCase();

  if (
    l.includes("water") ||
    l.includes("leak") ||
    l.includes("tap") ||
    l.includes("clog") ||
    l.includes("drain")
  )
    return Droplets;

  if (
    l.includes("electric") ||
    l.includes("wire") ||
    l.includes("switch") ||
    l.includes("trip") ||
    l.includes("fan") ||
    l.includes("power") ||
    l.includes("light") ||
    l.includes("fuse")
  )
    return Zap;

  if (
    l.includes("clean") ||
    l.includes("wash") ||
    l.includes("spa") ||
    l.includes("dust")
  )
    return Sparkles;

  if (
    l.includes("car") ||
    l.includes("drive")
  )
    return Car;

  if (
    l.includes("paint") ||
    l.includes("color")
  )
    return Paintbrush;

  if (
    l.includes("install") ||
    l.includes("setup")
  )
    return Box;

  return Wrench;
};

/* =========================================
   COMPONENT
========================================= */

const ServiceSelection = () => {

  const { serviceId } = useParams();

  const navigate = useNavigate();

  const { dispatch } = useApp();

  const service = getServiceById(serviceId || "");
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpDesc, setHelpDesc] = useState("");
  const [helpContact, setHelpContact] = useState("");

  /* =========================================
     REDIRECT
  ========================================= */

  useEffect(() => {
    if (serviceId === "drivers") {
      navigate(`/book-driver/${serviceId}`, {
        replace: true,
      });
    }
  }, [serviceId, navigate]);

  /* =========================================
     RESET DRAFT
  ========================================= */

  useEffect(() => {
    dispatch({
      type: "RESET_BOOKING_DRAFT",
    });
  }, [dispatch, serviceId]);

  /* =========================================
     NOT FOUND
  ========================================= */

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold">
          Service not found
        </h2>

        <button
          onClick={() => navigate("/home")}
          className="mt-4 text-primary font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (serviceId === "drivers")
    return null;

  /* =========================================
     TOGGLE
  ========================================= */

  const toggleSelection = (
    problem: string
  ) => {
    setSelectedProblems((prev) => {
      if (prev.includes(problem)) {
        return prev.filter(
          (p) => p !== problem
        );
      }

      return [...prev, problem];
    });
  };

  /* =========================================
     CONTINUE
  ========================================= */

  const handleContinue = () => {

    if (selectedProblems.length === 0)
      return;

    setIsLoading(true);

    setTimeout(() => {

      setIsLoading(false);

      dispatch({
        type: "SELECT_SERVICE",
        id: service.id,
      });

      navigate(
        `/book-service/${service.id}`,
        {
          state: {
            serviceId: service.id,
            issue:
              selectedProblems.join(", "),
          },
        }
      );
    }, 400);
  };

  /* =========================================
     HELP
  ========================================= */

  const handleConfirmHelp = () => {
    if (!helpDesc.trim() || !helpContact.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      dispatch({ type: "SELECT_SERVICE", id: service.id });
      navigate(`/book-service/${service.id}`, {
        state: {
          serviceId: service.id,
          issue: `Help Request: ${helpDesc} (Contact: ${helpContact})`
        }
      });
    }, 400);
  };

  /* =========================================
     PROBLEMS
  ========================================= */

  const getExtendedProblems = () => {

    const list = service.commonProblems
      ? [...service.commonProblems]
      : [];

    if (
      service.id === "plumber" &&
      !list.includes("Drain cleaning")
    ) {
      list.push(
        "Drain cleaning",
        "Pipe installation",
        "Low water pressure",
        "Bathtub repair"
      );
    }

    if (
      service.id === "electrician" &&
      !list.includes("Power outage")
    ) {
      list.push(
        "Power outage",
        "Light installation",
        "Wiring issue",
        "Fuse problem"
      );
    }

    if (!list.includes("Other")) {
      list.push("Other");
    }

    return list;
  };

  const problemsList =
    getExtendedProblems();

  /* =========================================
     ANIMATIONS
  ========================================= */

  const containerVariants = {
    hidden: { opacity: 0 },

    visible: {
      opacity: 1,

      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 10,
    },

    visible: {
      opacity: 1,
      scale: 1,
      y: 0,

      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  } as any;

  /* =========================================
     UI
  ========================================= */

  return (

    <div className="min-h-screen relative overflow-hidden pb-10">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,#F8FAFC 0%,#EEF3F9 100%)",
        }}
      />

      {/* DOT GRID */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(#dbe3ec 1px, transparent 1px)",

          backgroundSize: "22px 22px",
        }}
      />

      {/* GOLD GLOW */}
      <div
        className="absolute top-[-120px] right-[-120px] w-[340px] h-[340px] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(244,185,66,0.25), transparent 70%)",
        }}
      />

      {/* BLUE GLOW */}
      <div
        className="absolute bottom-[-120px] left-[-120px] w-[320px] h-[320px] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(23,55,94,0.18), transparent 70%)",
        }}
      />

      {/* HEADER */}
      <motion.div
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        className="relative z-20 px-5 pt-6 pb-4 flex items-center gap-3 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sticky top-0"
      >

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/home")}
          className="w-12 h-12 rounded-[18px] bg-white shadow-md flex items-center justify-center"
        >
          <ArrowLeft
            size={22}
            className="text-[#17375E]"
          />
        </motion.button>

        <div>
          <h1 className="text-[22px] font-black text-[#0F172A]">
            {service.label}
          </h1>

          <p className="text-[13px] text-[#64748B] mt-0.5">
            Fine-tune your request
          </p>
        </div>
      </motion.div>

      {/* BODY */}
      <div className="relative z-10 px-5 pt-7">

        {/* TITLE */}
        <div className="mb-8">

          <h2 className="text-[34px] leading-[1.05] font-black text-[#0F172A] tracking-tight">
            What’s the
            <br />
            problem?
          </h2>

          <p className="text-[15px] text-[#64748B] mt-3">
            Select one or more issues
          </p>
        </div>

        {/* GRID */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-5"
        >

          {problemsList.map((problem) => {

            const isActive =
              selectedProblems.includes(
                problem
              );

            const IconComponent =
              getProblemIcon(problem);

            return (

              <motion.button
                key={problem}
                variants={itemVariants}
                whileHover={{
                  scale: 1.03,
                  y: -4,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() =>
                  toggleSelection(problem)
                }
                className={`glass-card service-card relative rounded-[32px] p-5 min-h-[185px] flex flex-col items-start overflow-hidden border transition-all duration-300

                ${isActive
                    ? "border-[#D89B1D] shadow-[0_20px_50px_rgba(216,155,29,0.18)]"
                    : "border-white/50 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
                  }
                `}
              >

                {/* ACTIVE BG */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9EA] to-[#FFF3CF]" />
                )}

                {/* CHECK */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{
                        scale: 0,
                        opacity: 0,
                      }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                      }}
                      exit={{
                        scale: 0,
                        opacity: 0,
                      }}
                      className="absolute top-4 right-4 z-10"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D89B1D] to-[#F4B942] flex items-center justify-center shadow-lg">
                        <Check
                          size={14}
                          className="text-white"
                          strokeWidth={3}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ICON */}
                <div
                  className={`relative z-10 w-16 h-16 rounded-[22px] flex items-center justify-center mb-5

                  ${isActive
                      ? "bg-gradient-to-br from-[#FFF6DD] to-[#FFE7A3]"
                      : "bg-white"
                    }
                  `}
                  style={{
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.8), 0 10px 25px rgba(15,23,42,0.06)",
                  }}
                >
                  <IconComponent
                    size={30}
                    color={
                      isActive
                        ? "#D89B1D"
                        : "#64748B"
                    }
                  />
                </div>

                {/* TEXT */}
                <span className="relative z-10 text-[15px] font-extrabold leading-snug tracking-tight text-[#0F172A]">
                  {problem}
                </span>

              </motion.button>
            );
          })}
        </motion.div>



        {/* Trust Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-transparent flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-4"
        >
          <div className="w-14 h-14 rounded-[20px] bg-primary/5 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={26} className="text-primary" strokeWidth={2} />
          </div>
          <div className="flex-1 w-full">
            <h3 className="text-[17px] font-extrabold text-foreground">Not sure what's wrong?</h3>
            <p className="text-[13px] text-muted-foreground mt-1 mb-4 leading-relaxed">Let our experts inspect and identify the exact issue for you.</p>

            <AnimatePresence mode="wait">
              {!showHelpForm ? (
                <motion.button
                  key="btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowHelpForm(true)}
                  className="bg-primary text-white text-[13px] font-bold tracking-wide px-5 py-3 rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors w-full sm:w-auto"
                >
                  Get Help
                </motion.button>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 mt-2 overflow-hidden"
                >
                  <textarea
                    value={helpDesc}
                    onChange={(e) => setHelpDesc(e.target.value)}
                    placeholder="Enter your problem..."
                    rows={3}
                    className="w-full bg-[#F8FAFC] rounded-[14px] p-3 text-[13px] font-semibold text-primary border border-primary/10 focus:border-accent/50 focus:outline-none transition-all resize-none"
                  />
                  <input
                    type="text"
                    value={helpContact}
                    onChange={(e) => setHelpContact(e.target.value)}
                    placeholder="Phone number or Email address"
                    className="w-full bg-[#F8FAFC] rounded-[14px] p-3 text-[13px] font-semibold text-primary border border-primary/10 focus:border-accent/50 focus:outline-none transition-all"
                  />
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowHelpForm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-bold text-[13px] active:scale-95 transition-all hover:bg-black/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmHelp}
                      disabled={!helpDesc.trim() || !helpContact.trim() || isLoading}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-[13px] active:scale-95 transition-all disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* TRUST */}
        <div className="flex justify-between mt-10 opacity-80">

          <div className="flex flex-col items-center text-center">
            <ShieldCheck
              size={30}
              className="text-[#D89B1D]"
            />

            <span className="text-[10px] mt-2 font-bold uppercase tracking-widest text-[#64748B]">
              Verified
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <Clock
              size={30}
              className="text-[#17375E]"
            />

            <span className="text-[10px] mt-2 font-bold uppercase tracking-widest text-[#64748B]">
              On Time
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <ThumbsUp
              size={30}
              className="text-[#D89B1D]"
            />

            <span className="text-[10px] mt-2 font-bold uppercase tracking-widest text-[#64748B]">
              Top Rated
            </span>
          </div>
        </div>
      </div>

      {/* CONTINUE */}
      <AnimatePresence>
        {selectedProblems.length >
          0 && (

            <motion.div
              initial={{
                y: 100,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: 100,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 28,
              }}
              className="sticky bottom-0 z-30 px-5 pt-5 pb-6 bg-gradient-to-t from-[#F8FAFC] to-transparent"
            >

              <button
                onClick={handleContinue}
                disabled={isLoading}
                className="premium-button w-full h-[72px] rounded-[28px] text-white font-black text-[18px] flex items-center justify-center gap-3 shadow-[0_20px_60px_rgba(23,55,94,0.25)]"
              >

                {isLoading ? (

                  <Loader2 className="animate-spin" />

                ) : (
                  <>
                    Continue
                    <ArrowRight size={22} />
                  </>
                )}
              </button>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceSelection;
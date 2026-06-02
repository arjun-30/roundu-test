import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Zap,
  Mic,
  Trash2,
  Square,
  Play,
  Pause,
  XCircle,
  X,
  Loader2,
} from "lucide-react";

import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import { getServiceById } from "@/data/mockData";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useApp } from "@/context/AppContext";
import { uploadVoiceNote } from "@/lib/voiceUpload";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";
import LocationModal from "@/components/LocationModal";
import {
  motion,
  AnimatePresence,
} from "framer-motion";

const BookService = () => {
  const { serviceId = "s1" } =
    useParams<{ serviceId: string }>();

  const navigate = useNavigate();

  const routerLocation = useLocation();

  const service =
    getServiceById(serviceId);

  const {
    dispatch,
    user,
    bookingNotes,
    bookingVoiceNote,
    bookingVoiceNoteUrl,
  } = useApp();

  const [locating, setLocating] =
    useState(false);

  const [
    isLocationModalOpen,
    setIsLocationModalOpen,
  ] = useState(false);

  const lockedDescription =
    (routerLocation.state as any)
      ?.lockedDescription;

  const isDescriptionLocked =
    typeof lockedDescription ===
      "string" &&
    lockedDescription.trim().length >
      0;

  const [desc, setDesc] = useState(
    isDescriptionLocked
      ? lockedDescription
      : bookingNotes || ""
  );

  useEffect(() => {
    if (isDescriptionLocked) {
      setDesc(lockedDescription);
    }
  }, [
    isDescriptionLocked,
    lockedDescription,
  ]);

  const handleLocationFetched =
    useCallback(
      async (
        lat: number,
        lng: number
      ) => {
        if (user.address) return;

        dispatch({
          type: "SET_CURRENT_LOCATION",
          lat,
          lng,
        });

        setLocating(true);

        try {
          const result =
            await reverseGeocode(
              lat,
              lng
            );

          if (result.address) {
            dispatch({
              type: "UPDATE_USER",
              user: {
                address: result.address,
              },
            });
            localStorage.setItem("roundu_last_location", JSON.stringify({ lat, lng, address: result.address, ts: Date.now() }));
          }
        } catch (err) {
          console.warn("Reverse geocode failed:", err);
          try {
            const cached = localStorage.getItem("roundu_last_location");
            if (cached) {
              const parsed = JSON.parse(cached);
              dispatch({
                type: "UPDATE_USER",
                user: {
                  address: parsed.address,
                },
              });
            }
          } catch (_) {}
        } finally {
          setLocating(false);
        }
      },
      [dispatch, user.address]
    );

  const {
    loading: gpsLoading,
    refetch: manualRefetch,
  } = useCurrentLocation(
    handleLocationFetched
  );

  const [
    scheduleType,
    setScheduleType,
  ] = useState<
    "now" | "later" | null
  >(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isCancelled, setIsCancelled] =
    useState(false);

  const restoredAudioRef =
    useRef<HTMLAudioElement | null>(
      null
    );

  const [
    isRestoredPlaying,
    setIsRestoredPlaying,
  ] = useState(false);

  const [
    restoredCleared,
    setRestoredCleared,
  ] = useState(false);

  const recorder =
    useVoiceRecorder();

  const showRestoredVoice =
    !restoredCleared &&
    bookingVoiceNote &&
    !!bookingVoiceNoteUrl &&
    !recorder.audioBlob;

  useEffect(() => {
    if (
      bookingVoiceNoteUrl &&
      !restoredCleared
    ) {
      const audio = new Audio(
        bookingVoiceNoteUrl
      );

      audio.onended = () =>
        setIsRestoredPlaying(false);

      restoredAudioRef.current =
        audio;
    }

    return () => {
      restoredAudioRef.current?.pause();

      restoredAudioRef.current =
        null;
    };
  }, [
    bookingVoiceNoteUrl,
    restoredCleared,
  ]);

  const toggleRestoredPlay = () => {
    const audio =
      restoredAudioRef.current;

    if (!audio) return;

    if (isRestoredPlaying) {
      audio.pause();

      setIsRestoredPlaying(false);
    } else {
      audio.play();

      setIsRestoredPlaying(true);
    }
  };

  const deleteRestoredVoice = () => {
    restoredAudioRef.current?.pause();

    restoredAudioRef.current =
      null;

    setIsRestoredPlaying(false);

    setRestoredCleared(true);

    dispatch({
      type: "SET_NOTES",
      notes: desc,
      voiceNote: false,
      voiceNoteUrl: undefined,
    });
  };

  useEffect(() => {
    if (
      (routerLocation.state as any)
        ?.cancelled
    ) {
      setIsCancelled(true);

      window.history.replaceState(
        {},
        ""
      );
    }
  }, [routerLocation.state]);

  const handleScheduleSelect =
    async (
      type: "now" | "later"
    ) => {
      if (
        !desc &&
        !recorder.audioBlob &&
        !showRestoredVoice
      ) {
        setError(
          "Please describe your issue first"
        );

        return;
      }

      setError("");

      setIsCancelled(false);

      setScheduleType(type);

      let uploadedUrl:
        | string
        | undefined = undefined;

      if (recorder.audioBlob) {
        setIsUploading(true);

        try {
          uploadedUrl =
            await uploadVoiceNote(
              recorder.audioBlob
            );
        } catch (err) {
          setError(
            "Failed to upload voice note."
          );

          setIsUploading(false);

          setScheduleType(null);

          return;
        }

        setIsUploading(false);
      }

      dispatch({
        type: "SET_NOTES",
        notes: desc,
        voiceNote:
          !!recorder.audioBlob ||
          showRestoredVoice,
        voiceNoteUrl:
          uploadedUrl ||
          (showRestoredVoice
            ? bookingVoiceNoteUrl ??
              undefined
            : undefined),
      });

      if (type === "later") {
        navigate("/booking/date", {
          state: {
            serviceId,
            desc,
            hasVoiceNote:
              !!recorder.audioBlob,
            voiceNoteUrl:
              uploadedUrl,
          },
        });

        return;
      }

      sessionStorage.removeItem(
        "searching_providers_state"
      );

      sessionStorage.removeItem(
        "searching_providers_scroll"
      );

      navigate(
        `/searching-providers/${serviceId}`
      );
    };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] font-sans pb-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-20"
      >
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (isCancelled) {
              dispatch({ type: "RESET_BOOKING_DRAFT" });
              navigate("/home", { replace: true });
            } else {
              navigate(-1);
            }
          }}
          className="w-11 h-11 rounded-[16px] bg-[#F8FAFC] flex flex-shrink-0 items-center justify-center border-2 border-transparent hover:border-primary/10 transition-all shadow-sm mr-4"
        >
          <ArrowLeft size={22} className="text-primary" strokeWidth={2.5} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-[20px] font-extrabold text-foreground leading-tight tracking-tight">Book Service</h1>
          <p className="text-[13px] text-accent font-bold mt-0.5">{service?.label || "Electrician"}</p>
        </div>
        <AnimatePresence>
          {isCancelled && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-[8px]"
            >
              <XCircle size={13} />
              Cancelled
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* CONTENT */}
      <div className="px-5 pt-5 space-y-5">

        {/* DESCRIPTION */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">

          <div className="mb-4">
            <h2 className="text-[22px] font-bold text-[#0F172A]">
              Describe Problem
            </h2>

            <p className="text-[14px] text-slate-500 mt-1">
              Add details so
              professionals understand
              your issue.
            </p>
          </div>

          {/* TEXTAREA */}
          <div className="relative">
            <textarea
              rows={3}
              value={desc}
              onChange={(e) =>
                !isDescriptionLocked &&
                setDesc(
                  e.target.value
                )
              }
              readOnly={
                isDescriptionLocked
              }
              placeholder="Describe the issue briefly..."
              className="w-full bg-[#F8FAFC] rounded-[22px] p-5 pr-14 text-[14px] font-medium text-[#0F172A] border border-slate-200 focus:border-[#17375E]/20 placeholder:text-slate-400 focus:outline-none transition-all resize-none"
            />

            {!recorder.isRecording &&
              !recorder.audioBlob &&
              !showRestoredVoice && (
                <button
                  onClick={
                    recorder.startRecording
                  }
                  className="absolute right-4 bottom-4 w-11 h-11 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-[#D89B1D]"
                >
                  <Mic size={20} />
                </button>
              )}
          </div>

          {/* RECORDING */}
          {recorder.isRecording && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-[20px] p-4 flex items-center justify-between">

              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />

                <span className="text-[14px] font-bold text-red-600">
                  Recording...
                </span>
              </div>

              <button
                onClick={
                  recorder.stopRecording
                }
                className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"
              >
                <Square
                  size={16}
                  fill="currentColor"
                />
              </button>
            </div>
          )}

          {/* AUDIO */}
          {recorder.audioBlob && (
            <div className="mt-4 bg-[#F8FAFC] rounded-[20px] border border-slate-200 p-4 flex items-center justify-between">

              <div className="flex items-center gap-4">
                <button
                  onClick={
                    recorder.playAudio
                  }
                  className="w-12 h-12 rounded-2xl bg-[#17375E] text-white flex items-center justify-center"
                >
                  {recorder.isPlaying ? (
                    <Pause
                      size={18}
                    />
                  ) : (
                    <Play
                      size={18}
                    />
                  )}
                </button>

                <div>
                  <p className="font-bold text-[#0F172A]">
                    Voice Note
                  </p>

                  <p className="text-[12px] text-slate-500">
                    Attached
                  </p>
                </div>
              </div>

              <button
                onClick={
                  recorder.deleteRecording
                }
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-[13px] font-semibold mt-3">
              {error}
            </p>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 mt-3 text-[#17375E] text-[13px] font-semibold">
              <Loader2
                size={14}
                className="animate-spin"
              />
              Uploading voice note...
            </div>
          )}
        </div>

        {/* LOCATION */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">

          <h2 className="text-[18px] font-bold text-[#0F172A] mb-4">
            Service Location
          </h2>

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <button
                onClick={() =>
                  manualRefetch()
                }
                className="w-14 h-14 rounded-2xl bg-[#FFF7E8] flex items-center justify-center"
              >
                {locating ||
                gpsLoading ? (
                  <Loader2
                    size={20}
                    className="animate-spin text-[#D89B1D]"
                  />
                ) : (
                  <MapPin
                    size={22}
                    className="text-[#D89B1D]"
                  />
                )}
              </button>

              <div>
                <h3 className="font-bold text-[18px] text-[#0F172A]">
                  Home
                </h3>

                <p className="text-[14px] text-slate-500 mt-1">
                  {user.address ||
                    "Set Location"}
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setIsLocationModalOpen(
                  true
                )
              }
              className="text-[13px] font-semibold text-[#17375E] bg-[#F8FAFC] border border-slate-200 px-4 py-2 rounded-xl"
            >
              Edit
            </button>
          </div>
        </div>

        {/* SCHEDULE */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">

          <h2 className="text-[18px] font-bold text-[#0F172A] mb-4">
            Schedule Service
          </h2>

          <div className="flex gap-4">

            {/* QUICK FIX */}
            <button
              onClick={() =>
                handleScheduleSelect(
                  "now"
                )
              }
              className={`flex-1 rounded-[20px] py-5 flex flex-col items-center justify-center gap-2 border transition-all ${
                scheduleType === "now"
                  ? "bg-[#17375E] text-white border-[#17375E]"
                  : "bg-[#F8FAFC] text-[#0F172A] border-slate-200"
              }`}
            >
              <Zap
                size={24}
                className={
                  scheduleType === "now"
                    ? "text-white"
                    : "text-[#D89B1D]"
                }
              />

              <span className="font-bold">
                Quick Fix
              </span>
            </button>

            {/* LATER */}
            <button
              onClick={() =>
                handleScheduleSelect(
                  "later"
                )
              }
              className={`flex-1 rounded-[20px] py-5 flex flex-col items-center justify-center gap-2 border transition-all ${
                scheduleType ===
                "later"
                  ? "bg-[#17375E] text-white border-[#17375E]"
                  : "bg-[#F8FAFC] text-[#0F172A] border-slate-200"
              }`}
            >
              <Clock
                size={24}
                className={
                  scheduleType ===
                  "later"
                    ? "text-white"
                    : "text-[#17375E]"
                }
              />

              <span className="font-bold">
                Schedule
              </span>
            </button>
          </div>
        </div>

        {/* PRICE */}
        <div className="bg-white rounded-[28px] border border-slate-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">

          <p className="text-[13px] font-semibold text-slate-500">
            Estimated Price
          </p>

          <div className="flex items-end justify-between mt-2">

            <h3 className="text-[30px] font-extrabold text-[#0F172A]">
              ₹299 – ₹599
            </h3>

            <span className="text-[13px] text-slate-500">
              After inspection
            </span>
          </div>
        </div>
      </div>

      {/* LOCATION MODAL */}
      <LocationModal
        isOpen={
          isLocationModalOpen
        }
        onClose={() =>
          setIsLocationModalOpen(
            false
          )
        }
      />
    </div>
  );
};

export default BookService;
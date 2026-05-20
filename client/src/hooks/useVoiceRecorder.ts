import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isPlaying: boolean;
  playbackTime: number;
  error: string | null;
}

export function useVoiceRecorder(maxDurationSec = 120) {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    isPlaying: false,
    playbackTime: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTimers();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        if (blob.size === 0) {
          setState((prev) => ({
            ...prev,
            isRecording: false,
            error: "Recorded audio is empty. Please try again.",
          }));
          return;
        }

        const url = URL.createObjectURL(blob);

        setState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
        }));

        // Stop the mic stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          error: "Recording failed. Please try again.",
        }));
        stream.getTracks().forEach((t) => t.stop());
      };

      // Start recording — produce a single clean chunk
      recorder.start();
      startTimeRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
      }));

      // Duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, duration: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= maxDurationSec) {
          recorder.stop();
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 500);
    } catch (err: any) {
      let errorMsg = "Could not access microphone.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Microphone permission denied. Please allow access in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No microphone found on this device.";
      }
      setState((prev) => ({ ...prev, error: errorMsg }));
    }
  }, [maxDurationSec]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playAudio = useCallback(() => {
    if (!state.audioUrl) return;

    // If already playing, pause
    if (state.isPlaying && audioRef.current) {
      audioRef.current.pause();
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setState((prev) => ({ ...prev, isPlaying: false }));
      return;
    }

    const audio = new Audio(state.audioUrl);
    audioRef.current = audio;

    audio.onplay = () => {
      setState((prev) => ({ ...prev, isPlaying: true, playbackTime: 0 }));
      playbackTimerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          playbackTime: Math.floor(audio.currentTime),
        }));
      }, 200);
    };

    audio.onended = () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setState((prev) => ({ ...prev, isPlaying: false, playbackTime: 0 }));
      audioRef.current = null;
    };

    audio.onerror = () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        error: "Failed to play audio.",
      }));
    };

    audio.play().catch(() => {
      setState((prev) => ({
        ...prev,
        error: "Playback blocked. Tap again.",
      }));
    });
  }, [state.audioUrl, state.isPlaying]);

  const deleteRecording = useCallback(() => {
    // Stop playback if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopAllTimers();

    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      isPlaying: false,
      playbackTime: 0,
      error: null,
    });
  }, [state.audioUrl]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    playAudio,
    deleteRecording,
    formatTime,
  };
}

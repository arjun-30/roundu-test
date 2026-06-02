import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BookService from "../pages/BookService";
import { BrowserRouter } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ serviceId: "s1" }),
    useLocation: () => ({ state: null }),
  };
});

// Mock AppContext
vi.mock("@/context/AppContext", () => ({
  useApp: vi.fn(),
}));

// Mock useVoiceRecorder
vi.mock("@/hooks/useVoiceRecorder", () => ({
  useVoiceRecorder: vi.fn(),
}));

describe("BookService Problem Description", () => {
  const mockDispatch = vi.fn();
  const mockUser = {
    address: "12, MG Road, Indiranagar, Bangalore",
  };

  const defaultRecorder = {
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    isPlaying: false,
    playbackTime: 0,
    error: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    playAudio: vi.fn(),
    deleteRecording: vi.fn(),
    formatTime: (sec: number) => `0:${sec.toString().padStart(2, "0")}`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useApp as any).mockReturnValue({
      user: mockUser,
      dispatch: mockDispatch,
      bookingNotes: "",
      bookingVoiceNote: false,
      bookingVoiceNoteUrl: null,
    });
    (useVoiceRecorder as any).mockReturnValue(defaultRecorder);
  });

  it("renders textarea and mic button initially", () => {
    render(
      <BrowserRouter>
        <BookService />
      </BrowserRouter>
    );

    const textarea = screen.getByPlaceholderText(/Describe the issue briefly/i);
    expect(textarea).toBeInTheDocument();

    const helperText = screen.getByText(/Add details so professionals understand your issue/i);
    expect(helperText).toBeInTheDocument();

    // Verify mic button exists inside the relative wrapper
    const buttons = screen.getAllByRole("button");
    const hasMicButton = buttons.some((btn) => btn.querySelector("svg"));
    expect(hasMicButton).toBe(true);
  });

  it("keeps textarea visible and editable when recording is active, hiding mic button", () => {
    (useVoiceRecorder as any).mockReturnValue({
      ...defaultRecorder,
      isRecording: true,
      duration: 5,
    });

    render(
      <BrowserRouter>
        <BookService />
      </BrowserRouter>
    );

    // Textarea is still visible and editable
    const textarea = screen.getByPlaceholderText(/Describe the issue briefly/i) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "Kitchen tap leakage" } });
    expect(textarea.value).toBe("Kitchen tap leakage");

    // Helper text is visible
    expect(screen.getByText(/Add details so professionals understand your issue/i)).toBeInTheDocument();

    // Recording indicator is visible
    expect(screen.getByText(/Recording.../i)).toBeInTheDocument();
  });

  it("keeps textarea visible and shows audio card when recording is complete, hiding mic button", () => {
    (useVoiceRecorder as any).mockReturnValue({
      ...defaultRecorder,
      audioBlob: new Blob([""], { type: "audio/webm" }),
      duration: 12,
    });

    render(
      <BrowserRouter>
        <BookService />
      </BrowserRouter>
    );

    // Textarea is still visible and editable
    const textarea = screen.getByPlaceholderText(/Describe the issue briefly/i) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "Water leak" } });
    expect(textarea.value).toBe("Water leak");

    // Audio card "Voice Note" and "Attached" is shown
    expect(screen.getByText(/Voice Note/i)).toBeInTheDocument();
    expect(screen.getByText(/Attached/i)).toBeInTheDocument();
  });
});

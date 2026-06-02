import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PersonalDetails from "../pages/provider/PersonalDetails";
import { BrowserRouter } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { reverseGeocode } from "@/lib/mapProvider";

// Mock Geolocation plugin
const mockCheckPermissions = vi.fn().mockResolvedValue({ location: "granted" });
const mockRequestPermissions = vi.fn().mockResolvedValue({ location: "granted" });
const mockGetCurrentPosition = vi.fn();

vi.mock("@capacitor/geolocation", () => ({
  Geolocation: {
    checkPermissions: () => mockCheckPermissions(),
    requestPermissions: () => mockRequestPermissions(),
    getCurrentPosition: () => mockGetCurrentPosition(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AppContext
vi.mock("@/context/AppContext", () => ({
  useApp: vi.fn(),
}));

// Mock mapProvider
vi.mock("@/lib/mapProvider", () => ({
  reverseGeocode: vi.fn(),
}));

describe("PersonalDetails location auto-detection", () => {
  const mockDispatch = vi.fn();
  const mockUser = {
    name: "Prabhakaran",
    phone: "3456789092",
    address: "",
  };
  const mockDraft = {
    bio: "",
    experienceYears: 2,
    serviceRadius: 5,
    workingHours: "All day",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermissions.mockResolvedValue({ location: "granted" });
    mockRequestPermissions.mockResolvedValue({ location: "granted" });
    mockGetCurrentPosition.mockReset();
    (useApp as any).mockReturnValue({
      user: mockUser,
      providerRegistrationDraft: mockDraft,
      dispatch: mockDispatch,
    });
  });

  it("should detect location and autofill address, city, and pincode fields successfully", async () => {
    mockGetCurrentPosition.mockResolvedValue({
      coords: {
        latitude: 10.0,
        longitude: 20.0,
      },
    });

    // Mock reverseGeocode success
    (reverseGeocode as any).mockResolvedValue({
      address: "185 NORTH STREET A VADIPATTI THENI TAMILNADU 625602",
      area: "Vadipatti",
      city: "Theni",
      pincode: "625602",
    });

    render(
      <BrowserRouter>
        <PersonalDetails />
      </BrowserRouter>
    );

    // Get input elements
    const addressInput = screen.getByPlaceholderText(/Full Address \*/i) as HTMLInputElement;
    const cityInput = screen.getByPlaceholderText(/City \/ District \*/i) as HTMLInputElement;
    const pincodeInput = screen.getByPlaceholderText(/PIN Code \*/i) as HTMLInputElement;

    expect(addressInput.value).toBe("");
    expect(cityInput.value).toBe("Bangalore"); // initial default
    expect(pincodeInput.value).toBe("");

    // Find and click the auto-detect button
    const autoDetectBtn = screen.getByRole("button", { name: /Auto-detect/i });
    fireEvent.click(autoDetectBtn);

    // Verify it changes state and resolves
    await waitFor(() => {
      expect(addressInput.value).toBe("185 NORTH STREET A VADIPATTI THENI TAMILNADU 625602");
      expect(cityInput.value).toBe("Theni");
      expect(pincodeInput.value).toBe("625602");
    });
  });

  it("should show error message if geolocation permission is denied", async () => {
    mockCheckPermissions.mockResolvedValue({ location: "denied" });
    mockRequestPermissions.mockResolvedValue({ location: "denied" });
    mockGetCurrentPosition.mockRejectedValue(new Error("Location permission denied."));

    render(
      <BrowserRouter>
        <PersonalDetails />
      </BrowserRouter>
    );

    const autoDetectBtn = screen.getByRole("button", { name: /Auto-detect/i });
    fireEvent.click(autoDetectBtn);

    await waitFor(() => {
      expect(screen.getByText(/Location access denied/i)).toBeInTheDocument();
    });
  });
});

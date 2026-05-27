import React, { useState, useRef } from "react";
import { ArrowLeft, ImagePlus, ChevronDown, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const CATEGORIES = [
  "Booking Issue",
  "Payment Issue",
  "Provider Behavior",
  "App Bug",
  "Other"
];

const MAX_SCREENSHOTS = 3;

const ReportIssue = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("Booking Issue");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [screenshots, setScreenshots] = useState<{ file: File; preview: string }[]>([]);

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) {
      setError(`You can upload a maximum of ${MAX_SCREENSHOTS} screenshots.`);
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newFiles = Array.from(files).slice(0, remaining);
    const newScreenshots = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setScreenshots((prev) => [...prev, ...newScreenshots]);
    setError("");

    // Reset the input so the same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      setError("Please provide a description of the issue.");
      return;
    }
    setError("");

    setIsSubmitting(true);

    // Simulate API Call: supportApi.createTicket()
    // In a real implementation, screenshots would be uploaded via FormData
    setTimeout(() => {
      setIsSubmitting(false);
      // Clean up preview URLs on success
      screenshots.forEach((s) => URL.revokeObjectURL(s.preview));
      setSuccess("Your issue has been submitted. Our team will contact you soon.");
      setTimeout(() => navigate(-1), 1500);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-background flex items-center justify-center mr-3 hover:bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <h1 className="text-[19px] font-extrabold text-foreground">Report an Issue</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24 space-y-5">
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-semibold">{success}</div>}

        {/* Category Dropdown */}
        <div>
          <label className="text-[14px] font-extrabold text-foreground mb-2 block px-1">Issue Category</label>
          <div className="relative">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] active:scale-[0.99] transition-all"
            >
              <span className="text-[14px] font-bold text-gray-800">{category}</span>
              <ChevronDown size={18} className="text-muted-foreground" />
            </button>
            {isCategoryOpen && (
              <div className="absolute top-[110%] left-0 right-0 bg-white border border-border rounded-2xl shadow-xl z-10 overflow-hidden animate-fade-in">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCategory(c); setIsCategoryOpen(false); }}
                    className={`w-full text-left px-5 py-3.5 text-[14px] font-medium transition-colors ${category === c ? "bg-[#EEF2FB] text-[#1C3F8F] font-bold" : "text-foreground hover:bg-background"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className="text-[14px] font-extrabold text-foreground mb-2 block px-1">Description <span className="text-red-500">*</span></label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe your issue in detail..."
            className="w-full bg-white rounded-2xl p-4 text-[14px] font-medium text-foreground border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1C3F8F]/20 transition-all resize-none"
          />
        </div>

        {/* Screenshot Upload */}
        <div>
          <label htmlFor="screenshot-upload" className="text-[14px] font-extrabold text-foreground mb-2 block px-1">Upload Screenshot <span className="opacity-50 text-xs font-medium">(Optional)</span></label>

          {/* Hidden file input */}
          <input
            type="file"
            id="screenshot-upload"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleScreenshotSelect}
            className="hidden"
          />

          <div className="flex flex-wrap gap-3">
            {/* Existing screenshot previews */}
            {screenshots.map((shot, index) => (
              <div key={index} className="relative w-[80px] h-[80px] rounded-[18px] overflow-hidden border border-border shadow-sm group">
                <img
                  src={shot.preview}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveScreenshot(index)}
                  aria-label="Remove screenshot"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  style={{ opacity: 1 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* Add button (show only if under the max) */}
            {screenshots.length < MAX_SCREENSHOTS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-[80px] h-[80px] rounded-[18px] border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-1 hover:border-[#1C3F8F]/40 hover:bg-[#EEF2FB] transition-colors shadow-sm"
              >
                <ImagePlus size={22} className="text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground">{screenshots.length}/{MAX_SCREENSHOTS}</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact Info (Auto-filled) */}
        <div className="pt-2">
          <label className="text-[14px] font-extrabold text-foreground mb-2 block px-1">Contact Info</label>
          <div className="bg-background rounded-2xl p-4 border border-border shadow-inner">
            <p className="text-[14px] font-bold text-gray-800">{user.name || "Customer"}</p>
            <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{user.phone || "No phone linked"} • {user.email || "No email linked"}</p>
          </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border z-10">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full flex items-center justify-center py-[16px] rounded-[16px] transition-all shadow-sm ${isSubmitting
            ? "bg-[#E2E8F0] text-muted-foreground cursor-not-allowed"
            : "bg-primary text-white hover:bg-[#1C3D63] active:scale-[0.98] shadow-[#152E4B]/20 shadow-lg"
            }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 font-extrabold text-[15px]">
              <Loader2 className="animate-spin" size={18} /> Submitting...
            </span>
          ) : (
            <span className="font-extrabold text-[15px]">Submit Issue</span>
          )}
        </button>
      </div>

    </div>
  );
};

export default ReportIssue;

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

export interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

export default function ImagePreviewModal({
  isOpen,
  imageUrl,
  alt = "Image preview",
  onClose,
}: ImagePreviewModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Gesture states
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // Gesture refs for event handler tracking (prevents stale closure issues)
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isTransformingRef = useRef(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Gesture calculations tracking
  const lastTapTime = useRef<number>(0);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const translateStart = useRef<Point>({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number>(0);
  const initialPinchScale = useRef<number>(1);
  const isPinching = useRef<boolean>(false);
  const isSwipingDown = useRef<boolean>(false);

  // Sync state values with refs
  const updateScale = (s: number) => {
    setScale(s);
    scaleRef.current = s;
  };

  const updateTranslateX = (tx: number) => {
    setTranslateX(tx);
    translateXRef.current = tx;
  };

  const updateTranslateY = (ty: number) => {
    setTranslateY(ty);
    translateYRef.current = ty;
  };

  const updateIsDragging = (d: boolean) => {
    setIsDragging(d);
    isDraggingRef.current = d;
  };

  const updateIsTransforming = (t: boolean) => {
    setIsTransforming(t);
    isTransformingRef.current = t;
  };

  // Open/Close transition control
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Reset zoom/pan when opening
      updateScale(1);
      updateTranslateX(0);
      updateTranslateY(0);
      setHasError(false);
      setLoading(true);

      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll Lock & ESC key handler
  useEffect(() => {
    if (isOpen && shouldRender) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          handleClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      // Focus trapping
      if (containerRef.current) {
        containerRef.current.focus();
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, shouldRender]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      handleClose();
    }
  };

  const handleDoubleTap = (clientX: number, clientY: number) => {
    const currentScale = scaleRef.current;
    if (currentScale > 1) {
      // Zoom out
      updateScale(1);
      updateTranslateX(0);
      updateTranslateY(0);
    } else {
      // Zoom in
      const newScale = 2.5;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Position relative to center
      const tapX = clientX - viewportWidth / 2;
      const tapY = clientY - viewportHeight / 2;

      let tx = -tapX * (newScale - 1);
      let ty = -tapY * (newScale - 1);

      const maxX = Math.max(0, (viewportWidth * (newScale - 1)) / 2);
      const maxY = Math.max(0, (viewportHeight * (newScale - 1)) / 2);

      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));

      updateScale(newScale);
      updateTranslateX(tx);
      updateTranslateY(ty);
    }
  };

  // Mouse gestures handler for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (hasError || !imageUrl) return;
    e.preventDefault();

    const now = Date.now();
    const timeDiff = now - lastTapTime.current;

    if (timeDiff < 300) {
      handleDoubleTap(e.clientX, e.clientY);
    } else {
      updateIsDragging(true);
      updateIsTransforming(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { x: translateXRef.current, y: translateYRef.current };

      if (scaleRef.current === 1) {
        isSwipingDown.current = true;
      } else {
        isSwipingDown.current = false;
      }
    }
    lastTapTime.current = now;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (isSwipingDown.current) {
      if (dy > 0) {
        updateTranslateY(dy);
      }
    } else if (scaleRef.current > 1) {
      let tx = translateStart.current.x + dx;
      let ty = translateStart.current.y + dy;

      const maxX = Math.max(0, (window.innerWidth * (scaleRef.current - 1)) / 2);
      const maxY = Math.max(0, (window.innerHeight * (scaleRef.current - 1)) / 2);

      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));

      updateTranslateX(tx);
      updateTranslateY(ty);
    }
  };

  const handleMouseUp = () => {
    if (isSwipingDown.current) {
      isSwipingDown.current = false;
      if (translateYRef.current > 100) {
        handleClose();
      } else {
        updateTranslateY(0);
      }
    }
    updateIsDragging(false);
    updateIsTransforming(false);
  };

  // Register non-passive touch listeners for mobile gestures
  useEffect(() => {
    const imageElement = imageRef.current;
    if (!imageElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const timeDiff = now - lastTapTime.current;

        if (timeDiff < 300) {
          handleDoubleTap(touch.clientX, touch.clientY);
        } else {
          updateIsDragging(true);
          updateIsTransforming(true);
          dragStart.current = { x: touch.clientX, y: touch.clientY };
          translateStart.current = { x: translateXRef.current, y: translateYRef.current };

          if (scaleRef.current === 1) {
            isSwipingDown.current = true;
          } else {
            isSwipingDown.current = false;
          }
        }
        lastTapTime.current = now;
      } else if (e.touches.length === 2) {
        isPinching.current = true;
        updateIsDragging(false);
        isSwipingDown.current = false;
        updateIsTransforming(true);

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance.current = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        initialPinchScale.current = scaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching.current && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        let newScale = initialPinchScale.current * (dist / initialPinchDistance.current);
        newScale = Math.max(1, Math.min(4, newScale));
        updateScale(newScale);

        if (newScale === 1) {
          updateTranslateX(0);
          updateTranslateY(0);
        }
      } else if (isDraggingRef.current && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const dx = touch.clientX - dragStart.current.x;
        const dy = touch.clientY - dragStart.current.y;

        if (isSwipingDown.current) {
          if (dy > 0) {
            updateTranslateY(dy);
          }
        } else if (scaleRef.current > 1) {
          let tx = translateStart.current.x + dx;
          let ty = translateStart.current.y + dy;

          const maxX = Math.max(0, (window.innerWidth * (scaleRef.current - 1)) / 2);
          const maxY = Math.max(0, (window.innerHeight * (scaleRef.current - 1)) / 2);

          tx = Math.max(-maxX, Math.min(maxX, tx));
          ty = Math.max(-maxY, Math.min(maxY, ty));

          updateTranslateX(tx);
          updateTranslateY(ty);
        }
      }
    };

    const handleTouchEnd = () => {
      if (isPinching.current) {
        isPinching.current = false;
        if (scaleRef.current < 1.05) {
          updateScale(1);
          updateTranslateX(0);
          updateTranslateY(0);
        }
      }

      if (isSwipingDown.current) {
        isSwipingDown.current = false;
        if (translateYRef.current > 100) {
          handleClose();
        } else {
          updateTranslateY(0);
        }
      }

      updateIsDragging(false);
      updateIsTransforming(false);
    };

    imageElement.addEventListener("touchstart", handleTouchStart, { passive: false });
    imageElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    imageElement.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      imageElement.removeEventListener("touchstart", handleTouchStart);
      imageElement.removeEventListener("touchmove", handleTouchMove);
      imageElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, [imageUrl, hasError]);

  if (!shouldRender) return null;

  // Swipe-down dynamic backdrop color & blur adjustment
  const backdropOpacity =
    isSwipingDown.current && translateY > 0
      ? Math.max(0.1, 0.9 - (translateY / window.innerHeight) * 1.5)
      : 0.9;

  const backdropBlur =
    isSwipingDown.current && translateY > 0
      ? Math.max(0, 8 - (translateY / window.innerHeight) * 20)
      : 8;

  const containerStyle = {
    backgroundColor: `rgba(0, 0, 0, ${isAnimating ? backdropOpacity : 0})`,
    backdropFilter: isAnimating ? `blur(${backdropBlur}px)` : "blur(0px)",
    WebkitBackdropFilter: isAnimating ? `blur(${backdropBlur}px)` : "blur(0px)",
    transition: isTransforming
      ? "none"
      : "background-color 250ms ease-out, backdrop-filter 250ms ease-out, -webkit-backdrop-filter 250ms ease-out",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabIndex={0}
      ref={containerRef}
      style={containerStyle}
      className={`fixed inset-0 z-[9999] flex items-center justify-center select-none touch-none overflow-hidden outline-none ${
        isAnimating ? "pointer-events-auto" : "pointer-events-none"
      }`}
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={handleClose}
        aria-label="Close image preview"
        className={`absolute top-5 right-5 z-50 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white/95 hover:text-white transition-all active:scale-95 duration-200 ${
          isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <X size={24} />
      </button>

      {/* Image / Fallback Container */}
      <div
        className={`relative w-full h-full flex items-center justify-center pointer-events-none transition-all duration-250 ${
          isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-[0.93]"
        }`}
      >
        {/* Loading Spinner */}
        {loading && !hasError && imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <Loader2 size={36} className="animate-spin" />
          </div>
        )}

        {/* Dynamic Image or SVG Fallback */}
        {hasError || !imageUrl ? (
          <div
            className="w-48 h-48 rounded-full overflow-hidden flex items-center justify-center bg-slate-800 border-2 border-slate-700 pointer-events-auto shadow-2xl"
            style={{
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              transition: isTransforming ? "none" : "transform 200ms ease-out",
            }}
          >
            <img
              src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6"/><stop offset="100%" stop-color="%232563EB"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`}
              alt="Fallback Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <img
            ref={imageRef}
            src={imageUrl}
            alt={alt}
            loading="lazy"
            className="max-w-[95%] max-h-[90%] object-contain pointer-events-auto cursor-grab active:cursor-grabbing select-none"
            style={{
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              transition: isTransforming ? "none" : "transform 200ms ease-out",
            }}
            onLoad={() => setLoading(false)}
            onError={() => setHasError(true)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDragStart={(e) => e.preventDefault()}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

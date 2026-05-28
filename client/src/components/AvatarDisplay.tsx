import { useEffect, useState } from "react";

interface AvatarDisplayProps {
  photoURL?: string | null;
  name?: string | null;
  isOnline?: boolean;
  showStatus?: boolean;
  size?: number;
}

const colorClasses = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
];

const getInitials = (name?: string | null): string => {
  const safe = (name ?? "").trim();
  if (!safe) return "U";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getColorClass = (name?: string | null): string => {
  const safe = (name ?? "").trim();
  if (!safe) return colorClasses[0];
  const idx = safe.charCodeAt(0) % colorClasses.length;
  return colorClasses[idx];
};

const AvatarDisplay = ({ photoURL, name, isOnline = false, showStatus = true, size = 40 }: AvatarDisplayProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedPhotoURL = typeof photoURL === "string" ? photoURL.trim() : "";
  const hasPhoto = normalizedPhotoURL.length > 0 && !imageFailed;
  const initials = getInitials(name);
  const colorClass = getColorClass(name);
  const avatarStyle = { width: size, height: size };

  useEffect(() => {
    setImageFailed(false);
  }, [normalizedPhotoURL]);

  return (
    <div className="relative flex-shrink-0" style={avatarStyle}>
      {hasPhoto ? (
        <img
          src={normalizedPhotoURL}
          alt={name?.trim() || "Provider avatar"}
          style={avatarStyle}
          className="rounded-full object-cover object-center bg-muted"
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={`${colorClass} rounded-full flex items-center justify-center`} style={avatarStyle}>
          <span className="text-white font-medium text-sm leading-none">{initials}</span>
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-success" : "bg-muted-foreground"}`}
        />
      )}
    </div>
  );
};

export type { AvatarDisplayProps };
export default AvatarDisplay;

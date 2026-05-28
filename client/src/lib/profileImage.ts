import api, { updateUser } from "@/lib/api";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export const validateProfileImageFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return "Profile photo must be under 5 MB.";
  }

  return null;
};

export const uploadProfileImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const url = response.data?.url;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Upload completed without an image URL.");
  }

  return url;
};

export const persistProfileImage = async (userId: string, imageUrl: string) => {
  return updateUser(userId, { avatar_url: imageUrl });
};

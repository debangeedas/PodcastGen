/**
 * Cloudinary Audio Storage Utility
 * Simple unsigned upload for podcast audio files
 */

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export const isCloudinaryConfigured = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

/**
 * Upload audio blob to Cloudinary using unsigned upload
 */
export async function uploadAudioToCloudinary(
  audioBlob: Blob,
  podcastId: string,
  userId: string
): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary not configured");
  }

  const formData = new FormData();
  formData.append("file", audioBlob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("public_id", `podcasts/${userId}/${podcastId}`);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Upload failed: ${response.status} - ${error.error?.message || "Unknown"}`);
  }

  const result = await response.json();

  // Verify we got a valid secure URL
  if (!result.secure_url) {
    throw new Error("Cloudinary upload succeeded but no URL returned");
  }

  return result.secure_url;
}

/**
 * Upload with timeout - increased to 120 seconds for large audio files
 */
export async function uploadWithTimeout(
  audioBlob: Blob,
  podcastId: string,
  userId: string,
  timeoutMs: number = 120000
): Promise<string> {
  const uploadPromise = uploadAudioToCloudinary(audioBlob, podcastId, userId);
  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("Upload timeout after " + (timeoutMs / 1000) + " seconds")), timeoutMs)
  );

  return await Promise.race([uploadPromise, timeoutPromise]);
}

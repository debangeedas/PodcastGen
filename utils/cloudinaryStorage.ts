/**
 * Cloudinary Audio Storage Utility
 * Simple unsigned upload for podcast audio files
 */

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export const isCloudinaryConfigured = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

console.log("☁️ Cloudinary:", {
  cloudName: CLOUDINARY_CLOUD_NAME || "❌ Not set",
  preset: CLOUDINARY_UPLOAD_PRESET || "❌ Not set",
  configured: isCloudinaryConfigured ? "✅ Ready" : "❌ Not configured",
});

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

  console.log("☁️ Uploading to Cloudinary...", { podcastId, size: audioBlob.size });

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
  console.log("✅ Uploaded to Cloudinary:", result.secure_url);

  return result.secure_url;
}

/**
 * Upload with timeout
 */
export async function uploadWithTimeout(
  audioBlob: Blob,
  podcastId: string,
  userId: string,
  timeoutMs: number = 30000
): Promise<string> {
  const uploadPromise = uploadAudioToCloudinary(audioBlob, podcastId, userId);
  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("Upload timeout")), timeoutMs)
  );

  return await Promise.race([uploadPromise, timeoutPromise]);
}

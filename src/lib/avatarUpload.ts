import { supabase } from "./supabaseClient";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, matches the bucket's own file_size_limit
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type AvatarUploadError = "too_large" | "invalid_type" | "upload_failed";

export async function uploadTeacherAvatar(teacherId: string, file: File): Promise<{ url: string } | { error: AvatarUploadError }> {
  if (file.size > MAX_SIZE_BYTES) return { error: "too_large" };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "invalid_type" };

  const path = `${teacherId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("teacher-avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) return { error: "upload_failed" };

  const { data } = supabase.storage.from("teacher-avatars").getPublicUrl(path);
  // Cache-bust so a replaced photo shows immediately rather than the
  // previous one lingering from the browser's own cache of the same URL.
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase.from("teachers").update({ avatar_url: url }).eq("id", teacherId);
  if (updateError) return { error: "upload_failed" };

  return { url };
}

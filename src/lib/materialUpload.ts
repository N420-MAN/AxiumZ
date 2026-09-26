import { supabase } from "./supabaseClient";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the bucket's own file_size_limit
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type MaterialUploadError = "too_large" | "invalid_type" | "upload_failed";

export async function uploadMaterialFile(classId: string, file: File): Promise<{ path: string } | { error: MaterialUploadError }> {
  if (file.size > MAX_SIZE_BYTES) return { error: "too_large" };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "invalid_type" };

  const path = `${classId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("course-materials").upload(path, file, { cacheControl: "3600" });
  if (uploadError) return { error: "upload_failed" };

  return { path };
}

export async function getMaterialSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("course-materials").createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

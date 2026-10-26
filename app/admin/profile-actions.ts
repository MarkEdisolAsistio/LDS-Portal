"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "staff-profile-pictures";

export async function updateProfilePicture(formData: FormData) {
  const me = await getMe();
  if (!me) return;

  const file = formData.get("profile_picture");
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024 || !file.type.startsWith("image/")) return;

  const extension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("profile_picture_path").eq("id", me.id).maybeSingle();
  const path = `${me.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("profile picture upload failed:", uploadError.message);
    return;
  }

  const { error: updateError } = await admin.from("profiles").update({ profile_picture_path: path }).eq("id", me.id);
  if (updateError) {
    await admin.storage.from(BUCKET).remove([path]);
    console.error("profile picture save failed:", updateError.message);
    return;
  }

  const oldPath = (profile as unknown as { profile_picture_path?: string | null } | null)?.profile_picture_path;
  if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);
  await audit(me.id, "update_profile_picture", "profile", me.id);
  revalidatePath("/admin");
}

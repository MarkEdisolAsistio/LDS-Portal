"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Login failed:", error.message);

    let errorType = "invalid";
    try {
      const admin = createAdminClient();
      const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const registered = !usersError && users.users.some((user) => user.email?.toLowerCase() === email.toLowerCase());
      if (!registered) errorType = "unregistered";
    } catch (lookupError) {
      console.error("Could not check whether the login email is registered:", lookupError);
    }

    redirect(`/login?error=${errorType}`);
  }
  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

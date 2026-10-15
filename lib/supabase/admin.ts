import { createClient } from "@supabase/supabase-js";

// SERVER ONLY. Uses the secret key, which can do everything in your project.
// Never import this file from a client component or expose the key in the browser.
export function createAdminClient() {
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is missing in .env.local");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

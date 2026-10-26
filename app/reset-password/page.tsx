"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || password.length < 8 || password !== confirm) {
      setMessage(!currentPassword ? "Enter your current password." : password.length < 8 ? "Password must be at least 8 characters." : "Passwords do not match.");
      return;
    }
    const client = createClient();
    const { data: userData } = await client.auth.getUser();
    if (!userData.user?.email) {
      setMessage("This reset link is invalid or expired.");
      return;
    }
    const { error: verifyError } = await client.auth.signInWithPassword({ email: userData.user.email, password: currentPassword });
    if (verifyError) {
      setMessage("Current password is incorrect.");
      return;
    }
    if (password.length < 8 || password !== confirm) {
      setMessage(password.length < 8 ? "Password must be at least 8 characters." : "Passwords do not match.");
      return;
    }
    setSaving(true);
    const { error } = await client.auth.updateUser({ password });
    setSaving(false);
    setMessage(error ? "This reset link is invalid or expired." : "Password updated. You can now sign in.");
    if (!error) setPassword("");
  }

  return <main className="relative flex min-h-screen items-center justify-center bg-center p-6" style={{ backgroundImage: "url('/lds-login-background.png')", backgroundSize: "100% auto", backgroundRepeat: "repeat" }}><div className="absolute inset-0 bg-black/25" aria-hidden="true" /><form onSubmit={submit} className="relative w-full max-w-sm space-y-4 rounded-xl border border-[#0d5a89]/30 bg-white/95 p-6 shadow-2xl backdrop-blur-sm"><h1 className="text-xl font-semibold text-[#0b446a]">Reset your password</h1><label className="block text-sm text-slate-700">Current password<input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" /></label><label className="block text-sm text-slate-700">New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" /></label><label className="block text-sm text-slate-700">Confirm password<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" /></label>{message && <p role="status" className="rounded bg-slate-100 p-2 text-sm text-slate-700">{message}</p>}<button disabled={saving} className="w-full rounded bg-[#0d5a89] py-2 text-white disabled:opacity-50">{saving ? "Saving..." : "Update password"}</button></form></main>;
}

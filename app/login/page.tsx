import { login } from "./actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] bg-center p-6"
      style={{
        backgroundImage: "url('/lds-login-background.png')",
        backgroundSize: "100% auto",
        backgroundRepeat: "repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <form
        action={login}
        className="login-card relative w-full max-w-sm space-y-4 rounded-lg border border-[#0d5a89]/30 bg-white/95 p-6 shadow-2xl backdrop-blur-sm"
      >
        <h1 className="login-title text-xl font-semibold text-[#0b446a]">LDS Employee Portal</h1>

        {error === "invalid" && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
            Wrong email or password.
          </p>
        )}

        {error === "unregistered" && (
          <p role="alert" className="rounded bg-amber-50 p-2 text-sm text-amber-900">
            This account is not registered. Please contact your LDS administrator.
          </p>
        )}

        <label className="block text-sm text-slate-700">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded bg-[#0d5a89] py-2 text-white hover:bg-[#0b446a]"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

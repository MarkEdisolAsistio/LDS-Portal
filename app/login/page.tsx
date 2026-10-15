import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">LDS Portal sign in</h1>

        {error === "invalid" && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
            Wrong email or password.
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
          className="w-full rounded bg-slate-900 py-2 text-white hover:bg-slate-700"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

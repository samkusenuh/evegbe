"use client";

import { createClient } from "@/lib/supabase-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push("/entries");
    router.refresh();
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="font-serif text-3xl font-medium text-ink mb-2">Welcome back</h1>
      <p className="text-sm text-inkmuted mb-6">
        No account?{" "}
        <Link href="/sign-up" className="text-forest font-medium underline">Create one</Link>
      </p>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 text-base bg-parchelev border border-line rounded-xl outline-none focus:border-forest"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 text-base bg-parchelev border border-line rounded-xl outline-none focus:border-forest"
            autoComplete="current-password"
          />
        </label>

        {error && <div className="text-sm text-brick bg-bricksoft p-3 rounded-lg">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full tap bg-forest text-parchment font-semibold rounded-xl py-3 hover:bg-forestdark disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

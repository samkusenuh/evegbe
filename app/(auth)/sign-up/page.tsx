"use client";

import { createClient } from "@/lib/supabase-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isNative, setIsNative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
          display_name: displayName.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If the user is self-logged-in (email confirm disabled), set native flag
    if (data.user && isNative) {
      await supabase.from("profiles").update({ is_native_speaker: true }).eq("id", data.user.id);
    }

    if (data.session) {
      router.push("/entries");
      router.refresh();
    } else {
      setNotice("Check your email to confirm your account, then sign in.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="font-serif text-3xl font-medium text-ink mb-2">Join the community</h1>
      <p className="text-sm text-inkmuted mb-6">
        Help build the best open Ewe dictionary. Already have an account?{" "}
        <Link href="/sign-in" className="text-forest font-medium underline">Sign in</Link>
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Username" required>
          <input
            type="text"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="akosua23"
            className="input"
          />
        </Field>

        <Field label="Display name (optional)">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Akosua Mensah"
            className="input"
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" required>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </Field>

        <label className="flex items-start gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isNative}
            onChange={(e) => setIsNative(e.target.checked)}
            className="mt-1 w-4 h-4 accent-forest"
          />
          <div>
            <div className="font-medium text-sm">I'm a native Ewe speaker</div>
            <div className="text-xs text-inkmuted mt-0.5">
              Native speakers' validations carry extra weight. Please only check this if you grew up speaking Ewe.
            </div>
          </div>
        </label>

        {error && <div className="text-sm text-brick bg-bricksoft p-3 rounded-lg">{error}</div>}
        {notice && <div className="text-sm text-forestdark bg-forestsoft p-3 rounded-lg">{notice}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full tap bg-forest text-parchment font-semibold rounded-xl py-3 hover:bg-forestdark disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 12px 14px;
          font-size: 15px;
          background: #fbf6ea;
          color: #1c2321;
          border: 1px solid #d9cfb8;
          border-radius: 10px;
          outline: none;
          box-sizing: border-box;
        }
        .input:focus { border-color: #2d5a3d; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">
        {label} {required && <span className="text-brick">*</span>}
      </span>
      {children}
    </label>
  );
}

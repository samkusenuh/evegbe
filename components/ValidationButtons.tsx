"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  targetType: "entry" | "recording";
  targetId: string;
  approvalScore: number;
  rejectionScore: number;
  myVerdict: "correct" | "incorrect" | null;
  signedIn: boolean;
};

export default function ValidationButtons({
  targetType,
  targetId,
  approvalScore,
  rejectionScore,
  myVerdict,
  signedIn,
}: Props) {
  const router = useRouter();
  const [verdict, setVerdict] = useState(myVerdict);
  const [approval, setApproval] = useState(approvalScore);
  const [rejection, setRejection] = useState(rejectionScore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = async (v: "correct" | "incorrect") => {
    if (!signedIn) {
      setError("Sign in to vote.");
      return;
    }
    if (verdict === v) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Sign in again.");
      setBusy(false);
      return;
    }

    // Upsert validation (one per user per target)
    const { error: err } = await supabase.from("validations").upsert(
      {
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        verdict: v,
      },
      { onConflict: "user_id,target_type,target_id" },
    );

    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }

    // Optimistic update
    if (v === "correct") setApproval((n) => n + 1);
    else setRejection((n) => n + 1);
    setVerdict(v);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => vote("correct")}
        disabled={busy || !signedIn}
        className={`tap inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition disabled:opacity-50 ${
          verdict === "correct"
            ? "bg-forest text-parchment border-forest"
            : "bg-parchelev text-forestdark border-line hover:border-forest"
        }`}
      >
        <Check size={14} /> {approval}
      </button>
      <button
        onClick={() => vote("incorrect")}
        disabled={busy || !signedIn}
        className={`tap inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition disabled:opacity-50 ${
          verdict === "incorrect"
            ? "bg-brick text-parchment border-brick"
            : "bg-parchelev text-brick border-line hover:border-brick"
        }`}
      >
        <X size={14} /> {rejection}
      </button>
      {error && <span className="text-xs text-brick">{error}</span>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import ValidationButtons from "./ValidationButtons";

type Recording = {
  id: string;
  storage_path: string;
  duration_ms: number | null;
  approval_score: number;
  rejection_score: number;
  user_id: string | null;
  uploader?: { username: string; is_native_speaker: boolean } | null;
};

type Props = {
  recordings: Recording[];
  myVotes: Record<string, "correct" | "incorrect">;
  signedIn: boolean;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function RecordingList({ recordings, myVotes, signedIn }: Props) {
  if (recordings.length === 0) {
    return <div className="text-sm text-inkmuted italic">No recordings yet — be the first.</div>;
  }
  return (
    <ul className="space-y-2">
      {recordings
        .slice()
        .sort((a, b) => b.approval_score - a.approval_score)
        .map((r) => (
          <RecordingRow key={r.id} r={r} myVote={myVotes[r.id] ?? null} signedIn={signedIn} />
        ))}
    </ul>
  );
}

function RecordingRow({
  r,
  myVote,
  signedIn,
}: {
  r: Recording;
  myVote: "correct" | "incorrect" | null;
  signedIn: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    // Public bucket URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${r.storage_path}`;
    setUrl(publicUrl);
  }, [r.storage_path]);

  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    a.onplay = () => setPlaying(true);
    setAudio(a);
    return () => { a.pause(); };
  }, [url]);

  const toggle = () => {
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  };

  return (
    <li className="flex items-center justify-between gap-3 bg-parchelev border border-line rounded-lg px-3 py-2.5">
      <button
        onClick={toggle}
        className="tap inline-flex items-center gap-2 bg-ink text-parchment px-3 py-2 rounded-lg font-semibold text-sm"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "play"}
      </button>
      <div className="flex-1 min-w-0 text-xs text-inkmuted">
        by <span className="font-semibold text-ink">{r.uploader?.username ?? "unknown"}</span>
        {r.uploader?.is_native_speaker && (
          <span className="ml-1 text-[9px] uppercase tracking-wider font-bold bg-forestsoft text-forestdark px-1.5 py-0.5 rounded-full">
            native
          </span>
        )}
      </div>
      <ValidationButtons
        targetType="recording"
        targetId={r.id}
        approvalScore={r.approval_score}
        rejectionScore={r.rejection_score}
        myVerdict={myVote}
        signedIn={signedIn}
      />
    </li>
  );
}

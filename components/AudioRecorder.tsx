"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, X, Play, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

type Status = "idle" | "recording" | "preview" | "uploading";

export default function AudioRecorder({
  entryId,
  onUploaded,
}: {
  entryId: string;
  onUploaded?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const pickMimeType = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
    for (const t of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        setStatus("preview");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start();
      startTimeRef.current = Date.now();
      setElapsed(0);
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        const e = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(e);
        if (e >= 10) stop(); // auto-stop at 10 seconds
      }, 100);
    } catch (err: any) {
      setError(err.message || "Microphone access denied.");
    }
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setBlob(null);
    setStatus("idle");
    setElapsed(0);
  };

  const upload = async () => {
    if (!blob) return;
    setStatus("uploading");
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${entryId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("recordings")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insertErr } = await supabase.from("recordings").insert({
        entry_id: entryId,
        user_id: user.id,
        storage_path: path,
        duration_ms: Math.round(elapsed * 1000),
      });
      if (insertErr) throw insertErr;

      reset();
      onUploaded?.();
    } catch (err: any) {
      setError(err.message || "Upload failed.");
      setStatus("preview");
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  return (
    <div className="bg-parchsunken rounded-xl p-4 border border-line">
      <div className="flex items-center gap-3 flex-wrap">
        {status === "idle" && (
          <button
            onClick={start}
            className="tap inline-flex items-center gap-2 bg-brick text-parchment px-4 py-2.5 rounded-xl font-semibold hover:opacity-90"
          >
            <Mic size={18} /> Record pronunciation
          </button>
        )}

        {status === "recording" && (
          <>
            <button
              onClick={stop}
              className="tap inline-flex items-center gap-2 bg-brick text-parchment px-4 py-2.5 rounded-xl font-semibold animate-pulse"
            >
              <Square size={18} fill="currentColor" /> Stop
            </button>
            <span className="font-mono text-sm text-brick font-semibold">
              {elapsed.toFixed(1)}s / 10.0s
            </span>
          </>
        )}

        {status === "preview" && audioUrl && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
            <button
              onClick={togglePlay}
              className="tap inline-flex items-center gap-2 bg-parchelev border border-line px-3 py-2.5 rounded-xl font-semibold"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={upload}
              className="tap inline-flex items-center gap-2 bg-forest text-parchment px-4 py-2.5 rounded-xl font-semibold hover:bg-forestdark"
            >
              <Upload size={16} /> Save
            </button>
            <button
              onClick={reset}
              className="tap inline-flex items-center gap-2 bg-parchelev border border-line px-3 py-2.5 rounded-xl font-semibold text-inkmuted"
              aria-label="Discard"
            >
              <X size={16} />
            </button>
          </>
        )}

        {status === "uploading" && (
          <span className="text-sm text-inkmuted">Uploading…</span>
        )}
      </div>

      {error && <div className="text-sm text-brick mt-3">{error}</div>}
      <div className="text-xs text-inkmuted mt-3">
        Keep it short (max 10s). Speak clearly. Mobile browsers will ask for microphone permission.
      </div>
    </div>
  );
}

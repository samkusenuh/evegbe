import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ValidationButtons from "@/components/ValidationButtons";
import RecordingList from "@/components/RecordingList";
import AudioRecorderWrapper from "./AudioRecorderWrapper";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("entries")
    .select(
      "id, ewe, english, notes, entry_type, status, approval_score, rejection_score, created_at, group:groups(slug, name), submitter:profiles!entries_submitted_by_fkey(username, display_name, is_native_speaker)"
    )
    .eq("id", id)
    .single();

  if (!entry) notFound();

  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, storage_path, duration_ms, approval_score, rejection_score, user_id, uploader:profiles!recordings_user_id_fkey(username, is_native_speaker)")
    .eq("entry_id", id);

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch this user's existing votes
  let myVoteOnEntry: "correct" | "incorrect" | null = null;
  let myVotesOnRecordings: Record<string, "correct" | "incorrect"> = {};

  if (user) {
    const { data: votes } = await supabase
      .from("validations")
      .select("target_type, target_id, verdict")
      .eq("user_id", user.id)
      .or(`target_id.eq.${id}` + (recordings?.length ? `,target_id.in.(${recordings.map((r) => r.id).join(",")})` : ""));

    for (const v of votes ?? []) {
      if (v.target_type === "entry" && v.target_id === id) {
        myVoteOnEntry = v.verdict as any;
      } else if (v.target_type === "recording") {
        myVotesOnRecordings[v.target_id] = v.verdict as any;
      }
    }
  }

  const submitter = Array.isArray(entry.submitter) ? entry.submitter[0] : entry.submitter;
  const group = Array.isArray(entry.group) ? entry.group[0] : entry.group;

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      <Link href="/entries" className="inline-flex items-center text-sm text-inkmuted hover:text-ink">
        <ChevronLeft size={16} /> Back to list
      </Link>

      <header className="bg-parchelev border border-line rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {entry.entry_type === "phrase" && (
            <span className="text-[10px] uppercase tracking-wider font-bold text-gold">phrase</span>
          )}
          {group && (
            <Link
              href={`/entries?group=${group.slug}`}
              className="text-xs bg-forestsoft text-forestdark px-2.5 py-0.5 rounded-full font-semibold hover:bg-forest hover:text-parchment transition"
            >
              {group.name}
            </Link>
          )}
          <StatusBadge status={entry.status} />
        </div>
        <h1 className="font-serif text-5xl font-medium text-ink leading-tight tracking-tight break-words">
          {entry.ewe}
        </h1>
        <div className="font-serif text-2xl text-inkmuted mt-2">{entry.english}</div>
        {entry.notes && (
          <div className="mt-4 p-4 bg-goldsoft rounded-xl text-sm text-ink whitespace-pre-wrap">
            {entry.notes}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-inkfaint">
          <span>
            {submitter && (
              <>
                submitted by{" "}
                <span className="font-semibold text-inkmuted">
                  {submitter.display_name || submitter.username}
                </span>
                {submitter.is_native_speaker && (
                  <span className="ml-1 text-[9px] uppercase tracking-wider font-bold bg-forestsoft text-forestdark px-1.5 py-0.5 rounded-full">
                    native
                  </span>
                )}
              </>
            )}
          </span>
          <ValidationButtons
            targetType="entry"
            targetId={entry.id}
            approvalScore={entry.approval_score}
            rejectionScore={entry.rejection_score}
            myVerdict={myVoteOnEntry}
            signedIn={!!user}
          />
        </div>
      </header>

      {/* Recordings */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-serif text-xl font-medium text-ink">Pronunciations</h2>
          <span className="text-xs text-inkmuted">
            {recordings?.length ?? 0} recorded
          </span>
        </div>
        <RecordingList
          recordings={(recordings ?? []).map((r: any) => ({
            ...r,
            uploader: Array.isArray(r.uploader) ? r.uploader[0] : r.uploader,
          }))}
          myVotes={myVotesOnRecordings}
          signedIn={!!user}
        />
        {user ? (
          <div className="mt-4">
            <AudioRecorderWrapper entryId={entry.id} />
          </div>
        ) : (
          <div className="mt-4 text-sm text-inkmuted bg-parchsunken rounded-lg p-3">
            <Link href="/sign-in" className="text-forest font-semibold underline">
              Sign in
            </Link>{" "}
            to add your own recording or vote on others.
          </div>
        )}
      </section>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: "bg-forestsoft", text: "text-forestdark", label: "✓ approved" },
    pending:  { bg: "bg-goldsoft",   text: "text-ink",        label: "pending review" },
    disputed: { bg: "bg-bricksoft",  text: "text-brick",      label: "disputed" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

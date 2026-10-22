"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import CharBar from "@/components/CharBar";

type Group = { id: string; slug: string; name: string };

export default function NewEntryForm({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [ewe, setEwe] = useState("");
  const [english, setEnglish] = useState("");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [entryType, setEntryType] = useState<"word" | "phrase">("word");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eweRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = (c: string) => {
    const el = eweRef.current;
    if (!el) {
      setEwe((v) => v + c);
      return;
    }
    const start = el.selectionStart ?? ewe.length;
    const end = el.selectionEnd ?? ewe.length;
    const next = ewe.slice(0, start) + c + ewe.slice(end);
    setEwe(next);
    requestAnimationFrame(() => {
      if (eweRef.current) {
        eweRef.current.focus();
        eweRef.current.selectionStart = eweRef.current.selectionEnd = start + c.length;
      }
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("entries")
      .insert({
        ewe: ewe.trim(),
        english: english.trim(),
        notes: notes.trim() || null,
        group_id: groupId || null,
        entry_type: entryType,
        submitted_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/entries/${data!.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">
          Ewe <span className="text-brick">*</span>
        </label>
        <input
          ref={eweRef}
          type="text"
          required
          value={ewe}
          onChange={(e) => setEwe(e.target.value)}
          placeholder="e.g. akpé"
          className="ewe-text w-full px-4 py-3 text-2xl bg-parchelev border border-line rounded-xl outline-none focus:border-forest"
        />
        <CharBar onInsert={insertAtCursor} />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">
          English <span className="text-brick">*</span>
        </label>
        <input
          type="text"
          required
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="e.g. thank you"
          className="w-full px-4 py-3 text-base bg-parchelev border border-line rounded-xl outline-none focus:border-forest"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">Group</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full px-4 py-3 text-base bg-parchelev border border-line rounded-xl outline-none focus:border-forest"
          >
            <option value="">— none —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">Type</label>
          <div className="flex gap-2">
            {(["word", "phrase"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                className={`flex-1 py-3 rounded-xl font-semibold capitalize border ${
                  entryType === t ? "bg-ink text-parchment border-ink" : "bg-parchelev border-line text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-inkmuted mb-2">
          Notes <span className="text-inkfaint normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="context, example sentence, pronunciation tips…"
          className="w-full px-4 py-3 text-base bg-parchelev border border-line rounded-xl outline-none focus:border-forest resize-y"
        />
      </div>

      {error && <div className="text-sm text-brick bg-bricksoft p-3 rounded-lg">{error}</div>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="tap px-5 py-3 bg-parchelev border border-line rounded-xl font-semibold text-inkmuted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !ewe.trim() || !english.trim()}
          className="tap flex-1 bg-forest text-parchment font-semibold rounded-xl py-3 hover:bg-forestdark disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit entry"}
        </button>
      </div>
    </form>
  );
}

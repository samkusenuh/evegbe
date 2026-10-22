"use client";

import { createClient } from "@/lib/supabase-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [isNative, setIsNative] = useState(profile.is_native_speaker);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        is_native_speaker: isNative,
      })
      .eq("id", profile.id);
    if (error) setNotice(error.message);
    else {
      setNotice("Saved.");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="bg-parchelev border border-line rounded-xl p-5 space-y-4">
      <h2 className="font-serif text-xl font-medium text-ink">Profile settings</h2>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-inkmuted mb-1 block">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2.5 bg-parchment border border-line rounded-lg outline-none focus:border-forest"
        />
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isNative}
          onChange={(e) => setIsNative(e.target.checked)}
          className="mt-1 w-4 h-4 accent-forest"
        />
        <div>
          <div className="font-medium text-sm">Native Ewe speaker</div>
          <div className="text-xs text-inkmuted mt-0.5">
            Your validations count 3× when this is on. Only enable if you grew up speaking Ewe.
          </div>
        </div>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="tap bg-forest text-parchment px-4 py-2 rounded-lg font-semibold hover:bg-forestdark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {notice && <span className="text-sm text-inkmuted">{notice}</span>}
      </div>
    </form>
  );
}

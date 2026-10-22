import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Mic, Users, Check, Zap } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  // Quick stats
  const [{ count: entryCount }, { count: recordingCount }, { count: userCount }] =
    await Promise.all([
      supabase.from("entries").select("*", { count: "exact", head: true }),
      supabase.from("recordings").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  // Top native speakers / contributors
  const { data: topContributors } = await supabase
    .from("profiles")
    .select("username, display_name, reputation, is_native_speaker")
    .order("reputation", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <h1 className="font-serif text-5xl sm:text-6xl font-medium tracking-tight text-ink">
          Learn <span className="text-forest">Eʋegbe</span>, together.
        </h1>
        <p className="mt-4 text-lg text-inkmuted max-w-xl mx-auto">
          A community-built library of Ewe words and short phrases — with real pronunciations recorded and validated by native speakers.
        </p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Link href="/entries" className="tap px-6 py-3 rounded-xl bg-forest text-parchment font-semibold hover:bg-forestdark transition">
            Browse words
          </Link>
          <Link href="/sign-up" className="tap px-6 py-3 rounded-xl bg-parchelev border border-line font-semibold text-ink hover:bg-parchsunken transition">
            Join the community
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[
          { label: "words & phrases", value: entryCount ?? 0 },
          { label: "recordings", value: recordingCount ?? 0 },
          { label: "contributors", value: userCount ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-parchelev border border-line rounded-xl p-4 text-center">
            <div className="font-serif text-3xl font-medium text-ink">{s.value}</div>
            <div className="text-xs uppercase tracking-wide text-inkmuted mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section>
        <h2 className="font-serif text-2xl font-medium text-ink mb-6 text-center">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Zap size={22} />,
              title: "Contribute",
              body: "Add words or short phrases you've learned. Use the Ewe keyboard panel to type ɖ ɛ ƒ ɣ ŋ ɔ ʋ and tone marks.",
            },
            {
              icon: <Mic size={22} />,
              title: "Record",
              body: "Attach an audio recording so others can hear how it's pronounced. Record once, help thousands.",
            },
            {
              icon: <Check size={22} />,
              title: "Validate",
              body: "Vote on entries and recordings. Native speakers' votes count more. Approved words become the trusted dictionary.",
            },
          ].map((c) => (
            <div key={c.title} className="bg-parchelev border border-line rounded-xl p-5">
              <div className="text-forest mb-2">{c.icon}</div>
              <h3 className="font-semibold text-ink mb-1">{c.title}</h3>
              <p className="text-sm text-inkmuted leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      {topContributors && topContributors.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-medium text-ink mb-4 flex items-center gap-2">
            <Users size={22} /> Top contributors
          </h2>
          <div className="bg-parchelev border border-line rounded-xl divide-y divide-line">
            {topContributors.map((p, i) => (
              <div key={p.username} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-inkfaint font-semibold w-5">{i + 1}</span>
                  <span className="font-medium text-ink">{p.display_name || p.username}</span>
                  {p.is_native_speaker && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-forestsoft text-forestdark px-2 py-0.5 rounded-full">
                      native
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-gold">{p.reputation} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

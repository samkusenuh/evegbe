import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Award, Mic, BookOpen } from "lucide-react";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const [{ count: entryCount }, { count: recordingCount }, { data: events }] =
    await Promise.all([
      supabase.from("entries").select("*", { count: "exact", head: true }).eq("submitted_by", user.id),
      supabase.from("recordings").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("reputation_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (!profile) return <div>Profile not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="bg-parchelev border border-line rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-ink">
              {profile.display_name || profile.username}
            </h1>
            <div className="text-sm text-inkmuted">@{profile.username}</div>
            {profile.is_native_speaker && (
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold bg-forestsoft text-forestdark px-2 py-0.5 rounded-full">
                native speaker
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="font-serif text-4xl font-medium text-gold">{profile.reputation}</div>
            <div className="text-xs uppercase tracking-wide text-inkmuted">reputation</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatTile icon={<BookOpen size={20} />} label="entries submitted" value={entryCount ?? 0} />
        <StatTile icon={<Mic size={20} />} label="recordings" value={recordingCount ?? 0} />
      </section>

      <ProfileForm profile={profile} />

      <section>
        <h2 className="font-serif text-xl font-medium text-ink mb-3 flex items-center gap-2">
          <Award size={20} /> Recent activity
        </h2>
        {events && events.length > 0 ? (
          <ul className="bg-parchelev border border-line rounded-xl divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-inkmuted">{e.description || e.event_type}</span>
                <span className={`font-bold ${e.points > 0 ? "text-forest" : "text-brick"}`}>
                  {e.points > 0 ? "+" : ""}{e.points}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-inkmuted italic">
            Nothing yet.{" "}
            <Link href="/entries/new" className="text-forest font-semibold underline">
              Add your first entry
            </Link>{" "}
            to start earning points.
          </p>
        )}
      </section>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-parchelev border border-line rounded-xl p-4">
      <div className="flex items-center gap-2 text-inkmuted">{icon}</div>
      <div className="font-serif text-3xl font-medium text-ink mt-2">{value}</div>
      <div className="text-xs text-inkmuted uppercase tracking-wide">{label}</div>
    </div>
  );
}

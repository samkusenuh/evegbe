import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Plus, Mic } from "lucide-react";

export const revalidate = 30;

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string; status?: string }>;
}) {
  const { group, q, status } = await searchParams;
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .order("display_order");

  let query = supabase
    .from("entries")
    .select("id, ewe, english, notes, entry_type, status, approval_score, group_id, group:groups(slug, name), recordings(id)")
    .order("ewe")
    .limit(500);

  if (group) {
    const groupRow = groups?.find((g) => g.slug === group);
    if (groupRow) query = query.eq("group_id", groupRow.id);
  }

  if (status && ["pending", "approved", "disputed"].includes(status)) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`ewe.ilike.%${q}%,english.ilike.%${q}%`);
  }

  const { data: entries } = await query;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Words &amp; phrases</h1>
          <p className="text-sm text-inkmuted mt-1">
            {entries?.length ?? 0} shown
            {group && ` in ${groups?.find((g) => g.slug === group)?.name}`}
            {status && ` · ${status}`}
          </p>
        </div>
        {user && (
          <Link href="/entries/new" className="tap inline-flex items-center gap-2 bg-forest text-parchment font-semibold px-4 py-2 rounded-xl hover:bg-forestdark">
            <Plus size={18} /> Add entry
          </Link>
        )}
      </div>

      <form action="/entries" method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q || ""}
          placeholder="Search Ewe or English…"
          className="flex-1 px-4 py-2.5 bg-parchelev border border-line rounded-xl text-base outline-none focus:border-forest"
        />
        {group && <input type="hidden" name="group" value={group} />}
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="tap px-5 py-2.5 bg-ink text-parchment rounded-xl font-semibold">
          Search
        </button>
      </form>

      {/* Group pills */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <Link
          href={`/entries${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
            !group ? "bg-ink text-parchment border-ink" : "bg-parchelev text-ink border-line"
          }`}
        >
          All
        </Link>
        {groups?.map((g) => (
          <Link
            key={g.slug}
            href={`/entries?group=${g.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap ${
              group === g.slug ? "bg-ink text-parchment border-ink" : "bg-parchelev text-ink border-line hover:bg-parchsunken"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 text-xs">
        <span className="text-inkfaint font-semibold uppercase tracking-wide py-1">Status:</span>
        {["all", "approved", "pending", "disputed"].map((s) => {
          const current = status || "all";
          const params = new URLSearchParams();
          if (group) params.set("group", group);
          if (q) params.set("q", q);
          if (s !== "all") params.set("status", s);
          return (
            <Link
              key={s}
              href={`/entries?${params.toString()}`}
              className={`px-2.5 py-1 rounded-full ${
                current === s ? "bg-ink text-parchment" : "bg-parchsunken text-inkmuted"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      {/* Entries */}
      {!entries || entries.length === 0 ? (
        <div className="text-center py-16 text-inkmuted">
          <div className="font-serif text-5xl text-line mb-3">ɖɛƒ</div>
          <p>No entries match.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`/entries/${e.id}`}
              className="group bg-parchelev border border-line rounded-xl p-4 hover:border-forest transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-2xl font-medium text-ink leading-tight break-words">
                    {e.ewe}
                  </div>
                  <div className="text-sm text-inkmuted mt-1">{e.english}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {e.entry_type === "phrase" && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gold">phrase</span>
                    )}
                    {e.group && (
                      <span className="text-[11px] bg-forestsoft text-forestdark px-2 py-0.5 rounded-full font-semibold">
                        {(e.group as any).name}
                      </span>
                    )}
                    <StatusBadge status={e.status} />
                    {e.recordings && e.recordings.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-forestdark font-semibold">
                        <Mic size={11} /> {e.recordings.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: "bg-forestsoft", text: "text-forestdark", label: "✓ approved" },
    pending:  { bg: "bg-goldsoft",   text: "text-ink",        label: "pending" },
    disputed: { bg: "bg-bricksoft",  text: "text-brick",      label: "disputed" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

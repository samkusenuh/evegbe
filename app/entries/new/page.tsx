import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import NewEntryForm from "./NewEntryForm";

export default async function NewEntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, slug, name")
    .order("display_order");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-medium text-ink mb-2">Add a word or phrase</h1>
      <p className="text-sm text-inkmuted mb-6">
        Your submission goes to the community for review. Native speakers' votes carry extra weight.
      </p>
      <NewEntryForm groups={groups ?? []} />
    </div>
  );
}

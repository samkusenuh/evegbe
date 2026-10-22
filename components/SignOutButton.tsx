"use client";

import { createClient } from "@/lib/supabase-client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <button
      onClick={signOut}
      className="tap flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-parchsunken transition text-sm font-medium text-inkmuted"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut size={16} />
    </button>
  );
}

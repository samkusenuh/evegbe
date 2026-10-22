import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { BookOpen, User, LogIn } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Eʋegbe — community learning",
  description: "A community-driven platform for learning the Ewe language.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, reputation, is_native_speaker")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en">
      <body>
        <header className="border-b border-line bg-parchelev sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif text-2xl font-medium tracking-tight text-ink group-hover:text-forest transition">
                Eʋegbe
              </span>
              <span className="text-xs text-inkmuted hidden sm:inline">community learning</span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-3 text-sm font-medium">
              <Link href="/entries" className="tap flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-parchsunken transition">
                <BookOpen size={16} /> <span className="hidden sm:inline">Words</span>
              </Link>
              {user && profile ? (
                <>
                  <Link href="/profile" className="tap flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-parchsunken transition">
                    <User size={16} />
                    <span className="hidden sm:inline">{profile.display_name || profile.username}</span>
                    <span className="text-xs bg-gold text-ink px-2 py-0.5 rounded-full font-semibold">
                      {profile.reputation}
                    </span>
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="tap flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-parchsunken transition">
                    <LogIn size={16} /> Sign in
                  </Link>
                  <Link href="/sign-up" className="tap px-4 py-2 rounded-lg bg-forest text-parchment font-semibold hover:bg-forestdark transition">
                    Join
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-line mt-16 py-6 text-center text-xs text-inkfaint">
          Built by the community · Seed vocabulary from{" "}
          <a href="https://philtypo3.uni-koeln.de/sites/inst_afrika/pdf/BASIC_EWE_2nd_ed.pdf" className="underline" target="_blank" rel="noopener">
            Basic Ewe (Dzablu-Kumah, Claudi, Ossey)
          </a>
        </footer>
      </body>
    </html>
  );
}

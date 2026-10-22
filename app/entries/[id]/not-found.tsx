import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="font-serif text-6xl text-line mb-4">404</div>
      <p className="text-inkmuted mb-6">That entry doesn't exist (or was deleted).</p>
      <Link href="/entries" className="tap inline-block bg-forest text-parchment px-5 py-3 rounded-xl font-semibold">
        Back to list
      </Link>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Store not found | Falcon 360",
  robots: { index: false, follow: false },
};

export default function StoreNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A13] px-4 text-white">
      <div className="max-w-md space-y-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-teal-300">
          <Store className="h-8 w-8" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight">This store isn&apos;t available</h1>
        <p className="text-slate-300">
          The store address you opened doesn&apos;t exist, or the store is currently closed. Please check the link and
          try again.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="https://www.falcon360.in"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:scale-[1.03]"
          >
            Go to Falcon 360
          </Link>
          <Link
            href="https://www.falcon360.in/register"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Open your own online store
          </Link>
        </div>
      </div>
    </main>
  );
}

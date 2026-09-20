"use client";

import dynamic from "next/dynamic";

// three.js is large: load it only on the client, after the page text has painted.
const PosScene3D = dynamic(() => import("./PosScene3D").then((m) => m.PosScene3D), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-indigo-500/20 blur-3xl" />
    </div>
  ),
});

export function HeroScene({ className = "" }: { className?: string }) {
  return <PosScene3D className={className} />;
}

import type { ReactNode } from "react";

export function SectionHead({
  eyebrow,
  title,
  sub,
  dark = false,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  dark?: boolean;
  align?: "center" | "left";
}) {
  return (
    <div className={`max-w-2xl space-y-4 ${align === "center" ? "mx-auto text-center" : ""}`}>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
          dark
            ? "border-white/15 bg-white/5 text-indigo-200"
            : "border-indigo-200 bg-indigo-50 text-indigo-700"
        }`}
      >
        {eyebrow}
      </span>
      <h2
        className={`font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-[2.7rem] ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p className={`text-base leading-relaxed sm:text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>{sub}</p>
      )}
    </div>
  );
}

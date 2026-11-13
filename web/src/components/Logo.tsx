export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M4 17l5-5 4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      FinTrack
    </span>
  );
}

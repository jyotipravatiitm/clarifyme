/** Keyboard hint, shown on desktop only. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="hidden rounded-md border-2 border-b-4 border-line bg-surface px-1.5 font-sans text-[11px] font-black text-ink-soft lg:inline">
      {children}
    </kbd>
  );
}

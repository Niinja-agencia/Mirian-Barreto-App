import { Loader2 } from 'lucide-react';

export default function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[var(--color-black)]">
      <Loader2 className="animate-spin text-[var(--color-rose)]" size={40} />
      {label && <p className="text-[var(--color-medium-grey)] text-sm">{label}</p>}
    </div>
  );
}

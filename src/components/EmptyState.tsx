import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon: Icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-800/60 border border-neutral-700/50 mb-4">
        <Icon size={22} className="text-neutral-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-medium text-neutral-300 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-xs text-neutral-500 text-center max-w-[240px] mb-4">{subtitle}</p>
      )}
      {ctaLabel && onCta && (
        <Button size="sm" variant="outline" onClick={onCta} className="mt-2">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

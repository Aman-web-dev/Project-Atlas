import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface UsageMeterProps {
  usedUsd: number;
  limitUsd: number;
  /** Optional feature scope. */
  scope?: string;
  className?: string;
}

export function UsageMeter({ usedUsd, limitUsd, scope, className }: UsageMeterProps) {
  const pct = limitUsd > 0 ? Math.min(100, Math.round((usedUsd / limitUsd) * 100)) : 0;
  const tone =
    pct >= 90 ? "text-red-500" : pct >= 75 ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {scope ? <span className="capitalize">{scope}</span> : "Monthly"} spend
        </span>
        <span className={cn("font-mono", tone)}>
          ${usedUsd.toFixed(2)} <span className="text-muted-foreground">/ ${limitUsd.toFixed(2)}</span>
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

// C:\Projects\animanga-platform\apps\web\src\features\auth\password-strength-meter.tsx
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluatePasswordStrength } from "./auth.utils";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { checks, score } = evaluatePasswordStrength(password);

  return (
    <div className="pt-1.5 animate-in fade-in duration-200">
      <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden mb-1.5">
        <div
          className={cn(
            "h-full flex-1 transition-all duration-300",
            score >= 1 ? "bg-destructive" : "bg-muted",
          )}
        />
        <div
          className={cn(
            "h-full flex-1 transition-all duration-300",
            score >= 2 ? "bg-warning" : "bg-muted",
          )}
        />
        <div
          className={cn(
            "h-full flex-1 transition-all duration-300",
            score >= 3 ? "bg-info" : "bg-muted",
          )}
        />
        <div
          className={cn(
            "h-full flex-1 transition-all duration-300",
            score >= 4 ? "bg-success" : "bg-muted",
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-y-0.5 gap-x-2 text-[9px] sm:text-[10px] text-muted-foreground">
        {[
          { ok: checks.length, label: "12+ chars" },
          { ok: checks.casing, label: "Upper & lowercase" },
          { ok: checks.number, label: "1+ number" },
          { ok: checks.special, label: "1+ special" },
        ].map(({ ok, label }) => (
          <div key={label} className="flex items-center gap-1">
            {ok ? (
              <Check className="w-3 h-3 text-success shrink-0" />
            ) : (
              <X className="w-3 h-3 text-destructive shrink-0" />
            )}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

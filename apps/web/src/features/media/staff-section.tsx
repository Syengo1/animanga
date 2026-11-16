// C:\Projects\animanga-platform\apps\web\src\features\media\staff-section.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaStaffDto } from "@/lib/api/types/media";

interface StaffSectionProps {
  staff: MediaStaffDto[];
  accentColor: string;
}

export function StaffSection({ staff, accentColor }: StaffSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_VISIBLE = 6;

  if (!staff || staff.length === 0) return null;

  const hasMore = staff.length > INITIAL_VISIBLE;
  const visibleStaff = isExpanded ? staff : staff.slice(0, INITIAL_VISIBLE);
  const hiddenCount = staff.length - INITIAL_VISIBLE;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground flex items-center gap-2.5">
          <span
            className="w-2 h-7 rounded-sm"
            style={{ backgroundColor: accentColor }}
          />
          Production Staff
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
            {staff.length}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {visibleStaff.map((member) => (
          <div
            key={member.id}
            className="h-[84px] flex bg-card border border-border rounded-xl overflow-hidden shadow-xs hover:border-primary/40 transition-all"
          >
            <div className="w-[62px] h-full shrink-0 bg-muted flex items-center justify-center relative">
              {member.image ? (
                <Image
                  src={member.image}
                  alt={member.name}
                  width={62}
                  height={84}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col justify-center p-3 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                {member.name}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground line-clamp-2 mt-0.5">
                {member.roles.join(", ") || "Staff"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-9 px-4 rounded-xl font-bold text-xs gap-1.5 bg-card hover:bg-accent border-border cursor-pointer"
          >
            <span>
              {isExpanded
                ? "Show Less Staff"
                : `Show ${hiddenCount} More Staff (${staff.length} Total)`}
            </span>
            {isExpanded ? (
              <ChevronUp
                className="w-3.5 h-3.5"
                style={{ color: accentColor }}
              />
            ) : (
              <ChevronDown
                className="w-3.5 h-3.5"
                style={{ color: accentColor }}
              />
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

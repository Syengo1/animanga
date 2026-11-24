// C:\Projects\animanga-platform\apps\web\src\features\schedule\schedule-utils.ts
import type { ScheduleApiItem } from "@/app/api/schedule/route";

export interface ScheduleDayGroup {
  dayKey: string; // YYYY-MM-DD in local timezone
  dateLabel: string; // e.g. "24 NOV"
  weekdayLabel: string; // e.g. "TUESDAY"
  shortTabLabel: string; // e.g. "Today", "Wed 25"
  isToday: boolean;
  isTomorrow: boolean;
  items: ScheduleApiItem[];
}

export function getLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatClockToSecond(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatGmtOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;
  return mins > 0
    ? `GMT${sign}${hours}:${String(mins).padStart(2, "0")}`
    : `GMT${sign}${hours}`;
}

export function formatReleaseTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatMinutesUntil(airingAtSec: number, nowMs: number): string {
  const diffMin = Math.max(1, Math.ceil((airingAtSec * 1000 - nowMs) / 60_000));
  if (diffMin < 60) return `in ${diffMin}m`;
  const hrs = Math.floor(diffMin / 60);
  const rem = diffMin % 60;
  return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

export function groupScheduleByLocalDay(
  items: ScheduleApiItem[],
  nowDate: Date,
): ScheduleDayGroup[] {
  const todayKey = getLocalDayKey(nowDate);
  const tomorrowDate = new Date(nowDate);
  tomorrowDate.setDate(nowDate.getDate() + 1);
  const tomorrowKey = getLocalDayKey(tomorrowDate);

  const dayMap = new Map<string, ScheduleDayGroup>();

  for (const item of items) {
    const itemDate = new Date(item.airingAt * 1000);
    const key = getLocalDayKey(itemDate);

    // Exclude yesterday's buffer entries; keep Today through +7 days
    if (key < todayKey) continue;

    let group = dayMap.get(key);
    if (!group) {
      const dayNum = String(itemDate.getDate()).padStart(2, "0");
      const monthShort = itemDate
        .toLocaleDateString("en-US", { month: "short" })
        .toUpperCase();
      const weekdayLong = itemDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      const weekdayShort = itemDate.toLocaleDateString("en-US", {
        weekday: "short",
      });

      const isToday = key === todayKey;
      const isTomorrow = key === tomorrowKey;

      group = {
        dayKey: key,
        dateLabel: `${dayNum} ${monthShort}`,
        weekdayLabel: weekdayLong,
        shortTabLabel: isToday
          ? "Today"
          : isTomorrow
            ? "Tomorrow"
            : `${weekdayShort} ${itemDate.getDate()}`,
        isToday,
        isTomorrow,
        items: [],
      };
      dayMap.set(key, group);
    }

    group.items.push(item);
  }

  return Array.from(dayMap.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey),
  );
}

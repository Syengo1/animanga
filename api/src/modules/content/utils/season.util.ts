// C:\Projects\animanga-platform\api\src\modules\content\utils\season.util.ts
import { MediaSeason } from '../interfaces/media-provider.interface';

export function getSeasonalContext(referenceDate: Date = new Date()): {
  currentSeason: Exclude<MediaSeason, null>;
  currentYear: number;
  nextSeason: Exclude<MediaSeason, null>;
  nextYear: number;
} {
  const month = referenceDate.getUTCMonth(); // 0-11
  const currentYear = referenceDate.getUTCFullYear();

  if (month >= 0 && month <= 2) {
    return {
      currentSeason: 'WINTER',
      currentYear,
      nextSeason: 'SPRING',
      nextYear: currentYear,
    };
  }
  if (month >= 3 && month <= 5) {
    return {
      currentSeason: 'SPRING',
      currentYear,
      nextSeason: 'SUMMER',
      nextYear: currentYear,
    };
  }
  if (month >= 6 && month <= 8) {
    return {
      currentSeason: 'SUMMER',
      currentYear,
      nextSeason: 'FALL',
      nextYear: currentYear,
    };
  }
  return {
    currentSeason: 'FALL',
    currentYear,
    nextSeason: 'WINTER',
    nextYear: currentYear + 1,
  };
}

import { MediaSeason } from '../interfaces/media-provider.interface';

export function getSeasonalContext() {
  const date = new Date();
  const month = date.getMonth(); // 0-11
  let currentYear = date.getFullYear();

  let currentSeason: MediaSeason;
  let nextSeason: MediaSeason;
  let nextYear = currentYear;

  if (month >= 2 && month <= 4) {
    currentSeason = 'SPRING';
    nextSeason = 'SUMMER';
  } else if (month >= 5 && month <= 7) {
    currentSeason = 'SUMMER';
    nextSeason = 'FALL';
  } else if (month >= 8 && month <= 10) {
    currentSeason = 'FALL';
    nextSeason = 'WINTER';
    nextYear = currentYear + 1; // Fall transitions into Winter of the next year
  } else {
    currentSeason = 'WINTER';
    nextSeason = 'SPRING';
    if (month === 11) {
      currentYear += 1;
      nextYear += 1;
    }
  }

  return { currentSeason, currentYear, nextSeason, nextYear };
}

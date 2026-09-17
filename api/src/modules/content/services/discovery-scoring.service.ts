import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscoveryScoringService {
  // Rough upper bound for normalization (e.g., Attack on Titan / One Piece)
  private readonly MAX_POPULARITY = 500000;

  calculatePopularityScore(popularity: number): number {
    if (!popularity || popularity <= 0) return 0;
    const score = Math.log(1 + popularity) / Math.log(1 + this.MAX_POPULARITY);
    return Math.min(Math.max(score, 0), 1.0);
  }

  calculateUrgencyScore(startDate: Date | undefined | null): number {
    if (!startDate) return 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const diffTime = startDate.getTime() - today.getTime();
    const daysUntilRelease = Math.max(
      0,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
    );

    // Decays smoothly: 1 day = 0.96, 30 days = 0.50, 180 days = 0.14
    return 1 / (1 + daysUntilRelease / 30);
  }

  calculateFinalUpcomingScore(
    popularity: number,
    startDate: Date | undefined | null,
    editorialMultiplier = 1.0,
  ) {
    const popScore = this.calculatePopularityScore(popularity);
    const urgScore = this.calculateUrgencyScore(startDate);

    const baseScore = 0.55 * urgScore + 0.45 * popScore;
    const finalScore = baseScore * editorialMultiplier;

    return { baseScore, finalScore, popScore, urgScore };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import {
  CanonicalMedia,
  MediaType,
  MediaSeason,
} from '../interfaces/media-provider.interface';
import { AniListAdapter } from '../adapters/anilist.adapter';

@Injectable()
export class MediaDataService {
  private readonly logger = new Logger(MediaDataService.name);

  // Injecting the specific adapter for now.
  // Later we can inject an array of providers for fallback logic (Jikan).
  constructor(private readonly primaryProvider: AniListAdapter) {}

  async search(options: {
    query: string;
    type?: MediaType;
    limit?: number;
  }): Promise<CanonicalMedia[]> {
    return this.primaryProvider.search({ ...options, query: options.query });
  }

  async getTrending(
    type: MediaType = 'ANIME',
    limit?: number,
  ): Promise<CanonicalMedia[]> {
    return this.primaryProvider.getTrending(type, limit);
  }

  async getCurrentlyReleasing(
    type: MediaType = 'ANIME',
    limit?: number,
  ): Promise<CanonicalMedia[]> {
    return this.primaryProvider.getCurrentlyReleasing(type, limit);
  }

  async getSeasonal(
    type: MediaType = 'ANIME',
    season: Exclude<MediaSeason, null>,
    year: number,
    limit?: number,
  ): Promise<CanonicalMedia[]> {
    return this.primaryProvider.getSeasonal(type, season, year, limit);
  }

  async getById(
    provider: string,
    externalId: string,
    type?: MediaType,
  ): Promise<CanonicalMedia | null> {
    if (provider !== this.primaryProvider.providerName) {
      this.logger.warn(
        `Provider ${provider} requested, but only ${this.primaryProvider.providerName} is currently active.`,
      );
      return null;
    }
    return this.primaryProvider.getById(externalId, type);
  }
}

import { Controller, Get, Logger } from '@nestjs/common';
import { DiscoveryEngineService } from '../services/discovery-engine.service';
import { HomeDiscoveryResponseDto } from '../dto/discovery.dto';

@Controller('discovery')
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name);

  constructor(private readonly discoveryEngine: DiscoveryEngineService) {}

  @Get('home')
  async getHomeFeeds(): Promise<{
    success: boolean;
    data: HomeDiscoveryResponseDto;
  }> {
    this.logger.log('Fetching unified home discovery feeds...');
    const data = await this.discoveryEngine.getHomeDiscoveryFeeds();
    return { success: true, data };
  }
}

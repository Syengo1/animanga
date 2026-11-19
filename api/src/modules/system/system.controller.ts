// C:\Projects\animanga-platform\api\src\modules\system\system.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('system')
export class SystemController {
  @Get('health')
  @Header('Cache-Control', 'no-store, max-age=0')
  getHealth() {
    return { ok: true };
  }
}

import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot(): { status: string } {
    return { status: 'ok' };
  }

  @Public()
  @Get('health')
  getHealth(): { name: string; version: string; status: string } {
    return {
      name: 'Monibase FX API',
      version: '1.0.0',
      status: 'ok',
    };
  }
}

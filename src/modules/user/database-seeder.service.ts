import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import seedData from '../../configs/seeds/seeder.seed';
import { setSeedContext } from '../../configs/seeds/seed.context';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
  ) {}

  async onModuleInit(): Promise<void> {
    setSeedContext({
      userRepository: this.userRepository,
      userService: this.userService,
      config: this.config,
      logger: this.logger,
    });
    await seedData();
  }
}

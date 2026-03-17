import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { seedData } from '../../config/seeds/seeder';
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
    await seedData(
      this.userRepository,
      this.userService,
      this.config,
      this.logger,
    );
  }
}

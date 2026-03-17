import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    return this.repo.findOne({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tokenVersion: true,
        isActive: true,
        isActivated: true,
        isLocked: true,
        lockedUntil: true,
        loginLimit: true,
        otp: true,
        otpExpiry: true,
        otpType: true,
        createdAt: true,
        updatedAt: true,
        ...(withPassword ? { password: true } : {}),
      },
    } as any);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update(id, data as any);
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found after update');
    return updated;
  }
}

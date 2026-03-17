import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';
import { IResult } from '../../common/types/result.interface';
import { isAdminRole } from '../../config/roles.config';

const SALT_ROUNDS = 10;

export interface BulkUserInput {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    return this.userRepository.findByEmail(email, withPassword);
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashed = await this.hashPassword(data.password);
    return this.userRepository.create({
      email: data.email.toLowerCase(),
      password: hashed,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      role: data.role ?? UserRole.USER,
    });
  }

  /**
   * Create multiple users (troott-api createBulkUsers). Only creates users that do not exist when options.isNew is true.
   */
  async createBulkUsers(
    data: BulkUserInput[],
    options: { isNew: boolean },
  ): Promise<IResult<{ created: number }>> {
    const result: IResult<{ created: number }> = {
      error: false,
      message: '',
      code: 200,
      data: { created: 0 },
    };
    if (!data?.length) return result;

    for (const bulk of data) {
      const existing = await this.userRepository.findByEmail(bulk.email.toLowerCase());
      if (existing || !options.isNew) continue;
      const password = bulk.password ?? randomBytes(8).toString('hex');
      try {
        const hashed = await this.hashPassword(password);
        await this.userRepository.create({
          email: bulk.email.toLowerCase(),
          password: hashed,
          firstName: bulk.firstName ?? '',
          lastName: bulk.lastName ?? '',
          role: UserRole.USER,
        });
        result.data!.created += 1;
      } catch {
        // skip on conflict
      }
    }
    result.message = `Created ${result.data!.created} user(s)`;
    return result;
  }

  /**
   * Check if user has admin or super-admin role (troott-api findRole pattern).
   */
  async findRole(userId: string): Promise<IResult<{ isAdmin: boolean }>> {
    const result: IResult<{ isAdmin: boolean }> = {
      error: false,
      message: '',
      code: 200,
      data: { isAdmin: false },
    };
    const user = await this.userRepository.findById(userId);
    if (!user) {
      result.error = true;
      result.code = 400;
      result.message = 'User not found';
      return result;
    }
    result.data!.isAdmin = isAdminRole(user.role);
    result.message = result.data!.isAdmin ? 'User is an admin' : 'User is not an admin';
    return result;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.userRepository.update(id, data);
  }
}

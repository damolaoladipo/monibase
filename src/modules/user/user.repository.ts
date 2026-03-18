import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
        phoneNumber: true,
        phoneCode: true,
        role: true,
        isDeactivated: true,
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

  async countByRoles(roles: string[]): Promise<number> {
    if (roles.length === 0) return 0;
    return this.repo.count({ where: { role: In(roles) } });
  }

  async findAllPaginated(opts: {
    page: number;
    limit: number;
    sort?: { field: string; order: 'ASC' | 'DESC' };
    role?: string;
    includeDeactivated?: boolean;
  }): Promise<{ items: User[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.email',
        'u.firstName',
        'u.lastName',
        'u.phoneNumber',
        'u.phoneCode',
        'u.role',
        'u.isActive',
        'u.isActivated',
        'u.isDeactivated',
        'u.createdAt',
      ])
      .skip(skip)
      .take(limit);

    if (opts.role) {
      qb.andWhere('u.role = :role', { role: opts.role });
    }
    if (opts.includeDeactivated !== true) {
      qb.andWhere('u.isDeactivated = :deact', { deact: false });
    }
    const orderField = opts.sort?.field ?? 'createdAt';
    const orderDir = opts.sort?.order ?? 'DESC';
    qb.orderBy(`u.${orderField}`, orderDir);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kyc } from './entities/kyc.entity';
import { KycStatus } from './entities/kyc.entity';

@Injectable()
export class KycRepository {
  constructor(
    @InjectRepository(Kyc)
    private readonly repo: Repository<Kyc>,
  ) {}

  async findByUserId(userId: string): Promise<Kyc | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async create(data: Partial<Kyc>): Promise<Kyc> {
    const kyc = this.repo.create(data);
    return this.repo.save(kyc);
  }

  async update(id: string, data: Partial<Kyc>): Promise<Kyc> {
    await this.repo.update(id, data as any);
    const updated = await this.repo.findOne({ where: { id } });
    if (!updated) throw new Error('Kyc not found after update');
    return updated;
  }
}

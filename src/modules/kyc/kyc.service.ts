import { Injectable } from '@nestjs/common';
import { KycRepository } from './kyc.repository';
import { KycStatus } from './entities/kyc.entity';

@Injectable()
export class KycService {
  constructor(private readonly kycRepository: KycRepository) {}

  async getStatus(userId: string): Promise<{ status: string }> {
    const kyc = await this.kycRepository.findByUserId(userId);
    return {
      status: kyc?.status ?? KycStatus.PENDING,
    };
  }

  async isVerified(userId: string): Promise<boolean> {
    const kyc = await this.kycRepository.findByUserId(userId);
    return kyc?.status === KycStatus.VERIFIED;
  }
}

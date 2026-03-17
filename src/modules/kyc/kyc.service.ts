import { Injectable, NotFoundException } from '@nestjs/common';
import { KycRepository } from './kyc.repository';
import { KycStatus } from './entities/kyc.entity';

export interface SubmitKycData {
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
}

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

  async submit(userId: string, data: SubmitKycData): Promise<{ message: string; status: string }> {
    const existing = await this.kycRepository.findByUserId(userId);
    const now = new Date();
    if (existing) {
      await this.kycRepository.update(existing.id, {
        status: KycStatus.PENDING,
        fullName: data.fullName ?? existing.fullName,
        dateOfBirth: data.dateOfBirth ?? existing.dateOfBirth,
        address: data.address ?? existing.address,
        idType: data.idType ?? existing.idType,
        idNumber: data.idNumber ?? existing.idNumber,
        submittedAt: now,
        rejectionReason: null,
      });
      return { message: 'KYC submission updated', status: KycStatus.PENDING };
    }
    await this.kycRepository.create({
      userId,
      status: KycStatus.PENDING,
      submittedAt: now,
      fullName: data.fullName ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      address: data.address ?? null,
      idType: data.idType ?? null,
      idNumber: data.idNumber ?? null,
    });
    return { message: 'KYC submitted', status: KycStatus.PENDING };
  }

  async listPending(): Promise<Array<{ id: string; userId: string; status: string; submittedAt: Date | null }>> {
    const list = await this.kycRepository.findPending();
    return list.map((k) => ({
      id: k.id,
      userId: k.userId,
      status: k.status,
      submittedAt: k.submittedAt,
    }));
  }

  async review(kycId: string, status: 'verified' | 'rejected', rejectionReason?: string): Promise<{ message: string }> {
    const kyc = await this.kycRepository.findById(kycId);
    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }
    const now = new Date();
    await this.kycRepository.update(kycId, {
      status: status === 'verified' ? KycStatus.VERIFIED : KycStatus.REJECTED,
      reviewedAt: now,
      rejectionReason: status === 'rejected' ? rejectionReason ?? null : null,
    });
    return { message: `KYC ${status}` };
  }
}

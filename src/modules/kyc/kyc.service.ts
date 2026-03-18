import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { KycRepository } from './kyc.repository';
import { KycStatus } from './entities/kyc.entity';
import { AuditLoggerService } from '../../common/services/audit-logger.service';
import { StorageService } from '../storage/storage.service';

export type KycDocumentType = 'id' | 'proof_of_address';

export interface SubmitKycData {
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
}

@Injectable()
export class KycService {
  constructor(
    private readonly kycRepository: KycRepository,
    private readonly audit: AuditLoggerService,
    private readonly storage: StorageService,
  ) {}

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
      this.audit.log({ userId, action: 'kyc_submit', resource: 'kyc', outcome: 'success' });
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
    this.audit.log({ userId, action: 'kyc_submit', resource: 'kyc', outcome: 'success' });
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
    const action = status === 'verified' ? 'kyc_review_verified' : 'kyc_review_rejected';
    this.audit.log({ userId: kyc.userId, action, resource: 'kyc', outcome: 'success' });
    return { message: `KYC ${status}` };
  }

  async uploadDocument(
    userId: string,
    documentType: KycDocumentType,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{ message: string; documentType: string; key: string }> {
    if (documentType !== 'id' && documentType !== 'proof_of_address') {
      throw new BadRequestException('documentType must be id or proof_of_address');
    }
    let kyc = await this.kycRepository.findByUserId(userId);
    if (!kyc) {
      kyc = await this.kycRepository.create({
        userId,
        status: KycStatus.PENDING,
        submittedAt: new Date(),
      });
    }
    const uploadId = randomUUID();
    const stream = Readable.from(file.buffer);
    const uploadResult = await this.storage.uploadFile({
      stream,
      mimeType: file.mimetype,
      uploadId,
      info: { filename: file.originalname },
      size: file.size,
      fileType: `kyc_${documentType}`,
    });
    if (uploadResult.error || !uploadResult.data) {
      throw new BadRequestException(uploadResult.message ?? 'Upload failed');
    }
    const key = uploadResult.data.s3Key;
    const updateData: Partial<{ idDocumentKey: string | null; proofOfAddressKey: string | null }> =
      documentType === 'id' ? { idDocumentKey: key } : { proofOfAddressKey: key };
    await this.kycRepository.update(kyc.id, updateData);
    return { message: 'Document uploaded', documentType, key };
  }
}

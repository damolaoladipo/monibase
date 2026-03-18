import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { KycService, KycDocumentType } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@ApiTags('kyc')
@ApiBearerAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  async submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(user.id, {
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      address: dto.address,
      idType: dto.idType,
      idNumber: dto.idNumber,
    });
  }

  @Get('status')
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.kycService.getStatus(user.id);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload KYC document (ID or proof of address)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, documentType: { type: 'string', enum: ['id', 'proof_of_address'] } }, required: ['file', 'documentType'] } })
  async uploadDocument(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number },
    @Body('documentType') documentType: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    const dt = (documentType === 'proof_of_address' ? 'proof_of_address' : 'id') as KycDocumentType;
    return this.kycService.uploadDocument(user.id, dt, {
      buffer: file.buffer,
      originalname: file.originalname ?? 'document',
      mimetype: file.mimetype ?? 'application/octet-stream',
      size: file.size ?? 0,
    });
  }
}

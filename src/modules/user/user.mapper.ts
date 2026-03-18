import { User } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserListDto } from './dto/user-list.dto';

/**
 * Maps User entity to response DTOs (excludes password, tokenVersion, otp, etc.).
 */
export class UserMapper {
  static toProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phoneNumber: user.phoneNumber ?? null,
      phoneCode: user.phoneCode ?? null,
      role: user.role ?? 'user',
      isActivated: user.isActivated ?? false,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  static toList(user: User): UserListDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phoneNumber: user.phoneNumber ?? null,
      phoneCode: user.phoneCode ?? null,
      role: user.role ?? 'user',
      isActivated: user.isActivated ?? false,
      isActive: user.isActive ?? true,
      isDeactivated: user.isDeactivated ?? false,
      createdAt: user.createdAt,
    };
  }
}

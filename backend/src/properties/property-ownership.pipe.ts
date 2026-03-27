import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  ForbiddenException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class PropertyOwnershipPipe implements PipeTransform {
  constructor(
    @Inject(REQUEST) private readonly request: any,
    private readonly propertiesService: PropertiesService,
  ) {}

  async transform(value: string, metadata: ArgumentMetadata) {
    // Only validate if it's applied to a parameter (e.g., the ID)
    if (metadata.type !== 'param') {
      return value;
    }

    const user = this.request.user;
    if (!user || !user.id) {
      throw new ForbiddenException('User authentication context missing');
    }

    // Admins bypass ownership checks
    if (user.role === UserRole.ADMIN) {
      return value;
    }

    // Verify ownership for Host role
    const property = await this.propertiesService.findOne(value);
    const hostId = property.hostId || (property.host as any)?.id;

    if (user.role === UserRole.HOST && hostId !== user.id) {
      throw new ForbiddenException('Access denied: You do not own this property');
    }

    return value;
  }
}
import { PartialType } from '@nestjs/mapped-types';
import { CreateLiveTourDto } from './create-live-tour.dto';

export class UpdateLiveTourDto extends PartialType(CreateLiveTourDto) {}

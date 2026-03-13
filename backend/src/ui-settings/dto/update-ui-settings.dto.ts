import { PartialType } from '@nestjs/mapped-types';
import { CreateUiSettingsDto } from './create-ui-settings.dto';

export class UpdateUiSettingsDto extends PartialType(CreateUiSettingsDto) {}

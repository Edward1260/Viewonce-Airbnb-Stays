import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { AppConfigService } from '../config/app.config';

@Module({
  imports: [MulterModule.register({ dest: './uploads' })],
  controllers: [UploadController],
  providers: [AppConfigService],
})
export class UploadModule {}

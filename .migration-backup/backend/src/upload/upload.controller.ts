import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppConfigService } from '../config/app.config';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly appConfigService: AppConfigService) {}
  @Post('image')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      },
    }),
  }))
  uploadImage(@UploadedFile() file: any) {
    return {
      url: `${this.appConfigService.uploadsUrl}/uploads/${file.filename}`,
    };
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(mp4|avi|mov|wmv|flv|mkv|webm)$/)) {
        return callback(new Error('Only video files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
  }))
  uploadVideo(@UploadedFile() file: any) {
    return {
      url: `${this.appConfigService.uploadsUrl}/uploads/${file.filename}`,
    };
  }
}

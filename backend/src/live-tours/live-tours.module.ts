import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveToursService } from './live-tours.service';
import { LiveToursController } from './live-tours.controller';
import { LiveTour } from '../entities/live-tour.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiveTour])],
  controllers: [LiveToursController],
  providers: [LiveToursService],
  exports: [LiveToursService],
})
export class LiveToursModule {}

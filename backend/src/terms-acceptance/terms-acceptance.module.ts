import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermsAcceptance } from '../entities/terms-acceptance.entity';
import { User } from '../entities/user.entity';
import { TermsAcceptanceService } from './terms-acceptance.service';
import { TermsAcceptanceController } from './terms-acceptance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TermsAcceptance, User])],
  providers: [TermsAcceptanceService],
  controllers: [TermsAcceptanceController],
  exports: [TermsAcceptanceService],
})
export class TermsAcceptanceModule {}

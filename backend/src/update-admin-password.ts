import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bcrypt from 'bcrypt';
import { getRepository } from 'typeorm';
import { User } from './entities/user.entity';

async function updateAdminPassword() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepository = getRepository(User);

  const admin = await userRepository.findOne({ where: { email: 'admin@airbnb.com' } });

  if (admin) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    admin.password = hashedPassword;
    await userRepository.save(admin);
  } else {
    // Admin not found - no action needed
  }

  await app.close();
}

updateAdminPassword().catch(console.error);

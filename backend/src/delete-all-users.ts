import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function deleteAllUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);

    // Get all users
    const allUsers = await usersService.findAll();

    // Delete each user
    for (const user of allUsers) {
      await usersService.remove(user.id);
    }
  } catch (error) {
    console.error('Error deleting users:', error);
  } finally {
    await app.close();
  }
}

deleteAllUsers();

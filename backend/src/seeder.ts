import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { UserRole } from './entities/user.entity';
import { PropertiesService } from './properties/properties.service';
import { UsersService } from './users/users.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  const propertiesService = app.get(PropertiesService);
  const usersService = app.get(UsersService);

  // Create admin user
  let admin;
  try {
    admin = await authService.signup({
      email: 'admin@airbnb.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+254700000000',
      role: UserRole.ADMIN,
    });
  } catch (error) {
    console.log('Admin user already exists, skipping...');
    admin = { user: { id: 'admin-id' } }; // dummy
  }

  // Create host users
  const hosts = [
    { email: 'host@airbnb.com', firstName: 'John', lastName: 'Host', phone: '+254711111111' },
    { email: 'host2@airbnb.com', firstName: 'Jane', lastName: 'Host', phone: '+254711111112' },
    { email: 'host3@airbnb.com', firstName: 'Bob', lastName: 'Host', phone: '+254711111113' },
  ];

  for (const hostData of hosts) {
    try {
      await authService.signup({
        email: hostData.email,
        password: 'host123',
        firstName: hostData.firstName,
        lastName: hostData.lastName,
        phone: hostData.phone,
        role: UserRole.HOST,
      });
    } catch (error) {
      console.log(`Host ${hostData.email} already exists, skipping...`);
    }
  }

  // Get one host for properties
  const host = await usersService.findByEmail('host@airbnb.com');

  // Create customer user
  const customer = await authService.signup({
    email: 'customer@airbnb.com',
    password: 'customer123',
    firstName: 'Jane',
    lastName: 'Customer',
    phone: '+254722222222',
    role: UserRole.CUSTOMER,
  });

  // Create sample properties
  const properties = [
    {
      title: 'Luxury Beachfront Villa',
      description: 'Stunning beachfront villa with ocean views, private pool, and modern amenities.',
      location: 'Mombasa, Kenya',
      price: 25000,
      type: 'Villa',
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 8,
      amenities: ['WiFi', 'Pool', 'Ocean View', 'Kitchen', 'Air Conditioning', 'Parking'],
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
      hostId: host.id,
    },
    {
      title: 'Modern City Apartment',
      description: 'Contemporary apartment in the heart of Nairobi with city views.',
      location: 'Nairobi, Kenya',
      price: 15000,
      type: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      amenities: ['WiFi', 'City View', 'Kitchen', 'Air Conditioning', 'Gym Access'],
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
      hostId: host.id,
    },
    {
      title: 'Cozy Mountain Cabin',
      description: 'Rustic cabin in the Aberdare Ranges, perfect for nature lovers.',
      location: 'Nyeri, Kenya',
      price: 12000,
      type: 'Cabin',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      amenities: ['WiFi', 'Mountain View', 'Fireplace', 'Kitchen', 'Parking'],
      images: ['https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800'],
      hostId: host.id,
    },
  ];

  for (const propData of properties) {
    await propertiesService.create(propData);
  }

  console.log('Seeding completed successfully!');
  await app.close();
}

seed().catch(console.error);

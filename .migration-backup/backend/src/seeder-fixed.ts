import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { PropertiesService } from './properties/properties.service';
import { UserRole } from './entities/user.entity';
import { PropertyStatus, PropertyType } from './entities/property.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  const propertiesService = app.get(PropertiesService);

  // Create hosts
  const host1 = await authService.signup({
    email: 'sarah.johnson@email.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+254712345678',
    role: UserRole.HOST,
  });

  const host2 = await authService.signup({
    email: 'michael.chen@email.com',
    password: 'password123',
    firstName: 'Michael',
    lastName: 'Chen',
    phone: '+254723456789',
    role: UserRole.HOST,
  });

  const host3 = await authService.signup({
    email: 'emma.wilson@email.com',
    password: 'password123',
    firstName: 'Emma',
    lastName: 'Wilson',
    phone: '+254734567890',
    role: UserRole.HOST,
  });

  // Create admin
  const admin = await authService.signup({
    email: 'admin@airbnb.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+254700000000',
    role: UserRole.ADMIN,
  });

  // Create customers
  const customer1 = await authService.signup({
    email: 'john.smith@email.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+254712345678',
    role: UserRole.CUSTOMER,
  });

  const customer2 = await authService.signup({
    email: 'jane.doe@email.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+254723456789',
    role: UserRole.CUSTOMER,
  });

  const customer3 = await authService.signup({
    email: 'bob.johnson@email.com',
    password: 'password123',
    firstName: 'Bob',
    lastName: 'Johnson',
    phone: '+254734567890',
    role: UserRole.CUSTOMER,
  });

  // Create requested users
  const hostview1s = await authService.signup({
    email: 'hostview1s@gmail.com',
    password: 'password123',
    firstName: 'Host',
    lastName: 'View1s',
    phone: '+254745678901',
    role: UserRole.HOST,
  });

  const adminviewad = await authService.signup({
    email: 'adminviewad@gmail.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'Viewad',
    phone: '+254756789012',
    role: UserRole.ADMIN,
  });

  const supportuser = await authService.signup({
    email: 'support@airbnb.com',
    password: 'password123',
    firstName: 'Support',
    lastName: 'User',
    phone: '+254767890123',
    role: UserRole.ADMIN, // Assuming support is admin role
  });

  // Create properties with ACTIVE status so they show to customers
  await propertiesService.create({
    title: 'Luxury Beachfront Villa',
    description: 'Stunning beachfront villa with ocean views, private pool, and direct beach access.',
    location: 'Mombasa, Kenya',
    price: 15000,
    type: PropertyType.VILLA,
    status: PropertyStatus.ACTIVE,
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    amenities: ['WiFi', 'Pool', 'Ocean View', 'Kitchen', 'Air Conditioning', 'Parking'],
    images: ['villa-beach.jpg'],
    hostId: host2.user.id,
  });

  await propertiesService.create({
    title: 'Modern City Apartment',
    description: 'Spacious apartment in the heart of Nairobi with city views.',
    location: 'Nairobi, Kenya',
    price: 8000,
    type: PropertyType.APARTMENT,
    status: PropertyStatus.ACTIVE,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    amenities: ['WiFi', 'Gym', 'Parking', 'Kitchen', 'Elevator', 'Security'],
    images: ['apartment-city.jpg'],
    hostId: host1.user.id,
  });

  await propertiesService.create({
    title: 'Eco Lodge in Nakuru',
    description: 'Sustainable lodge near Lake Nakuru with wildlife viewing.',
    location: 'Nakuru, Kenya',
    price: 6000,
    type: PropertyType.LODGE,
    status: PropertyStatus.ACTIVE,
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    amenities: ['WiFi', 'Fireplace', 'Nature Trails', 'Kitchen', 'Solar Power', 'Wildlife Viewing'],
    images: ['lodge-nakuru.jpg'],
    hostId: host3.user.id,
  });

  console.log('Seeding completed!');
  await app.close();
}

seed().catch(console.error);

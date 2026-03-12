import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PropertiesService } from './properties/properties.service';

async function deleteSeededProperties() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const propertiesService = app.get(PropertiesService);

  try {
    // Get all properties (including pending)
    const [properties] = await propertiesService.findAll({ status: 'all' });

    // Delete seeded properties (the ones with Unsplash images)
    const seededTitles = [
      'Luxury Beachfront Villa',
      'Modern City Apartment',
      'Eco Lodge in Nakuru'
    ];

    for (const property of properties) {
      if (seededTitles.includes(property.title)) {
        await propertiesService.remove(property.id);
      }
    }
  } catch (error) {
    console.error('Error deleting properties:', error);
  } finally {
    await app.close();
  }
}

deleteSeededProperties();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.final';
import { PropertiesService } from './properties/properties.service';

async function deleteAllProperties() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const propertiesService = app.get(PropertiesService);

  try {
    // Get all properties
    const [properties] = await propertiesService.findAll({ status: 'all' });
    console.log(`Found ${properties.length} properties to delete`);

    // Delete all properties
    let deletedCount = 0;
    for (const property of properties) {
      await propertiesService.remove(property.id);
      deletedCount++;
    }
    console.log(`Successfully deleted ${deletedCount} properties`);
  } catch (error) {
    console.error('Error deleting properties:', error);
  } finally {
    await app.close();
  }
}

deleteAllProperties();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PropertiesService } from './properties/properties.service';

async function activateProperties() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const propertiesService = app.get(PropertiesService);

  try {
    // Get all properties
    const [properties] = await propertiesService.findAll({ status: 'all' });

    // Activate all properties
    for (const property of properties) {
      await propertiesService.update(property.id, { status: 'active' });
      console.log(`Activated property: ${property.title}`);
    }

    console.log(`Activated ${properties.length} properties`);
  } catch (error) {
    console.error('Error activating properties:', error);
  } finally {
    await app.close();
  }
}

activateProperties();

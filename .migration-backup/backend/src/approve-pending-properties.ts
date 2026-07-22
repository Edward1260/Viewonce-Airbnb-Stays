import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PropertiesService } from './properties/properties.service';

async function approvePendingProperties() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const propertiesService = app.get(PropertiesService);

  try {
    // Get all properties
    const [properties] = await propertiesService.findAll({ status: 'pending' });

    // Approve all pending properties
    for (const property of properties) {
      await propertiesService.update(property.id, { status: 'active' });
    }
  } catch (error) {
    console.error('Error approving properties:', error);
  } finally {
    await app.close();
  }
}

approvePendingProperties();

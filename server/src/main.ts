import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();

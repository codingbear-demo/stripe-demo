import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('POST /api/auth/login - creates new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'e2e_user', password: 'pass123' })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('e2e_user');
    expect(res.body.user.id).toBeDefined();
  });

  it('POST /api/auth/login - returns existing user on re-login', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'e2e_user2', password: 'pass123' })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'e2e_user2', password: 'pass123' })
      .expect(201);

    expect(first.body.user.id).toBe(second.body.user.id);
  });

  it('POST /api/auth/login - rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'e2e_user3', password: 'correctpass' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'e2e_user3', password: 'wrongpass' })
      .expect(401);
  });
});

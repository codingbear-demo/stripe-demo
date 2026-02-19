import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      if (existing.password !== password) {
        throw new UnauthorizedException('Invalid password');
      }
      return { id: existing.id, username: existing.username };
    }

    const user = await this.prisma.user.create({
      data: { username, password },
    });

    return { id: user.id, username: user.username };
  }
}

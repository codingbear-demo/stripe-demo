import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout-session')
  async createCheckoutSession(@Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession(dto.userId, dto.planId);
  }

  @Get('subscription')
  async getSubscription(@Query('userId') userId: string) {
    return this.billingService.getSubscription(userId);
  }

  @Post('portal-session')
  async createPortalSession(@Body() body: { userId: string }) {
    return this.billingService.createPortalSession(body.userId);
  }
}

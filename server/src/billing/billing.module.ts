import { Module } from '@nestjs/common';
import { StripeModule } from '../stripe/stripe.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [StripeModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}

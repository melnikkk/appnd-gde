import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { ClerkStrategy } from './strategies/clerk.strategy';
import { ClerkClientProvider } from './providers/clerk-client.provider';

@Module({
  imports: [PassportModule, ConfigModule],
  providers: [ClerkClientProvider, ClerkStrategy],
  exports: [PassportModule],
})
export class AuthModule {}

import { Clerk } from '@clerk/clerk-sdk-node';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const ClerkClientProvider: Provider = {
  provide: 'CLERK_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const secretKey = configService.get<string>('CLERK_SECRET_KEY');

    if (!secretKey) {
      throw new Error('Clerk secret key is not defined');
    }

    return Clerk({ secretKey });
  },
};

import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import {
  InvalidTokenException,
  MissingTokenException,
} from '../exceptions/auth.exceptions';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(@Inject('CLERK_CLIENT') private readonly clerkClient) {
    super();
  }

  async validate(request: Request): Promise<unknown> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new MissingTokenException();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new MissingTokenException();
    }

    try {
      const { sub, sid } = await this.clerkClient.verifyToken(token);

      if (!sub) {
        throw new InvalidTokenException('Token subject is missing');
      }

      const user = await this.clerkClient.users.getUser(sub);

      return {
        id: user.id,
        sessionId: sid,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };
    } catch (error: unknown) {
      console.error('Clerk authentication error:', error);

      throw new InvalidTokenException();
    }
  }
}

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class UserNotFoundException extends AppBaseException {
  constructor(userId?: string) {
    super(
      userId
        ? `User with ID ${userId} not found`
        : 'User not found. Authentication required.',
      HttpStatus.NOT_FOUND,
      'USER_NOT_FOUND',
      { userId },
    );
  }

  static noAuthenticatedUser(): UserNotFoundException {
    return new UserNotFoundException();
  }
}

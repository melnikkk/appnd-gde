import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthenticationException extends HttpException {
  constructor(message = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidTokenException extends AuthenticationException {
  constructor(message = 'Invalid token provided') {
    super(message);
  }
}

export class ExpiredTokenException extends AuthenticationException {
  constructor(message = 'Token has expired') {
    super(message);
  }
}

export class MissingTokenException extends AuthenticationException {
  constructor(message = 'Authentication token is missing') {
    super(message);
  }
}

export class InsufficientPermissionsException extends HttpException {
  constructor(message = 'Insufficient permissions to perform this action') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

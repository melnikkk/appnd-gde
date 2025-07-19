import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface RequestWithUser extends Request {
  user: User;
}

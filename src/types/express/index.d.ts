// src/types/express/index.d.ts
import type { UserWithProfile } from '../prisma';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: UserWithProfile;
    }
  }
}

export {};
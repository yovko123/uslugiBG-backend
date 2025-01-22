// src/types/middleware.ts
import { Request } from 'express';
import { UserWithProfile } from './prisma';

export interface AuthenticatedRequest extends Request {
  user?: UserWithProfile;
}

export interface FileRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

export interface ServiceRequest extends FileRequest {
  // Add any additional service-specific request properties here
}
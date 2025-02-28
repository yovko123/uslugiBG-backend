import { 
  PrismaClient,
  Prisma
} from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Don't try to redeclare the properties - they already exist
// Comment out or remove the problematic code:
/*
declare module '@prisma/client' {
  interface PrismaClient {
    country: any;
    state: any;
    city: any;
  }
}
*/ 
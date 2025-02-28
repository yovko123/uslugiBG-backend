import { PrismaClient } from '@prisma/client';

// This helps TypeScript understand the structure
export type PrismaClientWithModels = PrismaClient & {
  country: any;
  state: any; 
  city: any;
};

// Cast client to include our models
const createPrismaClient = (): PrismaClientWithModels => {
  return new PrismaClient() as PrismaClientWithModels;
};

const prisma = createPrismaClient();

export { prisma }; 
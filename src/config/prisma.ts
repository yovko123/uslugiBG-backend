// src/config/prisma.ts

import { prisma } from '../utils/prisma';

// Add this to verify the client is loaded correctly
console.log('Prisma Client initialized with models:', 
  Object.keys(prisma).filter(key => !key.startsWith('_')));

export default prisma;
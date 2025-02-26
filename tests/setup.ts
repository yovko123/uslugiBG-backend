// Global test setup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jest, afterAll, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { MemoryStore } from 'express-rate-limit';

// Properly typed interfaces for our mock data
interface MockUser {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockRefreshToken {
  id: number;
  token: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}

// Extend timeout for all tests
jest.setTimeout(30000);

// Create a global rate limit store for tests FIRST - before any mocks
const testRateLimitStore = new MemoryStore();

// Make it globally accessible with type assertion
(global as any).rateLimitStore = testRateLimitStore;

// Then create the Jest mocks
jest.mock('@prisma/client', () => {
  // Mock data and functions with proper typing
  const mockUsers: Record<number, MockUser> = {};
  const mockRefreshTokens: Record<number, MockRefreshToken> = {};
  
  // Create more robust user create function
  const userCreate = jest.fn().mockImplementation((args: any) => {
    const id = Date.now();
    const user: MockUser = {
      id,
      email: args.data.email,
      passwordHash: args.data.passwordHash,
      firstName: args.data.firstName,
      lastName: args.data.lastName,
      phone: args.data.phone,
      userType: args.data.userType,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockUsers[id] = user;
    return Promise.resolve(user);
  });
  
  // Better implementation of user find
  const userFindUnique = jest.fn().mockImplementation((args: any) => {
    // Special handling for test@example.com
    if (args.where?.email === 'test@example.com') {
      return Promise.resolve({
        id: 1,
        email: 'test@example.com',
        passwordHash: '$2b$10$ORVmeYT0Za5JiwAzrAzJeeXNS7ZRW3Fq5YKnNg/gR.TRwSoUMI6zy', // hash for 'password123'
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        userType: 'customer',
        isActive: true,
        emailVerified: false
      });
    }
    
    // Otherwise look in mock data
    const userId = args.where?.id;
    const userEmail = args.where?.email;
    
    if (userId && mockUsers[userId]) {
      return Promise.resolve(mockUsers[userId]);
    }
    
    if (userEmail) {
      const foundUser = Object.values(mockUsers).find((u: MockUser) => u.email === userEmail);
      return Promise.resolve(foundUser || null);
    }
    
    return Promise.resolve(null);
  });
  
  // Create refresh token function
  const refreshTokenCreate = jest.fn().mockImplementation((args: any) => {
    const id = Date.now();
    const token: MockRefreshToken = {
      id,
      token: args.data.token,
      userId: args.data.userId,
      expiresAt: args.data.expiresAt,
      createdAt: new Date()
    };
    
    mockRefreshTokens[id] = token;
    return Promise.resolve(token);
  });
  
  // Delete refresh token function
  const refreshTokenDeleteMany = jest.fn().mockImplementation(() => {
    return Promise.resolve({ count: 1 });
  });

  // Find refresh token function
  const refreshTokenFindFirst = jest.fn().mockImplementation((args: any) => {
    if (args.where?.token) {
      const foundToken = Object.values(mockRefreshTokens).find(
        (t: MockRefreshToken) => t.token === args.where.token
      );
      return Promise.resolve(foundToken || null);
    }
    return Promise.resolve(null);
  });

  // Create a PrismaClient class with full transaction support
  const mockPrismaClient = {
    user: { 
      create: userCreate,
      findUnique: userFindUnique,
      findFirst: userFindUnique,
      update: jest.fn().mockImplementation((args: any) => {
        if (args.where?.id && mockUsers[args.where.id]) {
          mockUsers[args.where.id] = { ...mockUsers[args.where.id], ...args.data };
          return Promise.resolve(mockUsers[args.where.id]);
        }
        return Promise.resolve(null);
      })
    },
    refreshToken: { 
      create: refreshTokenCreate,
      deleteMany: refreshTokenDeleteMany,
      findFirst: refreshTokenFindFirst
    },
    $transaction: function(callback: any) {
      if (typeof callback === 'function') {
        return Promise.resolve(callback(this));
      } else {
        // Handle array of operations
        return Promise.all(callback);
      }
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
    // Include the UserType enum to avoid import errors
    UserType: { CUSTOMER: 'customer', PROVIDER: 'provider', ADMIN: 'admin' }
  };
});

// Remove the mock from the controller as it's not needed anymore
jest.mock('../src/controllers/auth/authController', () => {
  const originalModule = jest.requireActual('../src/controllers/auth/authController');
  return originalModule;
});

// Add to your existing setup.ts mocks
jest.mock('../src/config/prisma', () => {
  // This will be used instead of the real prisma client in tests
  return {
    __esModule: true,
    default: new (require('@prisma/client').PrismaClient)()
  };
});

// Clean up after all tests
afterAll(async () => {
  // Any global cleanup
});

// Reset the rate limit store before each test
beforeEach(() => {
  if ((global as any).rateLimitStore) {
    (global as any).rateLimitStore.resetAll();
  }
});

// Add this near the top of your setup.ts file, before any tests run
beforeAll(() => {
  // Reset rate limiter store before each test suite
  if ((global as any).rateLimitStore) {
    (global as any).rateLimitStore.resetAll();
  }
  
  // Ensure test environment is set
  process.env.NODE_ENV = 'test';
  process.env.DISABLE_RATE_LIMIT = 'true'; // Explicitly disable for all tests
  
  // Set consistent JWT secrets for ALL tests
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
});

// Force close any previous test servers
afterEach(async () => {
  if (global.testServer && global.testServer.listening) {
    await new Promise<void>((resolve) => {
      global.testServer.close(() => resolve());
    });
    global.testServer = undefined as any;
  }
}); 
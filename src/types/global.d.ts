// Global type declarations
import '@jest/globals';

declare global {
  namespace NodeJS {
    interface Global {
      // Add any global variables needed for tests
    }
  }
}

export {}; 
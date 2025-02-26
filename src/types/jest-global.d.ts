// Add global Jest type declarations
import '@types/jest';

declare global {
  // This ensures the jest global is recognized
  const jest: typeof import('@jest/globals').jest;
} 
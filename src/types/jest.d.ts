// This file provides TypeScript with type information for Jest globals
import '@types/jest';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
    }
  }
} 
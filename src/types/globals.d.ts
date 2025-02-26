// Add or create this declaration file to define global types
import { MemoryStore } from 'express-rate-limit';

declare global {
  var rateLimitStore: MemoryStore;
  var testServer: any;
}

export {}; 
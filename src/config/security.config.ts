// src/config/security.config.ts
import { HelmetOptions } from 'helmet';
import { CorsOptions } from 'cors';

/**
 * Public Routes Configuration
 */
export const publicRoutes = {
  paths: [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/uploads/*'  // Public access to uploads with origin checking
  ]
};

/**
 * Helmet Security Configuration
 */
export const helmet: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", process.env.FRONTEND_URL || 'http://localhost:3000'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
  crossOriginResourcePolicy: { 
    policy: process.env.NODE_ENV === 'production' ? "same-site" : "cross-origin" 
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
};

/**
 * CORS Configuration
 */
export const cors: CorsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Rate Limiting Configuration
 */
export const rateLimiting = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  auth: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many failed authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  },
  uploads: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 file operations per hour
    message: 'Too many file operations, please try again later.'
  }
} as const;

/**
 * Security Monitoring Configuration
 */
export const monitoring = {
  enabled: true,
  logFailedAttempts: true,
  logRateLimitBreaches: true,
  logSecurityEvents: true,
  alertThresholds: {
    failedLogins: 10,
    rateLimitBreaches: 5,
    suspiciousIPs: 3
  },
  logOptions: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    filename: 'security-events.log',
    sanitizeHeaders: ['authorization', 'cookie'],
    excludePaths: publicRoutes.paths
  }
} as const;

/**
 * File Upload Security Configuration
 */
export const uploadSecurity = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: [
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'image/heic',
    'image/heif',
    // iPhone images sometimes come as application/octet-stream
    'application/octet-stream'
  ],
  scanForMalware: process.env.NODE_ENV === 'production',
  sanitizeFilenames: true,
  maxFilesPerRequest: 5
} as const;

export const securityConfig = {
  helmet,
  cors,
  rateLimiting,
  monitoring,
  uploadSecurity,
  publicRoutes
} as const;
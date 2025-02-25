// src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Express, Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/security.config';

interface SecurityEvent {
  type: 'authentication_failure' | 'rate_limit_breach' | 'suspicious_activity' | 'file_operation';
  ip: string;
  path: string;
  timestamp: string;
  details?: Record<string, any>;
}


// Security event logging
const logSecurityEvent = (event: SecurityEvent) => {
  if (!securityConfig.monitoring.enabled) return;

  const logEntry = {
    ...event,
    timestamp: new Date().toISOString()
  };

  console.warn('Security Event:', logEntry);

  // Check if alert thresholds are exceeded
  if (event.type === 'authentication_failure') {
    console.error(`Alert: Authentication failure from IP ${event.ip}`);
  }
};

// Export the security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  if (!securityConfig.monitoring.enabled) {
    return next();
  }

  const startTime = Date.now();

  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log security-relevant events
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent({
        type: 'authentication_failure',
        ip: req.ip || 'unknown',
        path: req.path,
        timestamp: new Date().toISOString(),
        details: {
          statusCode: res.statusCode,
          method: req.method,
          duration
        }
      });
    }

    // Log rate limit breaches
    if (res.statusCode === 429) {
      logSecurityEvent({
        type: 'rate_limit_breach',
        ip: req.ip || 'unknown',
        path: req.path,
        timestamp: new Date().toISOString(),
        details: {
          method: req.method,
          duration
        }
      });
    }
  });

  next();
};

// Origin validation middleware - This runs AFTER the CORS middleware
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  // Skip origin validation for public routes
  if (securityConfig.publicRoutes.paths.some(path => {
    return path.endsWith('*') 
      ? req.path.startsWith(path.slice(0, -1))
      : req.path === path;
  })) {
    return next();
  }

  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const requestOrigin = req.get('origin');

  if (requestOrigin && requestOrigin !== allowedOrigin) {
    logSecurityEvent({
      type: 'suspicious_activity',
      ip: req.ip || 'unknown',
      path: req.path,
      timestamp: new Date().toISOString(),
      details: {
        origin: requestOrigin,
        method: req.method
      }
    });

    return res.status(403).json({
      success: false,
      message: 'Origin not allowed'
    });
  }

  next();
};

// Custom CORS configuration that rejects unauthorized origins
export const corsWithOriginValidation = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const requestOrigin = req.get('origin');

  if (!requestOrigin || requestOrigin === allowedOrigin) {
    // If it's from allowed origin, set CORS headers
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  } else {
    // For disallowed origins, don't set CORS headers & return 403
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed'
    });
  }
};

// Rate limiting configurations
const rateLimiter = rateLimit({
  ...securityConfig.rateLimiting.global,
  message: {
    success: false,
    message: securityConfig.rateLimiting.global.message
  }
});

// Define auth limiter with lower limit
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  ...securityConfig.rateLimiting.uploads,
  message: {
    success: false,
    message: securityConfig.rateLimiting.uploads.message
  }
});

// Request sanitization middleware
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

const sanitizeObject = (obj: any) => {
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Main security middleware configuration
export const configureSecurityMiddleware = (app: Express) => {
  // Apply Helmet with configured settings
  app.use(helmet(securityConfig.helmet));

  // Apply custom CORS middleware that validates origins
  app.use(corsWithOriginValidation);
  
  // Apply rate limiters
  app.use(rateLimiter);
  app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
  app.use('/uploads', uploadLimiter);

  // Apply security monitoring if enabled
  if (securityConfig.monitoring.enabled) {
    app.use(securityMonitoring);
  }

  // Request sanitization middleware
  app.use(sanitizeRequest);
};
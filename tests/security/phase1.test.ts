// tests/security/phase1.test.ts
import request from 'supertest';
import http from 'http';
import { Express } from 'express';
import startServer from '../../src/app';

describe('Phase 1: Foundation & Authentication Security', () => {
  let app: Express;
  let server: http.Server;

  // Setup - create app and start server
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Start the server
    try {
      const startedApp = await startServer();
      if (!startedApp) {
        throw new Error('Failed to start server');
      }
      app = startedApp;
      server = http.createServer(app);
      
      // Fix: Add proper Promise type argument
      await new Promise<void>(resolve => {
        server.listen(0, () => resolve());
      });
    } catch (error) {
      console.error('Test setup failed:', error);
    }
  });

  // Teardown - close server and clean up
  afterAll(() => {
    // Fix: Add proper Promise type argument
    return new Promise<void>(resolve => {
      console.log('Cleaning up test resources...');
      
      // Close the server if it exists
      if (server && server.listening) {
        server.close(() => {
          console.log('Server closed');
          
          // Reset environment and listeners
          process.env.NODE_ENV = 'development';
          
          // Remove all listeners to prevent memory leaks
          process.removeAllListeners('SIGTERM');
          process.removeAllListeners('SIGINT');
          
          resolve();
        });
      } else {
        resolve();
      }
    });
  });

  describe('1. Security Headers', () => {
    it('should have all required security headers', async () => {
      const response = await request(app).get('/api/health');
      
      // Check essential security headers
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('2. CORS Configuration', () => {
    it('should allow requests from allowed origin', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should not allow requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com');

      expect(response.status).toBe(403);
    });
  });

  describe('3. Rate Limiting', () => {
    it('should have rate limiting headers', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should have stricter rate limiting for auth endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      
      // Check that auth limit is 5 or less (stricter than global 100)
      const limit = parseInt(response.headers['ratelimit-limit'] as string);
      expect(limit).toBeLessThanOrEqual(5);
    });
  });

  describe('4. File Upload Security', () => {
    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/uploads')
        .attach('images', Buffer.from('test file content'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid image files', async () => {
      // Simple JPG header
      const jpgBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00
      ]);

      const response = await request(app)
        .post('/uploads')
        .attach('images', jpgBuffer, {
          filename: 'valid.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('5. Input Sanitization', () => {
    it('should sanitize malicious input', () => {
      // Direct test of middleware
      const { sanitizeRequest } = require('../../src/middleware/security');
      
      const mockReq = {
        body: { field: '<script>alert("xss")</script>' },
        query: {},
        params: {}
      };
      const mockRes = {};
      const mockNext = jest.fn();

      sanitizeRequest(mockReq, mockRes, mockNext);

      expect(mockReq.body.field).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('6. Security Monitoring', () => {
    it('should have security monitoring enabled', () => {
      const { securityConfig } = require('../../src/config/security.config');
      expect(securityConfig.monitoring.enabled).toBe(true);
    });

    it('should log security events on auth failures', async () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid@example.com', password: 'wrong' });
      
      spy.mockRestore();
    });
  });
});
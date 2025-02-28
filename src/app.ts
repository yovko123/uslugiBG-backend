// src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import categoryRoutes from './routes/category';
import serviceRoutes from './routes/service';
import locationRoutes from './routes/location';
import path from 'path';
import { configureSecurityMiddleware } from './middleware/security';
import { uploadMiddleware } from './middleware/upload';
import { errorHandler } from './middleware/error';
import prisma from './config/prisma'; // Fixed import path to match actual location

dotenv.config();

// Function to find and kill process on port
const killProcessOnPort = (port: number) => {
  return new Promise<void>((resolve) => {
    const platform = process.platform;
    const command = platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;

    exec(command, (err, stdout) => {
      if (err) {
        resolve();
        return;
      }

      if (platform === 'win32') {
        const pid = stdout.split('\n')[0].split(' ').filter(Boolean).pop();
        if (pid) {
          exec(`taskkill /F /PID ${pid}`, () => resolve());
        } else {
          resolve();
        }
      } else {
        const pid = stdout.split('\n')[1]?.split(' ').filter(Boolean)[1];
        if (pid) {
          exec(`kill -9 ${pid}`, () => resolve());
        } else {
          resolve();
        }
      }
    });
  });
};

// Define the middlewares configuration function
const configureGlobalMiddleware = (app: Express): void => {
  // Apply security middleware first
  configureSecurityMiddleware(app);

  // Body parsing middleware
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Add a POST endpoint for file uploads with validation
  app.post('/uploads', uploadMiddleware, (_req: Request, res: Response) => {
    // If validation passes, respond with success
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully'
    });
  });

  // Serve static files from uploads directory with security headers
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction): void => {
    // Security headers
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    next();
  }, express.static(path.join(__dirname, '../uploads')));
};

// Define the routes configuration function
const configureRoutes = (app: Express): void => {
  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/locations', locationRoutes);

  // Basic health check route
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Handle 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });
};

const startServer = async () => {
  try {
    // Get port from environment, use 0 for tests to get a random port
    const port = process.env.NODE_ENV === 'test' 
      ? (process.env.PORT === '0' ? 0 : parseInt(process.env.PORT || '3006')) 
      : (parseInt(process.env.PORT || '3005'));

    // Skip port killing in test environment
    if (process.env.NODE_ENV !== 'test' && port !== 0) {
      await killProcessOnPort(port);
    }

    // Connect to database
    await prisma.$connect();
    
    // Configure express app
    const app: Express = express();
    
    // Apply global middlewares
    configureGlobalMiddleware(app);
    
    // Apply route controllers
    configureRoutes(app);
    
    // Apply error handler
    app.use(errorHandler);
    
    // Don't start server in test mode (the test will do it)
    if (process.env.NODE_ENV !== 'test') {
      const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });

      // Graceful shutdown handler
      const gracefulShutdown = () => {
        console.log('Received shutdown signal. Closing HTTP server...');
        server.close(() => {
          console.log('HTTP server closed');
          // Close database connection
          prisma.$disconnect().then(() => {
            process.exit(0);
          });
        });

        // Force close after 10s
        setTimeout(() => {
          console.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };

      // Handle shutdown signals
      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
    }
    
    return app;
  } catch (error) {
    console.error('Failed to start server:', error);
    return null;
  }
};

// Only start the server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('Server startup error:', error);
    process.exit(1);
  });
}

export default startServer;
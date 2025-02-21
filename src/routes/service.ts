// src/routes/service.ts
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import {
  createService, 
  updateService, 
  deleteService,
  getService,
  getProviderServices,
  getServices
} from '../controllers/service/serviceController';
import { ServiceRequest } from '../types/middleware';

const router = Router();

// Define route handler type
type RouteHandler = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
) => Promise<any>;

// Type-safe wrapper for route handlers
const handleServiceRequest = (handler: RouteHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as ServiceRequest, res, next).catch(next);
  };
};

// Apply authentication middleware
router.use(authenticateToken);

// Service routes
router.get('/provider', handleServiceRequest(getProviderServices));
router.get('/', handleServiceRequest(getServices));
router.post('/', uploadMiddleware, handleServiceRequest(createService));
router.get('/:id(\\d+)', handleServiceRequest(getService));
router.put('/:id', uploadMiddleware, handleServiceRequest(updateService));
router.delete('/:id', handleServiceRequest(deleteService));

export default router;
// src/routes/service.ts
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import upload from '../middleware/upload';
import {
  createService, 
  getService, 
  updateService, 
  deleteService,
  getProviderServices,
  getServices,
  deleteServiceImage
} from '../controllers/service/serviceController';
import { ServiceRequest } from '../types/middleware';

const router = Router();

// Type conversion middleware
const handleServiceRequest = (
  handler: (req: ServiceRequest, res: Response, next: NextFunction) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await handler(req as ServiceRequest, res, next);
  };
};

// Authentication middleware
router.use(authenticateToken);

// GET provider services (must be before generic routes)
router.get('/provider', getProviderServices);

// Service CRUD routes
router.get('/', getServices);
router.post('/', upload.array('images', 3), handleServiceRequest(createService));
//router.get('/:id', getService);
router.get('/:id(\\d+)', getService);
router.put('/:id', upload.array('images', 3), handleServiceRequest(updateService));
router.delete('/:id', deleteService);
router.delete('/images/:imageId', deleteServiceImage);

export default router;
// src/routes/review.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createReview, 
  getServiceReviews, 
  getProviderReviews 
} from '../controllers/review/reviewController';
import {
  validateReviewEligibility,
  validateReviewInput,
  detectReviewManipulation
} from '../middleware/reviewValidation';

const router = Router();

// Public routes
router.get('/service/:serviceId', getServiceReviews);
router.get('/provider/:providerId', getProviderReviews);

// Protected routes
router.use(authenticateToken);

// Apply validation middleware in the correct order
router.post('/', 
  validateReviewInput,          // First validate inputs
  validateReviewEligibility,    // Then check eligibility 
  detectReviewManipulation,     // Then detect manipulation attempts
  createReview                  // Finally create the review
);

export default router;
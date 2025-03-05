// src/routes/booking.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createBooking,
  updateBookingStatus,
  markBookingCompletion,
  handleDispute,
  resolveDispute,
  getMyBookings,
  getBookingById
} from '../controllers/booking/bookingController';
import {
  validateStatusTransition,
  validateCompletionMarking,
  validateDisputeCreation
} from '../middleware/bookingValidation';
import {
  detectManipulationAttempts,
  calculateCancellationPenalties,
  validateBookingOwnership
} from '../middleware/bookingSecurityChecks';

const router = Router();

// All booking routes require authentication
router.use(authenticateToken);

// Simple routes
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);

// Routes with ownership validation
router.get('/:id', 
  validateBookingOwnership,
  getBookingById
);

// Status management routes with full security validation chain
router.put(
  '/:id/status', 
  validateBookingOwnership,         // First verify ownership
  detectManipulationAttempts,       // Then check for manipulation
  calculateCancellationPenalties,   // Calculate penalties if applicable
  validateStatusTransition,         // Validate the status change is allowed
  updateBookingStatus               // Finally update the status
);

// Completion marking route
router.put(
  '/:id/complete', 
  validateBookingOwnership,         // First verify ownership
  detectManipulationAttempts,       // Then check for manipulation
  validateCompletionMarking,        // Validate completion marking
  markBookingCompletion             // Mark as completed
);

// Dispute routes
router.post(
  '/:id/dispute', 
  validateBookingOwnership,         // First verify ownership
  detectManipulationAttempts,       // Then check for manipulation
  validateDisputeCreation,          // Validate dispute creation
  handleDispute                     // Handle the dispute
);

router.put(
  '/:id/resolve-dispute', 
  validateBookingOwnership,         // First verify ownership
  resolveDispute                    // Resolve the dispute
);

export default router;
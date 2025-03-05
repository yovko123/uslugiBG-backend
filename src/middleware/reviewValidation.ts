// src/middleware/reviewValidation.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { BookingStatus } from '@prisma/client';

/**
 * Validates that a review can only be created for eligible bookings
 * This middleware prevents review manipulation by enforcing strict eligibility rules
 */
export const validateReviewEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return; // Don't call next() if sending response
    }
    
    if (!bookingId) {
      res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
      return; // Don't call next() if sending response
    }
    
    // Get booking with full details
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId.toString()) },
      include: {
        service: {
          include: {
            provider: true
          }
        },
        review: true
      }
    });
    
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return; // Don't call next() if sending response
    }
    
    // Check if user is the customer who made the booking
    if (booking.customerId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Only the customer can leave a review'
      });
      return; // Don't call next() if sending response
    }
    
    // Check if booking is completed
    if (booking.status !== BookingStatus.completed) {
      res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
      return; // Don't call next() if sending response
    }
    
    // Check if the booking is marked as review eligible
    if (!booking.reviewEligible) {
      res.status(400).json({
        success: false,
        message: 'This booking is not eligible for review'
      });
      return; // Don't call next() if sending response
    }
    
    // Check if the review eligibility period has expired
    if (booking.reviewEligibleUntil && new Date(booking.reviewEligibleUntil) < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Review period has expired for this booking'
      });
      return; // Don't call next() if sending response
    }
    
    // Check if a review already exists
    if (booking.review) {
      res.status(400).json({
        success: false,
        message: 'A review already exists for this booking'
      });
      return; // Don't call next() if sending response
    }
    
    // Add booking to locals for use in the controller
    res.locals.booking = booking;
    
    next();
  } catch (error) {
    console.error('Error in review eligibility validation:', error);
    next(error);
  }
};

/**
 * Validates review creation inputs
 */
export const validateReviewInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { rating, comment } = req.body;
  
  // Validate rating is present and within range
  if (rating === undefined || rating === null) {
    res.status(400).json({
      success: false,
      message: 'Rating is required'
    });
    return; // Don't call next() if sending response
  }
  
  const ratingValue = Number(rating);
  
  if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
    return; // Don't call next() if sending response
  }
  
  // Validate comment if present
  if (comment && typeof comment === 'string' && comment.length > 1000) {
    res.status(400).json({
      success: false,
      message: 'Comment cannot exceed 1000 characters'
    });
    return; // Don't call next() if sending response
  }
  
  // Sanitize inputs
  req.body.rating = ratingValue;
  req.body.comment = comment ? comment.trim() : null;
  
  next();
};

/**
 * Detects and prevents review manipulation attempts
 */
export const detectReviewManipulation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const userId = req.user?.id;
    
    if (!userId || !bookingId) {
      next();
      return;
    }
    
    // Check for suspicious pattern: many reviews in short time
    const recentReviews = await prisma.review.count({
      where: {
        booking: {
          customerId: userId
        },
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      }
    });
    
    if (recentReviews >= 5) {
      console.warn('SECURITY ALERT: Potential review flooding', {
        userId,
        reviewCount: recentReviews,
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many reviews submitted recently. Please try again later.'
      });
      return; // Don't call next() if sending response
    }
    
    // Check for suspicious pattern: extreme ratings for same provider
    if (res.locals.booking) {
      const providerId = res.locals.booking.service.providerId;
      
      // Get recent reviews for this provider by this user
      const providerReviews = await prisma.review.findMany({
        where: {
          booking: {
            customerId: userId,
            service: {
              providerId
            }
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        select: {
          rating: true
        }
      });
      
      // If this is at least the second review
      if (providerReviews.length > 0) {
        const currentRating = Number(req.body.rating);
        const previousRatings = providerReviews.map(r => r.rating);
        
        // Check for drastic rating change (e.g., all 5s then a 1)
        const avgPreviousRating = previousRatings.reduce((a, b) => a + b, 0) / previousRatings.length;
        
        if ((avgPreviousRating >= 4.5 && currentRating <= 1.5) || 
            (avgPreviousRating <= 1.5 && currentRating >= 4.5)) {
          console.warn('SECURITY ALERT: Drastic rating change detected', {
            userId,
            providerId,
            previousRatings,
            currentRating,
            timestamp: new Date().toISOString()
          });
          
          // We don't block this but flag it for moderation
          res.locals.flagForModeration = true;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in review manipulation detection:', error);
    next(); // Proceed even if detection fails
  }
};

export default {
  validateReviewEligibility,
  validateReviewInput,
  detectReviewManipulation
};
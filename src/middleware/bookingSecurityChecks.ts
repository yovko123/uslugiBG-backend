// src/middleware/bookingSecurityChecks.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { BookingStatus, UserType } from '@prisma/client';

/**
 * This middleware checks for suspicious activity patterns
 * that may indicate manipulation attempts, and logs them
 * for security monitoring and potential fraud investigation
 */
export const detectManipulationAttempts = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId || !id) {
      next();
      return;
    }
    
    // Get the booking and user info
    const [booking, user] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: {
          service: {
            include: {
              provider: true
            }
          },
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10
          }
        }
      }),
      prisma.user.findUnique({
        where: { id: userId }
      })
    ]);
    
    if (!booking || !user) {
      next();
      return;
    }
    
    // Track suspicious activity
    const suspiciousActivity = [];
    
    // Check 1: Multiple status changes in short time
    if (booking.statusHistory && booking.statusHistory.length >= 3) {
      const recentChanges = booking.statusHistory.slice(0, 3);
      const timeSpan = new Date(recentChanges[0].changedAt).getTime() - 
                        new Date(recentChanges[2].changedAt).getTime();
      
      // If 3 status changes occurred within 5 minutes
      if (timeSpan < 5 * 60 * 1000) {
        suspiciousActivity.push('rapid_status_changes');
      }
    }
    
    // Check 2: Provider attempting to change status after service date
    const isProvider = booking.service.provider.userId === userId;
    const isPastServiceDate = new Date(booking.bookingDate) < new Date();
    
    if (isProvider && isPastServiceDate && 
        (req.body.status === BookingStatus.cancelled || 
         req.body.status === BookingStatus.no_show_customer)) {
      suspiciousActivity.push('post_service_provider_cancellation');
    }
    
    // Check 3: Customer attempting to avoid review by marking incomplete
    const isCustomer = booking.customerId === userId;
    if (isCustomer && booking.status === BookingStatus.completed &&
        req.body.status === BookingStatus.disputed && 
        !req.body.disputeReason) {
      suspiciousActivity.push('potential_review_avoidance');
    }
    
    // Check 4: Check for repeated no-show claims
    if (req.body.status === BookingStatus.no_show_customer || 
        req.body.status === BookingStatus.no_show_provider) {
      
      // Get recent bookings from the same provider or customer
      const recentNoShows = await prisma.booking.count({
        where: {
          OR: [
            { customerId: isCustomer ? userId : undefined },
            { service: isProvider ? { providerId: booking.service.providerId } : undefined }
          ],
          status: isProvider ? BookingStatus.no_show_customer : BookingStatus.no_show_provider,
          bookingDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });
      
      if (recentNoShows >= 3) {
        suspiciousActivity.push('repeated_no_show_claims');
      }
    }
    
    // If suspicious activity detected, log it but still proceed
    if (suspiciousActivity.length > 0) {
      console.warn('SECURITY ALERT: Potential manipulation detected', {
        bookingId: booking.id,
        userId,
        userType: user.userType,
        serviceId: booking.serviceId,
        suspiciousActivity,
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
        requestBody: req.body
      });
      
      // For critical manipulations, we could add additional validation
      if (suspiciousActivity.includes('post_service_provider_cancellation')) {
        res.status(403).json({
          success: false,
          message: 'Cannot cancel a booking after service date has passed'
        });
        return; // Don't call next() if sending response
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in manipulation detection middleware:', error);
    next(); // Proceed even if detection fails
  }
};

/**
 * Calculate and validate cancellation penalties
 * Ensures proper tracking of cancellations and protects
 * against cancellation abuse
 */
export const calculateCancellationPenalties = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.body.status !== BookingStatus.cancelled) {
      next();
      return;
    }
    
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId || !id) {
      next();
      return;
    }
    
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          include: {
            provider: true
          }
        }
      }
    });
    
    if (!booking) {
      next();
      return;
    }
    
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    
    // Check cancellation time vs booking time
    const now = new Date();
    const bookingDate = new Date(booking.bookingDate);
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (60 * 60 * 1000);
    
    // Set cancellation penalties and notifications
    if (isProvider) {
      // Provider cancellations
      if (hoursUntilBooking < 24) {
        // Cancelling less than 24 hours before service
        req.body.providerPenalty = true;
        req.body.providerPenaltyAmount = booking.totalPrice * 0.15; // 15% penalty
        
        // For notification purposes
        res.locals.sendProviderPenaltyNotification = true;
        res.locals.penaltyAmount = req.body.providerPenaltyAmount;
      }
      
      // Track pattern of last-minute cancellations
      const recentCancellations = await prisma.booking.count({
        where: {
          service: {
            providerId: booking.service.providerId
          },
          status: BookingStatus.cancelled,
          cancelledBy: userId,
          cancellationTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });
      
      if (recentCancellations >= 3) {
        console.warn('SECURITY ALERT: Provider has frequent cancellations', {
          providerId: booking.service.providerId,
          userId,
          cancellationCount: recentCancellations,
          timestamp: new Date().toISOString()
        });
      }
    } else if (isCustomer) {
      // Customer cancellations
      if (hoursUntilBooking < 24) {
        // If customer cancels less than 24 hours before service
        req.body.customerPenalty = true;
        req.body.customerPenaltyAmount = booking.totalPrice * 0.10; // 10% penalty
        
        // For notification purposes
        res.locals.sendCustomerPenaltyNotification = true;
        res.locals.penaltyAmount = req.body.customerPenaltyAmount;
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in cancellation penalty middleware:', error);
    next(); // Proceed even if calculation fails
  }
};

/**
 * Validates the booking belongs to the current user
 * and they have proper permissions to act on it
 */
export const validateBookingOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return; // Don't call next() if sending response
    }
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
      return; // Don't call next() if sending response
    }
    
    const [booking, user] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: {
          service: {
            include: {
              provider: true
            }
          }
        }
      }),
      prisma.user.findUnique({
        where: { id: userId }
      })
    ]);
    
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return; // Don't call next() if sending response
    }
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return; // Don't call next() if sending response
    }
    
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    const isAdmin = user.userType === UserType.admin;
    
    // Check if user is authorized
    if (!isProvider && !isCustomer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
      return; // Don't call next() if sending response
    }
    
    // Add user role to request for use in other middleware
    res.locals.userRole = isProvider ? 'provider' : (isCustomer ? 'customer' : 'admin');
    res.locals.booking = booking;
    
    next();
  } catch (error) {
    console.error('Error in booking ownership validation:', error);
    next(error);
  }
};

export default {
  detectManipulationAttempts,
  calculateCancellationPenalties,
  validateBookingOwnership
};
// src/middleware/bookingValidation.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { BookingStatus } from '@prisma/client';

/**
 * Validates booking status transitions to ensure they follow allowed paths
 * This prevents manipulation of booking statuses for review fraud
 */
export const validateStatusTransition = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Skip validation if status isn't being updated
    if (!status) return next();
    
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
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }
    
    const currentStatus = booking.status;
    const newStatus = status as BookingStatus;
    const userId = req.user?.id;
    
    // Check if user is authorized to make this change
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    
    if (!isProvider && !isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
      return;
    }
    
    // Define allowed transitions
    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.pending]: [BookingStatus.confirmed, BookingStatus.cancelled],
      [BookingStatus.confirmed]: [BookingStatus.in_progress, BookingStatus.cancelled, BookingStatus.no_show_customer, BookingStatus.no_show_provider],
      [BookingStatus.in_progress]: [BookingStatus.completed, BookingStatus.disputed],
      [BookingStatus.completed]: [BookingStatus.disputed],
      [BookingStatus.cancelled]: [],
      [BookingStatus.no_show_customer]: [],
      [BookingStatus.no_show_provider]: [],
      [BookingStatus.disputed]: [BookingStatus.completed]
    };
    
    // Check if transition is allowed
    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      res.status(400).json({
        success: false,
        message: `Cannot transition from ${currentStatus} to ${newStatus}`
      });
      return;
    }
    
    // Special restrictions
    
    // Only provider can confirm booking
    if (newStatus === BookingStatus.confirmed && !isProvider) {
      res.status(403).json({
        success: false,
        message: 'Only the service provider can confirm bookings'
      });
      return;
    }
    
    // Only provider can mark customer as no-show
    if (newStatus === BookingStatus.no_show_customer && !isProvider) {
      res.status(403).json({
        success: false,
        message: 'Only the service provider can mark customer as no-show'
      });
      return;
    }
    
    // Only customer can mark provider as no-show
    if (newStatus === BookingStatus.no_show_provider && !isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Only the customer can mark provider as no-show'
      });
      return;
    }
    
    // Cancellation checks
    if (newStatus === BookingStatus.cancelled) {
      // Prevent cancellations after service date
      const now = new Date();
      if (booking.bookingDate < now) {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel booking after service date has passed'
        });
        return;
      }
      
      // Track who's cancelling to prevent abuse
      req.body.cancelledBy = userId;
      req.body.cancellationTime = new Date();
    }
    
    // Add to status history for audit trail
    req.body.statusHistory = {
      create: {
        previousStatus: currentStatus,
        newStatus: newStatus,
        changedBy: userId as number,
        reason: req.body.statusChangeReason || null
      }
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates that completion can only be marked by authorized parties
 * and that both parties must agree for a booking to be considered complete
 */
export const validateCompletionMarking = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { completedByCustomer, completedByProvider } = req.body;
    
    // Skip if not trying to mark completion
    if (completedByCustomer === undefined && completedByProvider === undefined) {
      return next();
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
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }
    
    const userId = req.user?.id;
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    
    // Only customer can mark completedByCustomer
    if (completedByCustomer !== undefined && !isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Only the customer can mark booking as completed by customer'
      });
      return;
    }
    
    // Only provider can mark completedByProvider
    if (completedByProvider !== undefined && !isProvider) {
      res.status(403).json({
        success: false,
        message: 'Only the provider can mark booking as completed by provider'
      });
      return;
    }
    
    // If both parties have marked complete, update status to completed
    const customerCompleted = completedByCustomer !== undefined 
      ? completedByCustomer 
      : booking.completedByCustomer;
      
    const providerCompleted = completedByProvider !== undefined 
      ? completedByProvider 
      : booking.completedByProvider;
      
    if (customerCompleted && providerCompleted) {
      req.body.status = BookingStatus.completed;
      req.body.reviewEligible = true;
      
      // Set review eligibility window to 14 days
      const reviewWindow = new Date();
      reviewWindow.setDate(reviewWindow.getDate() + 14);
      req.body.reviewEligibleUntil = reviewWindow;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates dispute creation to ensure only authorized parties can file disputes
 * and that disputes can only be filed in appropriate circumstances
 */
export const validateDisputeCreation = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { hasDispute, disputeReason } = req.body;
    
    // Skip if not trying to create/update a dispute
    if (hasDispute === undefined) {
      return next();
    }
    
    // Cannot remove dispute once created
    if (hasDispute === false) {
      res.status(400).json({
        success: false,
        message: 'Cannot remove a dispute once created'
      });
      return;
    }
    
    // Require dispute reason
    if (hasDispute === true && !disputeReason) {
      res.status(400).json({
        success: false,
        message: 'Dispute reason is required'
      });
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
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }
    
    const userId = req.user?.id;
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    
    // Only provider or customer can create dispute
    if (!isProvider && !isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to create a dispute for this booking'
      });
      return;
    }
    
    // Can only dispute completed or in-progress bookings
    if (booking.status !== BookingStatus.completed && booking.status !== BookingStatus.in_progress) {
      res.status(400).json({
        success: false,
        message: 'Can only create disputes for completed or in-progress bookings'
      });
      return;
    }
    
    // Set dispute status to OPEN when creating a new dispute
    if (hasDispute === true && !booking.hasDispute) {
      req.body.disputeStatus = 'OPEN';
      req.body.status = BookingStatus.disputed;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

export default {
  validateStatusTransition,
  validateCompletionMarking,
  validateDisputeCreation
};
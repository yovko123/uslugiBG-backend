// src/controllers/booking/bookingController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { BookingStatus, BookingType, DisputeStatus } from '@prisma/client';

/**
 * Create a booking for a service
 * Handles both direct bookings and inquiry-based bookings based on service type
 */
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { serviceId, bookingDate, totalPrice } = req.body;
    const customerId = req.user?.id;

    if (!customerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate required fields
    if (!serviceId || !bookingDate) {
      res.status(400).json({
        success: false,
        message: 'Service ID and booking date are required'
      });
      return;
    }

    // Fetch the service to check booking type
    const service = await prisma.service.findUnique({
      where: { id: parseInt(serviceId) },
      include: {
        provider: true
      }
    });

    if (!service) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    // Ensure customer is not the provider
    if (service.provider.userId === customerId) {
      res.status(400).json({
        success: false,
        message: 'Cannot book your own service'
      });
      return;
    }

    // Validate booking date is in the future
    const bookingDateObj = new Date(bookingDate);
    if (bookingDateObj <= new Date()) {
      res.status(400).json({
        success: false,
        message: 'Booking date must be in the future'
      });
      return;
    }

    // Set initial status based on booking type
    const initialStatus = service.bookingType === BookingType.DIRECT 
      ? BookingStatus.confirmed 
      : BookingStatus.pending;

    // Calculate total price if not provided
    const calculatedTotalPrice = totalPrice || service.price;

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        serviceId: parseInt(serviceId),
        customerId,
        bookingDate: bookingDateObj,
        status: initialStatus,
        totalPrice: calculatedTotalPrice,
        // Add initial status history for audit trail
        statusHistory: {
          create: {
            previousStatus: BookingStatus.pending,
            newStatus: initialStatus,
            changedBy: customerId,
            reason: 'Booking created'
          }
        }
      },
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: true
              }
            }
          }
        },
        customer: true
      }
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: service.bookingType === BookingType.DIRECT 
        ? 'Booking confirmed successfully' 
        : 'Booking request sent to provider'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    next(error);
  }
};

/**
 * Update booking status
 * Handles status transitions with proper validation and security checks
 */
export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, statusChangeReason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
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
        },
        customer: true
      }
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Note: Status transition validation is handled by middleware
    // This just performs the update

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        status: status as BookingStatus,
        statusHistory: {
          create: {
            previousStatus: booking.status,
            newStatus: status as BookingStatus,
            changedBy: userId,
            reason: statusChangeReason
          }
        },
        ...(status === BookingStatus.cancelled && {
          cancelledBy: userId,
          cancellationTime: new Date(),
          cancellationReason: statusChangeReason
        })
      },
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: true
              }
            }
          }
        },
        customer: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5
        }
      }
    });

    res.json({
      success: true,
      data: updatedBooking,
      message: `Booking status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    next(error);
  }
};

/**
 * Mark booking as completed by customer or provider
 * When both mark as complete, the booking is considered completed
 */
export const markBookingCompletion = async (
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
    
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    
    if (!isProvider && !isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
      return;
    }
    
    // Update completion status based on user role
    const updateData: any = {};
    
    if (isCustomer) {
      updateData.completedByCustomer = true;
    } else if (isProvider) {
      updateData.completedByProvider = true;
    }
    
    // Check if both parties have now marked as complete
    const bothComplete = (isCustomer && booking.completedByProvider) || 
                         (isProvider && booking.completedByCustomer);
    
    if (bothComplete || (updateData.completedByCustomer && updateData.completedByProvider)) {
      updateData.status = BookingStatus.completed;
      updateData.reviewEligible = true;
      
      // Set review eligibility window to 14 days
      const reviewWindow = new Date();
      reviewWindow.setDate(reviewWindow.getDate() + 14);
      updateData.reviewEligibleUntil = reviewWindow;
      
      // Add status history entry
      updateData.statusHistory = {
        create: {
          previousStatus: booking.status,
          newStatus: BookingStatus.completed,
          changedBy: userId,
          reason: 'Both parties marked as complete'
        }
      };
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: true
              }
            }
          }
        },
        customer: true
      }
    });
    
    res.json({
      success: true,
      data: updatedBooking,
      message: bothComplete 
        ? 'Booking marked as completed' 
        : 'Booking completion status updated'
    });
  } catch (error) {
    console.error('Error marking booking completion:', error);
    next(error);
  }
};

/**
 * Create or update a dispute for a booking
 */
export const handleDispute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { disputeReason } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
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
    
    // Note: Dispute creation validation is handled by middleware
    
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        hasDispute: true,
        disputeReason,
        disputeStatus: DisputeStatus.OPEN,
        status: BookingStatus.disputed,
        statusHistory: {
          create: {
            previousStatus: booking.status,
            newStatus: BookingStatus.disputed,
            changedBy: userId,
            reason: `Dispute created: ${disputeReason}`
          }
        }
      },
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: true
              }
            }
          }
        },
        customer: true
      }
    });
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Dispute created successfully'
    });
  } catch (error) {
    console.error('Error handling dispute:', error);
    next(error);
  }
};

/**
 * Resolve a dispute
 * Only available to system administrators or moderators
 */
export const resolveDispute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution, resolutionNotes } = req.body;
    const userId = req.user?.id;
    
    // TODO: Add proper role check for administrators/moderators
    const isAdmin = req.user?.id === Number(process.env.ADMIN_USER_ID) || 
                req.headers['x-admin-key'] === process.env.ADMIN_SECRET_KEY;
    
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only administrators can resolve disputes'
      });
      return;
    }
    
    // Validate resolution input
    if (!resolution || !Object.values(DisputeStatus).includes(resolution as DisputeStatus)) {
      res.status(400).json({
        success: false,
        message: 'Valid resolution status is required'
      });
      return;
    }
    
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: true,
        customer: true
      }
    });
    
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }
    
    if (!booking.hasDispute) {
      res.status(400).json({
        success: false,
        message: 'This booking has no active dispute'
      });
      return;
    }
    
    // Determine new booking status based on resolution
    let newStatus: BookingStatus;
    let reviewEligible = false;
    
    if (resolution === DisputeStatus.RESOLVED_FOR_CUSTOMER || 
        resolution === DisputeStatus.RESOLVED_FOR_PROVIDER) {
      newStatus = BookingStatus.completed;
      reviewEligible = true;
    } else if (resolution === DisputeStatus.CLOSED_NO_RESOLUTION) {
      newStatus = BookingStatus.cancelled;
      reviewEligible = false;
    } else {
      // Default case - if none of the above match
      newStatus = BookingStatus.disputed;
    }
    
    // Update booking with resolution
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        disputeStatus: resolution as DisputeStatus,
        disputeResolvedAt: new Date(),
        status: newStatus,
        reviewEligible,
        ...(reviewEligible && {
          reviewEligibleUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }),
        statusHistory: {
          create: {
            previousStatus: booking.status,
            newStatus: newStatus,
            changedBy: userId || 0,
            reason: `Dispute resolved: ${resolutionNotes}`
          }
        }
      },
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: true
              }
            }
          }
        },
        customer: true
      }
    });
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Dispute resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    next(error);
  }
};

/**
 * Get bookings for the current user
 * Different views for providers and customers
 */
export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { status, page = '1', limit = '10' } = req.query;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Build query based on user type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { providerProfile: true }
    });
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    const isProvider = user.userType === 'provider' && user.providerProfile;
    
    let whereClause: any = {};
    
    if (isProvider) {
      // Provider sees bookings for their services
      whereClause = {
        service: {
          providerId: user.providerProfile!.id
        }
      };
    } else {
      // Customer sees their own bookings
      whereClause = {
        customerId: userId
      };
    }
    
    // Add status filter if provided
    if (status && Object.values(BookingStatus).includes(status as BookingStatus)) {
      whereClause.status = status;
    }
    
    // Get total count for pagination
    const totalCount = await prisma.booking.count({
      where: whereClause
    });
    
    // Get bookings with pagination
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            serviceImages: {
              where: { isMain: true },
              take: 1
            }
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 3
        },
        review: true
      },
      orderBy: { bookingDate: 'desc' },
      skip,
      take: limitNum
    });
    
    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting bookings:', error);
    next(error);
  }
};

/**
 * Get a single booking by ID
 * Checks authorization to ensure only relevant parties can access
 */
export const getBookingById = async (
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
      return;
    }
    
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: true
              }
            },
            serviceImages: true
          }
        },
        customer: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' }
        },
        review: true
      }
    });
    
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }
    
    // Check if user is authorized to view this booking
    const isProvider = booking.service.provider.userId === userId;
    const isCustomer = booking.customerId === userId;
    
    if (!isProvider && !isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
      return;
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error getting booking:', error);
    next(error);
  }
};

export default {
  createBooking,
  updateBookingStatus,
  markBookingCompletion,
  handleDispute,
  resolveDispute,
  getMyBookings,
  getBookingById
};
// src/jobs/autoCompleteBookings.ts
import { PrismaClient, BookingStatus } from '@prisma/client';
import { scheduleJob } from 'node-schedule';

const prisma = new PrismaClient();

/**
 * This job automatically completes bookings if:
 * 1. The service date has passed more than 72 hours ago
 * 2. The booking is still in in_progress status
 * 3. The customer has marked it as completed
 * 4. The provider has not responded (marked as completed or disputed)
 * 
 * This prevents providers from manipulating the review system by never marking completion
 */
export const autoCompleteBookingsJob = async (): Promise<void> => {
  try {
    console.log('Running auto-complete bookings job');
    
    // Calculate the cutoff time (72 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 72);
    
    // Find bookings that meet the criteria
    const bookingsToAutoComplete = await prisma.booking.findMany({
      where: {
        status: BookingStatus.in_progress,
        bookingDate: {
          lt: cutoffTime
        },
        completedByCustomer: true,
        completedByProvider: false,
        hasDispute: false
      },
      include: {
        service: {
          include: {
            provider: true
          }
        },
        customer: true
      }
    });
    
    console.log(`Found ${bookingsToAutoComplete.length} bookings to auto-complete`);
    
    // Process each booking
    for (const booking of bookingsToAutoComplete) {
      // Create a cutoff date for review eligibility (14 days from now)
      const reviewEligibleUntil = new Date();
      reviewEligibleUntil.setDate(reviewEligibleUntil.getDate() + 14);
      
      // Update the booking
      await prisma.booking.update({
        where: {
          id: booking.id
        },
        data: {
          status: BookingStatus.completed,
          completedByProvider: true,
          autoCompletedAt: new Date(),
          reviewEligible: true,
          reviewEligibleUntil,
          statusHistory: {
            create: {
              previousStatus: booking.status,
              newStatus: BookingStatus.completed,
              changedBy: 0, // System ID
              reason: 'Auto-completed after 72 hours'
            }
          }
        }
      });
      
      console.log(`Auto-completed booking ID: ${booking.id}`);
      
      // Here you would also send notifications to both parties
      // Implementation would depend on your notification system
    }
  } catch (error) {
    console.error('Error in auto-complete bookings job:', error);
  }
};

/**
 * Schedule the job to run daily at midnight
 */
export const scheduleAutoCompleteJob = (): void => {
  // Run at midnight every day
  scheduleJob('0 0 * * *', autoCompleteBookingsJob);
  console.log('Auto-complete bookings job scheduled');
};

export default {
  autoCompleteBookingsJob,
  scheduleAutoCompleteJob
};
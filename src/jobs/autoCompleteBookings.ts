// src/jobs/autoCompleteBookings.ts
import { PrismaClient, BookingStatus } from '@prisma/client';
import { subHours } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Auto-completes bookings after 72 hours if one party has marked it as complete but not both
 * This prevents bookings from being stuck in limbo if one party doesn't respond
 */
export async function autoCompleteBookings(): Promise<void> {
  try {
    console.log('Running auto-completion job for bookings...');
    
    // Find bookings that are in progress and either customer or provider (but not both) has marked as complete
    // and the last update was at least 72 hours ago
    const timeThreshold = subHours(new Date(), 72);
    
    const bookingsToAutoComplete = await prisma.booking.findMany({
      where: {
        status: BookingStatus.in_progress,
        updatedAt: {
          lt: timeThreshold
        },
        OR: [
          {
            completedByCustomer: true,
            completedByProvider: false
          },
          {
            completedByCustomer: false,
            completedByProvider: true
          }
        ]
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
    
    // Auto-complete each booking
    for (const booking of bookingsToAutoComplete) {
      // Set review eligibility window (14 days from now)
      const reviewEligibleUntil = new Date();
      reviewEligibleUntil.setDate(reviewEligibleUntil.getDate() + 14);
      
      // Update the booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.completed,
          completedByCustomer: true,
          completedByProvider: true,
          autoCompletedAt: new Date(),
          reviewEligible: true,
          reviewEligibleUntil,
          statusHistory: {
            create: {
              previousStatus: BookingStatus.in_progress,
              newStatus: BookingStatus.completed,
              changedBy: 0, // System-generated change
              reason: 'Auto-completed after 72 hours'
            }
          }
        }
      });
      
      console.log(`Auto-completed booking #${booking.id}`);
      
      // Here you would typically also send notifications to both parties
      // TODO: Add notification sending logic
    }
    
    console.log('Auto-completion job completed successfully');
  } catch (error) {
    console.error('Error in auto-completion job:', error);
  }
}

// If running this file directly
if (require.main === module) {
  autoCompleteBookings()
    .then(() => {
      console.log('Auto-completion job executed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error executing auto-completion job:', err);
      process.exit(1);
    });
}
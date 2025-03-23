import { scheduleJob } from 'node-schedule';
import { autoCompleteBookings } from './autoCompleteBookings';

/**
 * Register all scheduled jobs for the application
 */
export function registerScheduledJobs(): void {
  // Auto-complete bookings job - runs daily at midnight
  scheduleJob('0 0 * * *', async () => {
    console.log('Starting scheduled auto-complete bookings job');
    try {
      await autoCompleteBookings();
      console.log('Scheduled auto-complete bookings job completed successfully');
    } catch (error) {
      console.error('Error in scheduled auto-complete bookings job:', error);
    }
  });

  console.log('All scheduled jobs registered successfully');
}

// Export other jobs as they are created
export { autoCompleteBookings }; 
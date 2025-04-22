import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from './database';

export class BloodGlucoseService {
  private database: DatabaseService;

  constructor(database: DatabaseService) {
    this.database = database;
  }

  async getBloodGlucoseSamples(
    startDate: Date,
    endDate: Date,
  ): Promise<BloodGlucose[]> {
    try {
      // Calculate the date one year ago from now
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Use the later of the two dates (one year ago or provided start date)
      const adjustedStartDate = new Date(
        Math.max(oneYearAgo.getTime(), startDate.getTime()),
      );

      // Add 1 day buffer to ensure we don't miss entries
      adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);

      const readings = await this.database.getReadingsByDateRange(
        adjustedStartDate,
        endDate,
      );

      // Sort readings by date in ascending order (oldest first)
      return readings.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
    } catch (error) {
      console.error('Error getting blood glucose samples:', error);
      return [];
    }
  }
}

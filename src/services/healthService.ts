import AppleHealthKit, {HealthValue} from 'react-native-health';
import GoogleFit, {Scopes} from 'react-native-google-fit';

const PERMS = AppleHealthKit.Constants.Permissions;

const healthKitOptions = {
  permissions: {
    read: [
      PERMS.BloodGlucose,
      PERMS.DateOfBirth,
      PERMS.BiologicalSex,
      PERMS.Weight,
    ],
    write: [PERMS.BloodGlucose],
  },
};

interface GoogleFitBloodGlucose {
  value: number;
  date: string;
  sourceName: string;
}

export class HealthService {
  private static instance: HealthService;
  private isHealthKitInitialized: boolean = false;
  private isGoogleFitInitialized: boolean = false;

  private constructor() {}

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  async initializeHealthKit(): Promise<boolean> {
    if (this.isHealthKitInitialized) {
      return true;
    }

    try {
      await AppleHealthKit.initHealthKit(healthKitOptions);
      this.isHealthKitInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing HealthKit:', error);
      return false;
    }
  }

  async initializeGoogleFit(): Promise<boolean> {
    if (this.isGoogleFitInitialized) {
      return true;
    }

    try {
      const authorized = await GoogleFit.checkIsAuthorized();
      if (!authorized) {
        const options = {
          scopes: [
            Scopes.FITNESS_ACTIVITY_READ,
            Scopes.FITNESS_BODY_READ,
            Scopes.FITNESS_BLOOD_GLUCOSE_READ,
          ],
        };
        await GoogleFit.authorize(options);
      }
      this.isGoogleFitInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Google Fit:', error);
      return false;
    }
  }

  async getBloodGlucoseFromHealthKit(
    startDate: Date,
    endDate: Date,
  ): Promise<HealthValue[]> {
    if (!this.isHealthKitInitialized) {
      await this.initializeHealthKit();
    }

    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: true,
      };

      AppleHealthKit.getBloodGlucoseSamples(
        options,
        (err: string, results: HealthValue[]) => {
          if (err) {
            reject(new Error(err));
            return;
          }
          resolve(results);
        },
      );
    });
  }

  async getBloodGlucoseFromGoogleFit(
    startDate: Date,
    endDate: Date,
  ): Promise<GoogleFitBloodGlucose[]> {
    if (!this.isGoogleFitInitialized) {
      await this.initializeGoogleFit();
    }

    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      return await GoogleFit.getBloodGlucoseSamples(options);
    } catch (error) {
      console.error('Error getting blood glucose from Google Fit:', error);
      return [];
    }
  }

  async getAllBloodGlucoseReadings(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    healthKit: HealthValue[];
    googleFit: GoogleFitBloodGlucose[];
  }> {
    try {
      const [healthKitReadings, googleFitReadings] = await Promise.all([
        this.getBloodGlucoseFromHealthKit(startDate, endDate),
        this.getBloodGlucoseFromGoogleFit(startDate, endDate),
      ]);

      return {
        healthKit: healthKitReadings,
        googleFit: googleFitReadings,
      };
    } catch (error) {
      console.error('Error getting blood glucose readings:', error);
      return {
        healthKit: [],
        googleFit: [],
      };
    }
  }
}

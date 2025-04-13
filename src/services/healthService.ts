import {Platform} from 'react-native';
import GoogleFit, {Scopes} from 'react-native-google-fit';
import AppleHealthKit from 'react-native-health';

interface GoogleFitBloodGlucose {
  value: number;
  date: string;
  sourceName: string;
}

interface HealthValue {
  value: number;
  startDate: string;
  endDate: string;
}

export class HealthService {
  private static instance: HealthService;
  private healthKit: typeof AppleHealthKit | null = null;
  private googleFit: any;
  private isHealthKitInitialized: boolean = false;
  private isGoogleFitInitialized: boolean = false;

  private constructor() {
    if (Platform.OS === 'ios') {
      this.healthKit = AppleHealthKit;
    } else if (Platform.OS === 'android') {
      this.googleFit = require('react-native-google-fit').default;
    }
  }

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

    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    try {
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.BloodGlucose,
            AppleHealthKit.Constants.Permissions.DateOfBirth,
            AppleHealthKit.Constants.Permissions.BiologicalSex,
            AppleHealthKit.Constants.Permissions.Weight,
          ],
          write: [AppleHealthKit.Constants.Permissions.BloodGlucose],
        },
      };

      return new Promise(resolve => {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.error('Error initializing HealthKit:', error);
            resolve(false);
          } else {
            this.isHealthKitInitialized = true;
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error initializing HealthKit:', error);
      return false;
    }
  }

  async initializeGoogleFit(): Promise<boolean> {
    if (this.isGoogleFitInitialized) {
      return true;
    }

    if (Platform.OS !== 'android') {
      console.log('Google Fit is only available on Android');
      return false;
    }

    if (!GoogleFit) {
      console.error('GoogleFit module is not available');
      return false;
    }

    try {
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_BLOOD_GLUCOSE_READ,
        ],
      };
      await GoogleFit.authorize(options);
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
    if (Platform.OS !== 'ios') {
      return [];
    }

    const initialized = await this.initializeHealthKit();
    if (!initialized) {
      return [];
    }

    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: true,
      };

      return new Promise(resolve => {
        AppleHealthKit.getBloodGlucoseSamples(
          options,
          (error: string, samples: any[]) => {
            if (error) {
              console.error(
                'Error getting blood glucose from HealthKit:',
                error,
              );
              resolve([]);
            } else {
              resolve(
                samples.map((result: any) => ({
                  value: result.value,
                  startDate: result.startDate,
                  endDate: result.endDate,
                })),
              );
            }
          },
        );
      });
    } catch (error) {
      console.error('Error getting blood glucose from HealthKit:', error);
      return [];
    }
  }

  async getBloodGlucoseFromGoogleFit(
    startDate: Date,
    endDate: Date,
  ): Promise<GoogleFitBloodGlucose[]> {
    if (Platform.OS !== 'android') {
      return [];
    }

    if (!this.isGoogleFitInitialized) {
      const initialized = await this.initializeGoogleFit();
      if (!initialized) {
        return [];
      }
    }

    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      if (!GoogleFit.getBloodGlucoseSamples) {
        console.error('getBloodGlucoseSamples method is not available');
        return [];
      }

      const results = await GoogleFit.getBloodGlucoseSamples(options);
      return results.map(result => ({
        value: result.value,
        date: new Date(result.startDate).toISOString(),
        sourceName: 'Google Fit',
      }));
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

  async hasHealthKitPermission(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !this.healthKit) {
      return false;
    }

    try {
      const permissions = {
        permissions: {
          read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
          write: [AppleHealthKit.Constants.Permissions.BloodGlucose],
        },
      };

      return new Promise(resolve => {
        this.healthKit?.getAuthStatus(
          permissions,
          (error: string, results: any) => {
            if (error) {
              console.error('Error checking HealthKit permissions:', error);
              resolve(false);
            } else {
              const bloodGlucosePermission =
                results[AppleHealthKit.Constants.Permissions.BloodGlucose];
              resolve(bloodGlucosePermission === 2); // 2 = authorized
            }
          },
        );
      });
    } catch (error) {
      console.error('Error checking HealthKit permissions:', error);
      return false;
    }
  }

  async requestHealthKitPermission(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !this.healthKit) {
      return false;
    }

    try {
      const permissions = {
        permissions: {
          read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
          write: [AppleHealthKit.Constants.Permissions.BloodGlucose],
        },
      };

      return new Promise(resolve => {
        this.healthKit?.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.error('Error requesting HealthKit permissions:', error);
            resolve(false);
          } else {
            this.isHealthKitInitialized = true;
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error requesting HealthKit permissions:', error);
      return false;
    }
  }

  async hasGoogleFitPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const permissions = await this.googleFit?.getPermissions();
      return permissions?.bloodGlucose === 'authorized';
    } catch (error) {
      console.error('Error checking Google Fit permissions:', error);
      return false;
    }
  }

  async requestGoogleFitPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const success = await this.googleFit?.requestPermissions({
        permissions: {
          read: ['bloodGlucose'],
          write: ['bloodGlucose'],
        },
      });
      return success?.bloodGlucose === 'authorized';
    } catch (error) {
      console.error('Error requesting Google Fit permissions:', error);
      return false;
    }
  }
}

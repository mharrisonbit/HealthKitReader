import {Platform} from 'react-native';
import GoogleFit, {Scopes} from 'react-native-google-fit';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthInputOptions,
  HealthValue,
  HealthValueOptions,
} from 'react-native-health';
import {
  HKHealthStore,
  HKQuantityType,
  HKQuantityTypeIdentifier,
  HKQuantity,
  HKUnit,
  HKMetricPrefix,
  HKQuantitySample,
} from 'react-native-healthkit';
import {DatabaseService} from './database';

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
  private databaseService: DatabaseService;
  private permissions = {
    permissions: {
      read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
      write: [AppleHealthKit.Constants.Permissions.BloodGlucose],
    },
  };

  private constructor() {
    if (Platform.OS === 'ios') {
      this.healthKit = AppleHealthKit;
    } else if (Platform.OS === 'android') {
      this.googleFit = require('react-native-google-fit').default;
    }
    this.databaseService = new DatabaseService();
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
      console.log(`[${new Date().toISOString()}] HealthKit not initialized`);
      return [];
    }

    try {
      // Add 1 day buffer to ensure we don't miss entries
      const adjustedStartDate = new Date(startDate);
      adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);

      const options = {
        startDate: adjustedStartDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: true,
      };

      console.log(
        `[${new Date().toISOString()}] Querying HealthKit with date range:`,
        {
          startDate: options.startDate,
          endDate: options.endDate,
          currentTime: new Date().toISOString(),
        },
      );

      return new Promise(resolve => {
        AppleHealthKit.getBloodGlucoseSamples(
          options,
          (error: string, samples: any[]) => {
            if (error) {
              console.error(
                `[${new Date().toISOString()}] Error getting blood glucose from HealthKit:`,
                error,
              );
              resolve([]);
            } else {
              console.log(
                `[${new Date().toISOString()}] Retrieved ${
                  samples.length
                } samples from HealthKit`,
              );
              const convertedSamples = samples.map((result: any) => {
                console.log(
                  `[${new Date().toISOString()}] Processing sample:`,
                  {
                    value: result.value,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    sourceName: result.sourceName || 'Unknown',
                  },
                );
                return {
                  value: result.value,
                  startDate: result.startDate,
                  endDate: result.endDate,
                };
              });
              resolve(convertedSamples);
            }
          },
        );
      });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error getting blood glucose from HealthKit:`,
        error,
      );
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

  async saveBloodGlucoseRangesToHealthKit(
    low: number,
    high: number,
  ): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    const initialized = await this.initializeHealthKit();
    if (!initialized) {
      return;
    }

    try {
      // Save low range
      await AppleHealthKit.saveBloodGlucoseSample({
        value: low,
        startDate: new Date().toISOString(),
        unit: AppleHealthKit.Constants.Units.BloodGlucose,
      });

      // Save high range
      await AppleHealthKit.saveBloodGlucoseSample({
        value: high,
        startDate: new Date().toISOString(),
        unit: AppleHealthKit.Constants.Units.BloodGlucose,
      });
    } catch (error) {
      console.error('Error saving blood glucose ranges to HealthKit:', error);
    }
  }

  async saveBloodGlucoseToHealthKit(value: number, date: Date): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    const initialized = await this.initializeHealthKit();
    if (!initialized) {
      return;
    }

    try {
      console.log('Saving to HealthKit:', {
        value: value,
        unit: 'mg/dL',
      });

      await new Promise<void>((resolve, reject) => {
        AppleHealthKit.saveBloodGlucoseSample(
          {
            value: value,
            startDate: date.toISOString(),
            unit: 'mg/dL',
          },
          (error: string) => {
            if (error) {
              console.error('Error saving to HealthKit:', error);
              reject(new Error(error));
            } else {
              console.log('Successfully saved to HealthKit:', value, 'mg/dL');
              resolve();
            }
          },
        );
      });
    } catch (error) {
      console.error('Error saving blood glucose to HealthKit:', error);
      throw error;
    }
  }

  async importBloodGlucoseInBatches(
    startDate: Date,
    endDate: Date,
    onProgress: (progress: {
      currentDate: Date;
      totalDays: number;
      currentDay: number;
    }) => void,
  ): Promise<{importedCount: number; duplicateCount: number}> {
    // Add 1 day buffer to ensure we don't miss entries
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);

    console.log(
      `[${new Date().toISOString()}] Starting batch import with date range:`,
      {
        startDate: adjustedStartDate.toISOString(),
        endDate: endDate.toISOString(),
        currentTime: new Date().toISOString(),
      },
    );

    const totalDays = Math.ceil(
      (endDate.getTime() - adjustedStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    let importedCount = 0;
    let duplicateCount = 0;
    let currentDate = new Date(adjustedStartDate);

    while (currentDate <= endDate) {
      const batchEndDate = new Date(currentDate);
      batchEndDate.setHours(23, 59, 59, 999);

      console.log(`[${new Date().toISOString()}] Processing batch for date:`, {
        date: currentDate.toISOString(),
        batchEndDate: batchEndDate.toISOString(),
      });

      const {healthKit, googleFit} = await this.getAllBloodGlucoseReadings(
        currentDate,
        batchEndDate,
      );

      console.log(`[${new Date().toISOString()}] Retrieved readings:`, {
        healthKitCount: healthKit.length,
        googleFitCount: googleFit.length,
        date: currentDate.toISOString(),
      });

      // Get existing readings from our database
      const existingReadings = await this.databaseService.getAllReadings();
      console.log(
        `[${new Date().toISOString()}] Existing readings count:`,
        existingReadings.length,
      );

      const existingReadingsMap = new Map(
        existingReadings.map(reading => [
          `${reading.timestamp.getTime()}_${reading.value}_${
            reading.sourceName
          }`,
          reading,
        ]),
      );

      // Process HealthKit readings
      for (const reading of healthKit) {
        const readingTime = new Date(reading.startDate).getTime();
        const readingKey = `${readingTime}_${reading.value}_Apple Health`;

        console.log(
          `[${new Date().toISOString()}] Processing HealthKit reading:`,
          {
            value: reading.value,
            timestamp: reading.startDate,
            key: readingKey,
            currentTime: new Date().toISOString(),
          },
        );

        if (existingReadingsMap.has(readingKey)) {
          console.log(
            `[${new Date().toISOString()}] Skipping duplicate reading:`,
            readingKey,
          );
          duplicateCount++;
          continue;
        }

        try {
          await this.databaseService.addReading({
            value: reading.value,
            unit: 'mg/dL',
            timestamp: new Date(reading.startDate),
            sourceName: 'Apple Health',
            notes: 'Imported from Apple Health',
          });
          console.log(
            `[${new Date().toISOString()}] Successfully imported reading:`,
            {
              value: reading.value,
              timestamp: reading.startDate,
            },
          );
          importedCount++;
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] Error adding HealthKit reading:`,
            error,
          );
        }
      }

      // Process Google Fit readings
      for (const reading of googleFit) {
        const readingTime = new Date(reading.date).getTime();
        const readingKey = `${readingTime}_${reading.value}_${
          reading.sourceName || 'Google Fit'
        }`;

        if (existingReadingsMap.has(readingKey)) {
          duplicateCount++;
          continue;
        }

        try {
          await this.databaseService.addReading({
            value: reading.value,
            unit: 'mg/dL',
            timestamp: new Date(reading.date),
            sourceName: reading.sourceName || 'Google Fit',
            notes: `Imported from ${reading.sourceName || 'Google Fit'}`,
          });
          importedCount++;
        } catch (error) {
          console.error('Error adding Google Fit reading:', error);
          // Continue with next reading
        }
      }

      // Update progress
      onProgress({
        currentDate: new Date(currentDate),
        totalDays,
        currentDay:
          Math.floor(
            (currentDate.getTime() - adjustedStartDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[${new Date().toISOString()}] Import complete:`, {
      importedCount,
      duplicateCount,
      totalDays,
      endTime: new Date().toISOString(),
    });

    return {importedCount, duplicateCount};
  }
}

import {Platform} from 'react-native';
import GoogleFit, {Scopes} from 'react-native-google-fit';
import AppleHealthKit from 'react-native-health';
import {DatabaseService} from './database';
import {SettingsService} from './settingsService';
import {BloodGlucose} from '../types/BloodGlucose';
import Logger from '../utils/logger';

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
  private settingsService: SettingsService;
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
    this.databaseService = DatabaseService.getInstance();
    this.settingsService = SettingsService.getInstance();
  }

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  async initialize(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await this.initializeHealthKit();
      } catch (error) {
        Logger.error('Error initializing HealthKit:', error);
        throw error;
      }
    } else {
      try {
        await this.initializeGoogleFit();
      } catch (error) {
        Logger.error('Error initializing Google Fit:', error);
        throw error;
      }
    }
  }

  private async initializeHealthKit(): Promise<void> {
    if (this.isHealthKitInitialized) {
      return;
    }

    if (Platform.OS !== 'ios') {
      Logger.log('HealthKit is only available on iOS');
      return;
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

      await new Promise<void>((resolve, reject) => {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            Logger.error('Error initializing HealthKit:', error);
            reject(new Error(error));
          } else {
            Logger.log('HealthKit initialized successfully');
            this.isHealthKitInitialized = true;
            resolve();
          }
        });
      });
    } catch (error) {
      Logger.error('Error in HealthKit initialization:', error);
      throw error;
    }
  }

  private async initializeGoogleFit(): Promise<void> {
    if (this.isGoogleFitInitialized) {
      return;
    }

    if (Platform.OS !== 'android') {
      // console.log('Google Fit is only available on Android');
      return;
    }

    if (!GoogleFit) {
      console.error('GoogleFit module is not available');
      throw new Error('GoogleFit module is not available');
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
    } catch (error) {
      console.error('Error initializing Google Fit:', error);
      throw error;
    }
  }

  async getBloodGlucoseFromHealthKit(
    startDate: Date,
    endDate: Date,
  ): Promise<HealthValue[]> {
    if (Platform.OS !== 'ios' || !this.isHealthKitInitialized) {
      return [];
    }

    try {
      Logger.log('Fetching blood glucose from HealthKit...');
      Logger.log(
        `Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      const result = await new Promise<HealthValue[]>((resolve, reject) => {
        AppleHealthKit.getBloodGlucoseSamples(
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            unit: AppleHealthKit.Constants.Units.mgPerdL,
          },
          (err, results) => {
            if (err) {
              Logger.error('Error fetching blood glucose from HealthKit:', err);
              reject(err);
            } else {
              Logger.log(
                `Retrieved ${results?.length || 0} readings from HealthKit`,
              );
              // Convert the readings to the correct format
              const convertedReadings = (results || []).map(reading => {
                // Convert value to number and ensure it's in mg/dL
                let value = Number(reading.value);
                if (reading.unit === AppleHealthKit.Constants.Units.mmolPerL) {
                  // Convert from mmol/L to mg/dL
                  value = Math.round(value * 18.0182);
                }
                Logger.log('Converted reading:', {
                  original: reading,
                  converted: {
                    value,
                    startDate: reading.startDate,
                    endDate: reading.endDate,
                  },
                });
                return {
                  value,
                  startDate: reading.startDate,
                  endDate: reading.endDate,
                };
              });
              resolve(convertedReadings);
            }
          },
        );
      });

      return result;
    } catch (error) {
      Logger.error('Error in getBloodGlucoseFromHealthKit:', error);
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

      Logger.log(
        `Retrieved ${healthKitReadings.length} readings from HealthKit`,
      );
      Logger.log(
        `Retrieved ${googleFitReadings.length} readings from Google Fit`,
      );

      return {
        healthKit: healthKitReadings,
        googleFit: googleFitReadings,
      };
    } catch (error) {
      Logger.error('Error getting blood glucose readings:', error);
      return {
        healthKit: [],
        googleFit: [],
      };
    }
  }

  async hasHealthKitPermission(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      const result = await new Promise<boolean>(resolve => {
        AppleHealthKit.getAuthStatus(
          {
            permissions: {
              read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
              write: [AppleHealthKit.Constants.Permissions.BloodGlucose],
            },
          },
          (err, results) => {
            if (err) {
              Logger.error('Error checking HealthKit permissions:', err);
              resolve(false);
            } else {
              const hasPermission = results?.permissions?.read?.includes(
                AppleHealthKit.Constants.Permissions.BloodGlucose,
              );
              Logger.log('HealthKit permission status:', hasPermission);
              resolve(hasPermission);
            }
          },
        );
      });

      return result;
    } catch (error) {
      Logger.error('Error checking HealthKit permissions:', error);
      return false;
    }
  }

  async requestHealthKitPermission(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      const result = await new Promise<boolean>(resolve => {
        AppleHealthKit.initHealthKit(
          {
            permissions: {
              read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
              write: [AppleHealthKit.Constants.Permissions.BloodGlucose],
            },
          },
          err => {
            if (err) {
              Logger.error('Error requesting HealthKit permissions:', err);
              resolve(false);
            } else {
              Logger.log('HealthKit permission request successful');
              this.isHealthKitInitialized = true;
              resolve(true);
            }
          },
        );
      });

      return result;
    } catch (error) {
      Logger.error('Error requesting HealthKit permissions:', error);
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

    try {
      await this.initializeHealthKit();

      // Convert from mg/dL to mmol/L for HealthKit
      const valueInMmolL = value / 18.0182;

      await new Promise<void>((resolve, reject) => {
        AppleHealthKit.saveBloodGlucoseSample(
          {
            value: valueInMmolL,
            startDate: date.toISOString(),
            unit: AppleHealthKit.Constants.Units.mmolPerL,
          },
          (error: string) => {
            if (error) {
              Logger.error('Error saving to HealthKit:', error);
              reject(new Error(error));
            } else {
              Logger.log('Successfully saved to HealthKit:', value, 'mg/dL');
              resolve();
            }
          },
        );
      });
    } catch (error) {
      Logger.error('Error saving blood glucose to HealthKit:', error);
      throw error;
    }
  }

  async importBloodGlucoseInBatches(
    startDate: Date,
    endDate: Date,
    onProgress?: (progress: {
      currentDate: Date;
      totalDays: number;
      currentDay: number;
    }) => void,
  ): Promise<{importedCount: number}> {
    if (Platform.OS !== 'ios') {
      throw new Error('HealthKit is only available on iOS');
    }

    try {
      // Initialize HealthKit
      await this.initializeHealthKit();

      // Calculate the date one year ago from now
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Use the later of the two dates (one year ago or provided start date)
      const adjustedStartDate = new Date(
        Math.max(oneYearAgo.getTime(), startDate.getTime()),
      );

      // Get existing readings from the database
      const existingReadings = await this.databaseService.getAllReadings();

      // Create a map of existing HealthKit IDs for quick lookup
      const existingHealthKitIds = new Set(
        existingReadings
          .filter(r => r.healthKitId)
          .map(r => r.healthKitId as string),
      );

      // Get all readings from the adjusted start date to now in one query
      const options = {
        startDate: adjustedStartDate.toISOString(),
        endDate: endDate.toISOString(),
        unit: 'mg/dL',
      };

      const results = await new Promise<any[]>((resolve, reject) => {
        AppleHealthKit.getBloodGlucoseSamples(
          options,
          (error: string, samples: any[]) => {
            if (error) {
              reject(new Error(error));
            } else {
              resolve(samples);
            }
          },
        );
      });

      // Filter out readings that already exist based on HealthKit ID
      const newReadings = results.filter(sample => {
        return !existingHealthKitIds.has(sample.id);
      });

      // Sort readings by date to ensure chronological progress
      newReadings.sort((a, b) => {
        return (
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
      });

      let importedCount = 0;

      // Save new readings to the database
      for (const sample of newReadings) {
        const reading: Omit<BloodGlucose, 'id'> = {
          value: Math.round(sample.value * 18.0182), // Convert from mmol/L to mg/dL
          timestamp: new Date(sample.startDate),
          notes: sample.device || 'Apple Health',
          sourceName: 'Apple Health',
          unit: 'mg/dL',
          healthKitId: sample.id, // Store the HealthKit ID
        };

        await this.databaseService.addReading(reading);
        importedCount++;

        // Update progress
        if (onProgress) {
          onProgress({
            currentDate: new Date(sample.startDate),
            totalDays: newReadings.length,
            currentDay: importedCount,
          });
        }
      }

      return {importedCount};
    } catch (error) {
      console.error('Error importing blood glucose data:', error);
      throw error;
    }
  }

  async getOldestBloodGlucoseDate(): Promise<Date | null> {
    if (Platform.OS !== 'ios') {
      return null;
    }

    try {
      await this.initializeHealthKit();
      const options = {
        startDate: new Date(2000, 0, 1).toISOString(), // Start from year 2000
        endDate: new Date().toISOString(), // Current date as end date
        ascending: true, // Get the oldest date first
        limit: 1, // We only need the oldest one
      };

      return new Promise(resolve => {
        AppleHealthKit.getBloodGlucoseSamples(
          options,
          (error: string, results: any[]) => {
            if (error) {
              console.error('Error getting oldest blood glucose date:', error);
              resolve(null);
            } else if (results && results.length > 0) {
              console.log(
                'Found oldest blood glucose date:',
                results[0].startDate,
              );
              resolve(new Date(results[0].startDate));
            } else {
              // console.log('No blood glucose data found');
              resolve(null);
            }
          },
        );
      });
    } catch (error) {
      console.error('Error getting oldest blood glucose date:', error);
      return null;
    }
  }

  async syncWithHealthKit(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      // Initialize HealthKit
      await this.initializeHealthKit();

      // Get the last sync time from settings
      const lastSync = await this.settingsService.getLastSyncTime();
      const startDate = lastSync || new Date(2000, 0, 1); // Start from year 2000 if no last sync
      const endDate = new Date();

      // Import new readings in batches
      await this.importBloodGlucoseInBatches(startDate, endDate, progress => {
        console.log(
          `Importing HealthKit data: ${progress.currentDay}/${progress.totalDays}`,
        );
      });

      // Update the last sync time
      await this.settingsService.updateLastSyncTime();
    } catch (error) {
      console.error('Error syncing with HealthKit:', error);
      throw error;
    }
  }
}

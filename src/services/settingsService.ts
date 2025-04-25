import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BloodGlucoseRanges {
  low: number;
  high: number;
  customLow?: number;
  customHigh?: number;
  useCustomRanges: boolean;
}

const DEFAULT_RANGES: BloodGlucoseRanges = {
  low: 70,
  high: 180,
  useCustomRanges: false,
};

const STORAGE_KEY = '@blood_glucose_ranges';
const HEALTHKIT_ENABLED_KEY = '@healthkit_enabled';
const TIME_RANGE_KEY = '@time_range';
const LAST_SYNC_KEY = '@last_healthkit_sync';

export class SettingsService {
  private static instance: SettingsService;
  private ranges: BloodGlucoseRanges = DEFAULT_RANGES;
  private healthKitEnabled: boolean = false;
  private timeRange: number = 24; // Default to 24 hours
  private subscribers: ((ranges: BloodGlucoseRanges) => void)[] = [];

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private async loadSettings() {
    try {
      const storedRanges = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedRanges) {
        this.ranges = JSON.parse(storedRanges);
      }

      const storedHealthKitEnabled = await AsyncStorage.getItem(
        HEALTHKIT_ENABLED_KEY,
      );
      if (storedHealthKitEnabled !== null) {
        this.healthKitEnabled = JSON.parse(storedHealthKitEnabled);
      }

      const storedTimeRange = await AsyncStorage.getItem(TIME_RANGE_KEY);
      if (storedTimeRange) {
        this.timeRange = parseInt(storedTimeRange, 10);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async getRanges(): Promise<BloodGlucoseRanges> {
    const storedRanges = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedRanges) {
      return JSON.parse(storedRanges);
    }
    return DEFAULT_RANGES;
  }

  async updateRanges(newRanges: Partial<BloodGlucoseRanges>): Promise<void> {
    this.ranges = {
      ...this.ranges,
      ...newRanges,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.ranges));
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async setRanges(newRanges: BloodGlucoseRanges): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRanges));
      this.ranges = newRanges;
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving ranges:', error);
      throw error;
    }
  }

  async getHealthKitEnabled(): Promise<boolean> {
    return this.healthKitEnabled;
  }

  async setHealthKitEnabled(enabled: boolean): Promise<void> {
    this.healthKitEnabled = enabled;
    try {
      await AsyncStorage.setItem(
        HEALTHKIT_ENABLED_KEY,
        JSON.stringify(enabled),
      );
    } catch (error) {
      console.error('Error saving HealthKit enabled state:', error);
    }
  }

  getRangeForValue(value: number): 'low' | 'normal' | 'high' {
    const {low, high, customLow, customHigh, useCustomRanges} = this.ranges;
    const effectiveLow = useCustomRanges ? customLow || low : low;
    const effectiveHigh = useCustomRanges ? customHigh || high : high;

    if (value < effectiveLow) {
      return 'low';
    } else if (value > effectiveHigh) {
      return 'high';
    }
    return 'normal';
  }

  async setGoogleFitEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem('googleFitEnabled', enabled.toString());
  }

  async getGoogleFitEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem('googleFitEnabled');
    return enabled === 'true';
  }

  async getTimeRange(): Promise<number> {
    const storedTimeRange = await AsyncStorage.getItem(TIME_RANGE_KEY);
    if (storedTimeRange) {
      return parseInt(storedTimeRange, 10);
    }
    return 24; // Default to 24 hours
  }

  async updateTimeRange(newTimeRange: number): Promise<void> {
    this.timeRange = newTimeRange;
    try {
      await AsyncStorage.setItem(TIME_RANGE_KEY, newTimeRange.toString());
    } catch (error) {
      console.error('Error saving time range:', error);
      throw error;
    }
  }

  subscribe(callback: (ranges: BloodGlucoseRanges) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.ranges));
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  async shouldSyncWithHealthKit(): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    return lastSync < twelveHoursAgo;
  }
}

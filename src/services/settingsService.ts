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
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async setRanges(newRanges: BloodGlucoseRanges): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRanges));
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

  subscribeToRanges(callback: (ranges: BloodGlucoseRanges) => void): {
    remove: () => void;
  } {
    const subscription = {
      remove: () => {
        // Remove the subscription if needed
      },
    };

    // Add the callback to a list of subscribers
    this.subscribers.push(callback);

    return subscription;
  }

  private notifySubscribers(ranges: BloodGlucoseRanges) {
    this.subscribers.forEach(callback => callback(ranges));
  }
}

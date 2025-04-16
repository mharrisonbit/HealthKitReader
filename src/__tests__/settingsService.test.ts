import {SettingsService, BloodGlucoseRanges} from '../services/settingsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Settings Service', () => {
  const mockSettings: BloodGlucoseRanges = {
    low: 70,
    high: 180,
    useCustomRanges: false,
  };

  let settingsService: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    settingsService = SettingsService.getInstance();
  });

  describe('getRanges', () => {
    it('should return stored ranges from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockSettings),
      );
      const ranges = await settingsService.getRanges();
      expect(ranges).toEqual(mockSettings);
    });

    it('should return default ranges when no settings are stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const ranges = await settingsService.getRanges();
      expect(ranges).toEqual({
        low: 70,
        high: 180,
        useCustomRanges: false,
      });
    });
  });

  describe('setRanges', () => {
    it('should save ranges to AsyncStorage', async () => {
      await settingsService.setRanges(mockSettings);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@blood_glucose_ranges',
        JSON.stringify(mockSettings),
      );
    });

    it('should handle errors when saving ranges', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Save failed'),
      );
      await expect(settingsService.setRanges(mockSettings)).rejects.toThrow(
        'Save failed',
      );
    });
  });

  describe('updateRanges', () => {
    it('should update existing ranges and save to AsyncStorage', async () => {
      const existingRanges = {...mockSettings, low: 60};
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(existingRanges),
      );

      const update = {high: 200};
      await settingsService.updateRanges(update);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@blood_glucose_ranges',
        JSON.stringify({...existingRanges, ...update}),
      );
    });
  });

  describe('HealthKit settings', () => {
    it('should save HealthKit enabled state', async () => {
      await settingsService.setHealthKitEnabled(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@healthkit_enabled',
        JSON.stringify(true),
      );
    });

    it('should retrieve HealthKit enabled state', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(true),
      );
      const enabled = await settingsService.getHealthKitEnabled();
      expect(enabled).toBe(true);
    });
  });

  describe('getRangeForValue', () => {
    it('should return correct range for given value', () => {
      expect(settingsService.getRangeForValue(50)).toBe('low');
      expect(settingsService.getRangeForValue(100)).toBe('normal');
      expect(settingsService.getRangeForValue(200)).toBe('high');
    });
  });
});

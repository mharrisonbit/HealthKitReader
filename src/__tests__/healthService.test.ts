import {HealthService} from '../services/healthService';
import HealthKit from 'react-native-health';

// Mock HealthKit
jest.mock('react-native-health', () => ({
  isAvailable: jest.fn(),
  initHealthKit: jest.fn(),
  getBloodGlucoseSamples: jest.fn(),
  getOldestBloodGlucoseDate: jest.fn(),
}));

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    healthService = HealthService.getInstance();
  });

  it('should check HealthKit availability', async () => {
    (HealthKit.isAvailable as jest.Mock).mockResolvedValueOnce(true);
    const isAvailable = await healthService.isAvailable();
    expect(isAvailable).toBe(true);
  });

  it('should request authorization', async () => {
    (HealthKit.initHealthKit as jest.Mock).mockResolvedValueOnce(true);
    const authorized = await healthService.requestAuthorization();
    expect(authorized).toBe(true);
  });

  it('should get blood glucose samples', async () => {
    const mockSamples = [
      {
        value: 120,
        startDate: new Date('2024-03-20T10:00:00'),
        sourceName: 'Health App',
      },
    ];

    (HealthKit.getBloodGlucoseSamples as jest.Mock).mockResolvedValueOnce(
      mockSamples,
    );
    const samples = await healthService.getBloodGlucoseSamples(
      new Date('2024-03-20T00:00:00'),
      new Date('2024-03-20T23:59:59'),
    );

    expect(samples).toEqual(mockSamples);
  });

  it('should get oldest blood glucose date', async () => {
    const mockDate = new Date('2024-01-01T00:00:00');
    (HealthKit.getOldestBloodGlucoseDate as jest.Mock).mockResolvedValueOnce(
      mockDate,
    );
    const date = await healthService.getOldestBloodGlucoseDate();
    expect(date).toEqual(mockDate);
  });

  it('should handle HealthKit errors gracefully', async () => {
    (HealthKit.isAvailable as jest.Mock).mockRejectedValueOnce(
      new Error('HealthKit error'),
    );
    await expect(healthService.isAvailable()).rejects.toThrow(
      'HealthKit error',
    );
  });

  it('should maintain singleton instance', () => {
    const instance1 = HealthService.getInstance();
    const instance2 = HealthService.getInstance();
    expect(instance1).toBe(instance2);
  });
});

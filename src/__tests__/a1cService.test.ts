import {A1CService} from '../services/a1cService';
import {DatabaseService} from '../services/database';

// Mock DatabaseService
jest.mock('../services/database');

describe('A1CService', () => {
  let a1cService: A1CService;
  const mockReadings = [
    {
      id: '1',
      value: 120,
      timestamp: new Date('2024-03-20T10:00:00').toISOString(),
      notes: 'Test reading 1',
    },
    {
      id: '2',
      value: 150,
      timestamp: new Date('2024-03-20T12:00:00').toISOString(),
      notes: 'Test reading 2',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    a1cService = A1CService.getInstance();

    // Mock DatabaseService
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockResolvedValue(mockReadings),
    });
  });

  it('should calculate A1C correctly', async () => {
    const a1c = await a1cService.calculateA1C('3months');
    expect(a1c).toBeDefined();
    expect(typeof a1c).toBe('number');
    expect(a1c).toBeGreaterThan(0);
  });

  it('should handle different time frames', async () => {
    const timeFrames = [
      '24hours',
      '7days',
      '30days',
      '3months',
      '6months',
      '12months',
    ];

    for (const timeFrame of timeFrames) {
      const a1c = await a1cService.calculateA1C(timeFrame);
      expect(a1c).toBeDefined();
      expect(typeof a1c).toBe('number');
    }
  });

  it('should handle empty readings', async () => {
    // Mock empty readings
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockResolvedValue([]),
    });

    const a1c = await a1cService.calculateA1C('3months');
    expect(a1c).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    await expect(a1cService.calculateA1C('3months')).rejects.toThrow(
      'Database error',
    );
  });

  it('should maintain singleton instance', () => {
    const instance1 = A1CService.getInstance();
    const instance2 = A1CService.getInstance();
    expect(instance1).toBe(instance2);
  });
});

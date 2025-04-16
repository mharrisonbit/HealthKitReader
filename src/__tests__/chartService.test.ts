import {ChartService} from '../services/chartService';
import {DatabaseService} from '../services/database';

// Mock DatabaseService
jest.mock('../services/database');

describe('ChartService', () => {
  let chartService: ChartService;
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
    chartService = ChartService.getInstance();

    // Mock DatabaseService
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockResolvedValue(mockReadings),
    });
  });

  it('should generate chart data correctly', async () => {
    const chartData = await chartService.getChartData('24hours');
    expect(chartData).toBeDefined();
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets).toBeDefined();
    expect(chartData.average).toBeDefined();
  });

  it('should handle different time periods', async () => {
    const timePeriods = ['24hours', '7days', '30days'];

    for (const period of timePeriods) {
      const chartData = await chartService.getChartData(period);
      expect(chartData).toBeDefined();
      expect(chartData.labels.length).toBeGreaterThan(0);
      expect(chartData.datasets[0].data.length).toBeGreaterThan(0);
    }
  });

  it('should calculate average correctly', async () => {
    const chartData = await chartService.getChartData('24hours');
    const average = chartData.average;

    expect(average).toBeDefined();
    expect(typeof average).toBe('number');
    expect(average).toBeGreaterThan(0);
  });

  it('should handle empty readings', async () => {
    // Mock empty readings
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockResolvedValue([]),
    });

    const chartData = await chartService.getChartData('24hours');
    expect(chartData.labels).toHaveLength(0);
    expect(chartData.datasets[0].data).toHaveLength(0);
    expect(chartData.average).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    await expect(chartService.getChartData('24hours')).rejects.toThrow(
      'Database error',
    );
  });

  it('should maintain singleton instance', () => {
    const instance1 = ChartService.getInstance();
    const instance2 = ChartService.getInstance();
    expect(instance1).toBe(instance2);
  });
});

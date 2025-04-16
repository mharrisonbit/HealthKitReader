import {
  BloodGlucose,
  BloodGlucoseRanges,
  TimeFrame,
  ChartData,
  NotificationChannel,
} from '../types';

describe('BloodGlucose type', () => {
  it('has required properties', () => {
    const reading: BloodGlucose = {
      id: '1',
      value: 120,
      timestamp: new Date().toISOString(),
      notes: 'Test reading',
      unit: 'mg/dL',
      sourceName: 'Manual Entry',
    };

    expect(reading).toHaveProperty('id');
    expect(reading).toHaveProperty('value');
    expect(reading).toHaveProperty('timestamp');
    expect(reading).toHaveProperty('notes');
    expect(reading).toHaveProperty('unit');
    expect(reading).toHaveProperty('sourceName');
  });

  it('allows optional notes', () => {
    const reading: BloodGlucose = {
      id: '1',
      value: 120,
      timestamp: new Date().toISOString(),
      unit: 'mg/dL',
      sourceName: 'Manual Entry',
    };

    expect(reading).toBeDefined();
  });
});

describe('BloodGlucoseRanges type', () => {
  it('has required properties', () => {
    const ranges: BloodGlucoseRanges = {
      low: 70,
      high: 180,
      useCustomRanges: false,
    };

    expect(ranges).toHaveProperty('low');
    expect(ranges).toHaveProperty('high');
    expect(ranges).toHaveProperty('useCustomRanges');
  });
});

describe('TimeFrame type', () => {
  it('accepts valid time frames', () => {
    const timeFrames: TimeFrame[] = [
      '24hours',
      '7days',
      '30days',
      '3months',
      '6months',
      '12months',
    ];

    timeFrames.forEach(timeFrame => {
      expect(timeFrame).toBeDefined();
    });
  });
});

describe('ChartData type', () => {
  it('has required properties', () => {
    const chartData: ChartData = {
      labels: ['10:00 AM', '12:00 PM'],
      datasets: [
        {
          data: [120, 150],
        },
      ],
      average: 135,
    };

    expect(chartData).toHaveProperty('labels');
    expect(chartData).toHaveProperty('datasets');
    expect(chartData).toHaveProperty('average');
  });
});

describe('NotificationChannel type', () => {
  it('has required properties', () => {
    const channel: NotificationChannel = {
      id: 'reminder-channel',
      name: 'Reminders',
      description: 'Blood glucose reminder notifications',
    };

    expect(channel).toHaveProperty('id');
    expect(channel).toHaveProperty('name');
    expect(channel).toHaveProperty('description');
  });
});

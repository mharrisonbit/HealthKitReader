import {
  formatDate,
  formatTime,
  calculateA1C,
  getRangeForValue,
  getTimeFrameCutoff,
} from '../utils';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-03-20T10:30:00');
    expect(formatDate(date)).toBe('Mar 20, 2024');
  });

  it('handles different dates', () => {
    const dates = [
      new Date('2024-01-01T00:00:00'),
      new Date('2024-12-31T23:59:59'),
      new Date('2024-06-15T12:00:00'),
    ];

    dates.forEach(date => {
      expect(formatDate(date)).toMatch(/^[A-Za-z]{3} \d{1,2}, 2024$/);
    });
  });
});

describe('formatTime', () => {
  it('formats time correctly', () => {
    const date = new Date('2024-03-20T10:30:00');
    expect(formatTime(date)).toBe('10:30 AM');
  });

  it('handles different times', () => {
    const times = [
      new Date('2024-03-20T00:00:00'),
      new Date('2024-03-20T12:00:00'),
      new Date('2024-03-20T23:59:59'),
    ];

    times.forEach(time => {
      expect(formatTime(time)).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });
  });
});

describe('calculateA1C', () => {
  it('calculates A1C correctly', () => {
    const readings = [
      {value: 120, timestamp: new Date()},
      {value: 150, timestamp: new Date()},
      {value: 130, timestamp: new Date()},
    ];

    const a1c = calculateA1C(readings);
    expect(a1c).toBeDefined();
    expect(typeof a1c).toBe('number');
    expect(a1c).toBeGreaterThan(0);
  });

  it('handles empty readings', () => {
    const a1c = calculateA1C([]);
    expect(a1c).toBe(0);
  });

  it('handles single reading', () => {
    const readings = [{value: 120, timestamp: new Date()}];
    const a1c = calculateA1C(readings);
    expect(a1c).toBeDefined();
    expect(typeof a1c).toBe('number');
  });
});

describe('getRangeForValue', () => {
  const ranges = {
    low: 70,
    high: 180,
    useCustomRanges: false,
  };

  it('classifies values correctly', () => {
    expect(getRangeForValue(50, ranges)).toBe('low');
    expect(getRangeForValue(100, ranges)).toBe('normal');
    expect(getRangeForValue(200, ranges)).toBe('high');
  });

  it('handles boundary values', () => {
    expect(getRangeForValue(70, ranges)).toBe('normal');
    expect(getRangeForValue(180, ranges)).toBe('high');
  });

  it('handles custom ranges', () => {
    const customRanges = {
      low: 60,
      high: 200,
      useCustomRanges: true,
    };

    expect(getRangeForValue(50, customRanges)).toBe('low');
    expect(getRangeForValue(150, customRanges)).toBe('normal');
    expect(getRangeForValue(250, customRanges)).toBe('high');
  });
});

describe('getTimeFrameCutoff', () => {
  it('calculates cutoff for 24 hours', () => {
    const now = new Date('2024-03-20T12:00:00');
    const cutoff = getTimeFrameCutoff('24hours', now);
    expect(cutoff).toEqual(new Date('2024-03-19T12:00:00'));
  });

  it('calculates cutoff for 7 days', () => {
    const now = new Date('2024-03-20T12:00:00');
    const cutoff = getTimeFrameCutoff('7days', now);
    expect(cutoff).toEqual(new Date('2024-03-13T12:00:00'));
  });

  it('calculates cutoff for 30 days', () => {
    const now = new Date('2024-03-20T12:00:00');
    const cutoff = getTimeFrameCutoff('30days', now);
    expect(cutoff).toEqual(new Date('2024-02-19T12:00:00'));
  });

  it('calculates cutoff for 3 months', () => {
    const now = new Date('2024-03-20T12:00:00');
    const cutoff = getTimeFrameCutoff('3months', now);
    expect(cutoff).toEqual(new Date('2023-12-20T12:00:00'));
  });

  it('calculates cutoff for 6 months', () => {
    const now = new Date('2024-03-20T12:00:00');
    const cutoff = getTimeFrameCutoff('6months', now);
    expect(cutoff).toEqual(new Date('2023-09-20T12:00:00'));
  });

  it('calculates cutoff for 12 months', () => {
    const now = new Date('2024-03-20T12:00:00');
    const cutoff = getTimeFrameCutoff('12months', now);
    expect(cutoff).toEqual(new Date('2023-03-20T12:00:00'));
  });
});

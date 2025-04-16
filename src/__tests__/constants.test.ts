import {
  DEFAULT_RANGES,
  TIME_FRAMES,
  CHART_CONFIG,
  NOTIFICATION_CHANNEL,
  COLORS,
} from '../constants';

describe('DEFAULT_RANGES', () => {
  it('has correct default values', () => {
    expect(DEFAULT_RANGES.low).toBe(70);
    expect(DEFAULT_RANGES.high).toBe(180);
    expect(DEFAULT_RANGES.useCustomRanges).toBe(false);
  });
});

describe('TIME_FRAMES', () => {
  it('has all required time frames', () => {
    const expectedTimeFrames = [
      '24hours',
      '7days',
      '30days',
      '3months',
      '6months',
      '12months',
    ];

    expect(Object.keys(TIME_FRAMES)).toEqual(expectedTimeFrames);
  });

  it('has correct labels for each time frame', () => {
    expect(TIME_FRAMES['24hours']).toBe('24 Hours');
    expect(TIME_FRAMES['7days']).toBe('7 Days');
    expect(TIME_FRAMES['30days']).toBe('30 Days');
    expect(TIME_FRAMES['3months']).toBe('3 Months');
    expect(TIME_FRAMES['6months']).toBe('6 Months');
    expect(TIME_FRAMES['12months']).toBe('12 Months');
  });
});

describe('CHART_CONFIG', () => {
  it('has required configuration properties', () => {
    expect(CHART_CONFIG).toHaveProperty('backgroundColor');
    expect(CHART_CONFIG).toHaveProperty('backgroundGradientFrom');
    expect(CHART_CONFIG).toHaveProperty('backgroundGradientTo');
    expect(CHART_CONFIG).toHaveProperty('decimalPlaces');
    expect(CHART_CONFIG).toHaveProperty('color');
    expect(CHART_CONFIG).toHaveProperty('style');
  });

  it('has correct color values', () => {
    expect(CHART_CONFIG.backgroundColor).toBe('#ffffff');
    expect(CHART_CONFIG.backgroundGradientFrom).toBe('#ffffff');
    expect(CHART_CONFIG.backgroundGradientTo).toBe('#ffffff');
    expect(CHART_CONFIG.color).toBeInstanceOf(Function);
  });
});

describe('NOTIFICATION_CHANNEL', () => {
  it('has required channel properties', () => {
    expect(NOTIFICATION_CHANNEL.id).toBe('reminder-channel');
    expect(NOTIFICATION_CHANNEL.name).toBe('Reminders');
    expect(NOTIFICATION_CHANNEL.description).toBe(
      'Blood glucose reminder notifications',
    );
  });
});

describe('COLORS', () => {
  it('has all required color values', () => {
    expect(COLORS).toHaveProperty('primary');
    expect(COLORS).toHaveProperty('secondary');
    expect(COLORS).toHaveProperty('background');
    expect(COLORS).toHaveProperty('text');
    expect(COLORS).toHaveProperty('error');
    expect(COLORS).toHaveProperty('success');
    expect(COLORS).toHaveProperty('warning');
    expect(COLORS).toHaveProperty('low');
    expect(COLORS).toHaveProperty('normal');
    expect(COLORS).toHaveProperty('high');
  });

  it('has valid hex color values', () => {
    Object.values(COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

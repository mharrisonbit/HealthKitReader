import {theme} from '../theme';

describe('theme', () => {
  it('has required properties', () => {
    expect(theme).toHaveProperty('colors');
    expect(theme).toHaveProperty('spacing');
    expect(theme).toHaveProperty('typography');
    expect(theme).toHaveProperty('shadows');
    expect(theme).toHaveProperty('borderRadius');
  });

  describe('colors', () => {
    it('has all required color values', () => {
      expect(theme.colors).toHaveProperty('primary');
      expect(theme.colors).toHaveProperty('secondary');
      expect(theme.colors).toHaveProperty('background');
      expect(theme.colors).toHaveProperty('text');
      expect(theme.colors).toHaveProperty('error');
      expect(theme.colors).toHaveProperty('success');
      expect(theme.colors).toHaveProperty('warning');
      expect(theme.colors).toHaveProperty('low');
      expect(theme.colors).toHaveProperty('normal');
      expect(theme.colors).toHaveProperty('high');
    });

    it('has valid hex color values', () => {
      Object.values(theme.colors).forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('spacing', () => {
    it('has all required spacing values', () => {
      expect(theme.spacing).toHaveProperty('xs');
      expect(theme.spacing).toHaveProperty('sm');
      expect(theme.spacing).toHaveProperty('md');
      expect(theme.spacing).toHaveProperty('lg');
      expect(theme.spacing).toHaveProperty('xl');
    });

    it('has valid spacing values', () => {
      Object.values(theme.spacing).forEach(spacing => {
        expect(typeof spacing).toBe('number');
        expect(spacing).toBeGreaterThan(0);
      });
    });
  });

  describe('typography', () => {
    it('has all required typography properties', () => {
      expect(theme.typography).toHaveProperty('fontFamily');
      expect(theme.typography).toHaveProperty('fontSizes');
      expect(theme.typography).toHaveProperty('fontWeights');
      expect(theme.typography).toHaveProperty('lineHeights');
    });

    it('has valid font sizes', () => {
      Object.values(theme.typography.fontSizes).forEach(size => {
        expect(typeof size).toBe('number');
        expect(size).toBeGreaterThan(0);
      });
    });

    it('has valid font weights', () => {
      Object.values(theme.typography.fontWeights).forEach(weight => {
        expect(typeof weight).toBe('string');
        expect([
          'normal',
          'bold',
          '100',
          '200',
          '300',
          '400',
          '500',
          '600',
          '700',
          '800',
          '900',
        ]).toContain(weight);
      });
    });

    it('has valid line heights', () => {
      Object.values(theme.typography.lineHeights).forEach(height => {
        expect(typeof height).toBe('number');
        expect(height).toBeGreaterThan(0);
      });
    });
  });

  describe('shadows', () => {
    it('has all required shadow properties', () => {
      expect(theme.shadows).toHaveProperty('sm');
      expect(theme.shadows).toHaveProperty('md');
      expect(theme.shadows).toHaveProperty('lg');
    });

    it('has valid shadow values', () => {
      Object.values(theme.shadows).forEach(shadow => {
        expect(typeof shadow).toBe('object');
        expect(shadow).toHaveProperty('shadowColor');
        expect(shadow).toHaveProperty('shadowOffset');
        expect(shadow).toHaveProperty('shadowOpacity');
        expect(shadow).toHaveProperty('shadowRadius');
        expect(shadow).toHaveProperty('elevation');
      });
    });
  });

  describe('borderRadius', () => {
    it('has all required border radius values', () => {
      expect(theme.borderRadius).toHaveProperty('sm');
      expect(theme.borderRadius).toHaveProperty('md');
      expect(theme.borderRadius).toHaveProperty('lg');
      expect(theme.borderRadius).toHaveProperty('xl');
    });

    it('has valid border radius values', () => {
      Object.values(theme.borderRadius).forEach(radius => {
        expect(typeof radius).toBe('number');
        expect(radius).toBeGreaterThan(0);
      });
    });
  });
});

import {BloodGlucose} from '../types/BloodGlucose';

export const calculateA1C = (readings: BloodGlucose[]): string | null => {
  if (readings.length === 0) return null;

  // Calculate average blood glucose over the selected time period
  const averageGlucose =
    readings.reduce((sum, reading) => sum + reading.value, 0) / readings.length;

  // Convert average glucose to A1C using the formula: A1C = (average glucose + 46.7) / 28.7
  const a1c = (averageGlucose + 46.7) / 28.7;

  return a1c.toFixed(1);
};

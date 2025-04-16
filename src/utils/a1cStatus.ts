export const getA1CStatus = (a1c: string | null): string => {
  if (a1c === null) return 'N/A';

  const a1cNum = parseFloat(a1c);
  if (a1cNum >= 9.0) return 'Extremely High';
  if (a1cNum >= 6.5) return 'Diabetic';
  if (a1cNum >= 5.7) return 'Pre-Diabetic';
  return 'Normal';
};

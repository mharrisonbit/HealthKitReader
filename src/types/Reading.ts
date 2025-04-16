export interface Reading {
  id: string;
  timestamp: Date;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  sourceName: string;
  notes?: string;
}

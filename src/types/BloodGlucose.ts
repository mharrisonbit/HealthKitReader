export interface BloodGlucose {
  id: string;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: Date;
  notes?: string;
}

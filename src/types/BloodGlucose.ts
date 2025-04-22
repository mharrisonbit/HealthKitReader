export interface BloodGlucose {
  id: string;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: Date;
  sourceName: string;
  notes?: string;
  healthKitId?: string;
}

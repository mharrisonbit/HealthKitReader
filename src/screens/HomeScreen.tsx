import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {subDays, subMonths} from 'date-fns';
import {TimeRangeSelector} from '../components/TimeRangeSelector';

const databaseService = new DatabaseService();

const A1C_TIME_RANGES = [
  {label: '1 Week', value: '7'},
  {label: '2 Weeks', value: '14'},
  {label: '1 Month', value: '30'},
  {label: '2 Months', value: '60'},
  {label: '3 Months', value: '90'},
  {label: '6 Months', value: '180'},
  {label: '1 Year', value: '365'},
];

export const HomeScreen: React.FC = () => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [_isEditing, _setIsEditing] = useState(false);
  const [_editingReading, _setEditingReading] = useState<BloodGlucose | null>(
    null,
  );
  const [_isImporting, _setIsImporting] = useState(false);
  const [a1cValue, setA1cValue] = useState<number | null>(null);
  const [a1cStatus, setA1cStatus] = useState<string>('N/A');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(90); // Default to 3 months

  const calculateA1c = useCallback(
    (readings: BloodGlucose[]): number | null => {
      if (readings.length === 0) return null;

      // Filter readings based on selected time range
      const now = new Date();
      const cutoffDate =
        selectedTimeRange <= 31
          ? subDays(now, selectedTimeRange)
          : subMonths(now, Math.ceil(selectedTimeRange / 30));

      const filteredReadings = readings.filter(
        reading => new Date(reading.timestamp) >= cutoffDate,
      );

      if (filteredReadings.length === 0) return null;

      const totalGlucose = filteredReadings.reduce(
        (sum, reading) => sum + reading.value,
        0,
      );
      const averageGlucose = totalGlucose / filteredReadings.length;

      // Convert average glucose to A1c using the formula: A1c = (average glucose + 46.7) / 28.7
      const a1c = (averageGlucose + 46.7) / 28.7;
      return Number(a1c.toFixed(1));
    },
    [selectedTimeRange],
  );

  const calculateAverageGlucose = useCallback(
    (readings: BloodGlucose[]): number | null => {
      if (readings.length === 0) return null;

      // Filter readings based on selected time range
      const now = new Date();
      const cutoffDate =
        selectedTimeRange <= 31
          ? subDays(now, selectedTimeRange)
          : subMonths(now, Math.ceil(selectedTimeRange / 30));

      const filteredReadings = readings.filter(
        reading => new Date(reading.timestamp) >= cutoffDate,
      );

      if (filteredReadings.length === 0) return null;

      const totalGlucose = filteredReadings.reduce(
        (sum, reading) => sum + reading.value,
        0,
      );
      return Number((totalGlucose / filteredReadings.length).toFixed(1));
    },
    [selectedTimeRange],
  );

  const calculateMetrics = useCallback(
    (readings: BloodGlucose[]) => {
      const newA1c = calculateA1c(readings);
      setA1cValue(newA1c);
      const a1cString = newA1c !== null ? newA1c.toString() : null;
      setA1cStatus(getA1CStatus(a1cString));
    },
    [calculateA1c],
  );

  const loadReadings = useCallback(async () => {
    try {
      setIsLoading(true);
      const allReadings = await databaseService.getAllReadings();
      setReadings(allReadings);
      calculateMetrics(allReadings);
    } catch (error) {
      console.error('Error loading readings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateMetrics]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const handleTimeRangeChange = useCallback(
    async (value: string) => {
      setIsCalculating(true);
      setSelectedTimeRange(parseInt(value, 10));
      calculateMetrics(readings);
      setIsCalculating(false);
    },
    [readings, calculateMetrics],
  );

  const getA1CStatus = (a1c: string | null): string => {
    if (a1c === null) return 'N/A';

    const a1cNum = parseFloat(a1c);
    if (a1cNum >= 9.0) return 'Extremely High';
    if (a1cNum >= 6.5) return 'Diabetic';
    if (a1cNum >= 5.7) return 'Pre-Diabetic';
    return 'Normal';
  };

  const getA1CColor = (a1c: string | null): string => {
    if (a1c === null) return '#666666'; // Gray for N/A

    const a1cNum = parseFloat(a1c);
    if (a1cNum >= 9.0) return '#8B0000'; // Dark red for extremely high
    if (a1cNum >= 6.5) return '#FF0000'; // Red for diabetic
    if (a1cNum >= 5.7) return '#FFA500'; // Orange for pre-diabetic
    return '#4CAF50'; // Green for normal
  };

  const handleImport = async () => {
    try {
      _setIsImporting(true);
      await loadReadings();
      Alert.alert('Success', 'Readings imported successfully');
    } catch (error) {
      console.error('Error importing readings:', error);
      Alert.alert('Error', 'Failed to import readings');
    } finally {
      _setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.a1cContainer}>
        <Text style={styles.a1cLabel}>Estimated A1C</Text>
        <TimeRangeSelector
          options={A1C_TIME_RANGES}
          selectedValue={selectedTimeRange}
          onSelect={handleTimeRangeChange}
          style={styles.timeRangeSelector}
        />
        {isCalculating ? (
          <View style={styles.calculationContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : (
          <>
            <Text
              style={[
                styles.a1cValue,
                {color: getA1CColor(a1cValue?.toString() ?? null)},
              ]}>
              {a1cValue !== null ? `${a1cValue}%` : 'N/A'}
            </Text>
            <Text style={styles.a1cStatus}>{a1cStatus}</Text>
          </>
        )}
      </View>

      <View style={styles.averageGlucoseContainer}>
        <Text style={styles.averageGlucoseLabel}>Average Glucose</Text>
        {isCalculating ? (
          <View style={styles.calculationContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : (
          <Text style={styles.averageGlucoseValue}>
            {calculateAverageGlucose(readings) !== null
              ? `${calculateAverageGlucose(readings)} mg/dL`
              : 'N/A'}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.importButton}
        onPress={handleImport}
        disabled={_isImporting}>
        {_isImporting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.importButtonText}>Import from Health</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  a1cContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  a1cLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  a1cValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  a1cStatus: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeSelector: {
    marginBottom: 16,
  },
  averageGlucoseContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  averageGlucoseLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  averageGlucoseValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  importButton: {
    backgroundColor: '#5856D6',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calculationContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

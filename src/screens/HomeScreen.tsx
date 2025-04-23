import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {SettingsService} from '../services/settingsService';
import {subDays, subMonths} from 'date-fns';

const databaseService = DatabaseService.getInstance();
const settingsService = SettingsService.getInstance();

const TIME_RANGES = [
  {label: '1W', value: 7},
  {label: '2W', value: 14},
  {label: '1M', value: 30},
  {label: '3M', value: 90},
  {label: '6M', value: 180},
  {label: '1Y', value: 365},
];

export const HomeScreen: React.FC = () => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [a1cValue, setA1cValue] = useState<number | null>(null);
  const [a1cStatus, setA1cStatus] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(90); // Default to 3 months
  const [_ranges, _setRanges] = useState({low: 70, high: 180});

  const calculateA1c = useCallback(
    (readings: BloodGlucose[]): number | null => {
      if (readings.length === 0) return null;

      console.log('Calculating A1C for readings count:', readings.length);
      console.log(
        'Sample of readings:',
        readings.slice(0, 3).map(r => ({
          value: r.value,
          timestamp: new Date(r.timestamp),
        })),
      );

      const totalGlucose = readings.reduce(
        (sum, reading) => sum + reading.value,
        0,
      );
      const averageGlucose = totalGlucose / readings.length;
      console.log('Average glucose:', averageGlucose);

      // Convert average glucose to A1c using the formula: A1c = (average glucose + 46.7) / 28.7
      const a1c = (averageGlucose + 46.7) / 28.7;
      const roundedA1c = Number(a1c.toFixed(1));
      console.log('Calculated A1C:', roundedA1c);
      return roundedA1c;
    },
    [],
  );

  const calculateAverageGlucose = useCallback(
    (readings: BloodGlucose[]): number | null => {
      if (readings.length === 0) return null;

      console.log(
        'Calculating average glucose for readings count:',
        readings.length,
      );
      console.log(
        'Sample of readings:',
        readings.slice(0, 3).map(r => ({
          value: r.value,
          timestamp: new Date(r.timestamp),
        })),
      );

      const totalGlucose = readings.reduce(
        (sum, reading) => sum + reading.value,
        0,
      );
      const average = totalGlucose / readings.length;
      console.log('Average glucose:', average);
      return Number(average.toFixed(1));
    },
    [],
  );

  const calculateMetrics = useCallback(
    (readings: BloodGlucose[]) => {
      try {
        console.log('Calculating metrics for readings count:', readings.length);
        const newA1c = calculateA1c(readings);
        console.log('New A1C value:', newA1c);
        setA1cValue(newA1c);
        const a1cString = newA1c !== null ? newA1c.toString() : null;
        setA1cStatus(getA1CStatus(a1cString));
      } catch (error) {
        console.error('Error calculating metrics:', error);
        setA1cValue(null);
        setA1cStatus(null);
      }
    },
    [calculateA1c],
  );

  const loadReadings = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startDate =
        selectedTimeRange <= 31
          ? subDays(now, selectedTimeRange)
          : subMonths(now, Math.ceil(selectedTimeRange / 30));

      console.log('Loading readings from:', startDate, 'to:', now);
      const filteredReadings = await databaseService.getReadingsByDateRange(
        startDate,
        now,
      );
      console.log('Loaded readings count:', filteredReadings.length);
      setReadings(filteredReadings);
      calculateMetrics(filteredReadings);
    } catch (error) {
      console.error('Error loading readings:', error);
      Alert.alert('Error', 'Failed to load readings');
    } finally {
      setIsLoading(false);
    }
  }, [calculateMetrics, selectedTimeRange]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Add new useEffect to recalculate metrics when time range changes
  useEffect(() => {
    console.log('Time range changed to:', selectedTimeRange);
    if (readings.length > 0) {
      console.log('Recalculating metrics for time range change');
      calculateMetrics(readings);
    } else {
      console.log('No readings available for recalculation');
    }
  }, [selectedTimeRange, readings, calculateMetrics]);

  useEffect(() => {
    const loadRanges = async () => {
      try {
        const savedRanges = await settingsService.getRanges();
        _setRanges({
          low: savedRanges.useCustomRanges
            ? savedRanges.customLow ?? savedRanges.low
            : savedRanges.low,
          high: savedRanges.useCustomRanges
            ? savedRanges.customHigh ?? savedRanges.high
            : savedRanges.high,
        });
      } catch (error) {
        console.error('Error loading ranges:', error);
      }
    };
    loadRanges();
  }, []);

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blood Glucose Tracker</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.timeRangeContainer}>
          {TIME_RANGES.map(range => (
            <TouchableOpacity
              key={range.value}
              style={[
                styles.timeRangeButton,
                selectedTimeRange === range.value &&
                  styles.timeRangeButtonActive,
              ]}
              onPress={() => {
                console.log('Time range button pressed:', range.value);
                setSelectedTimeRange(range.value);
              }}>
              <Text
                style={[
                  styles.timeRangeButtonText,
                  selectedTimeRange === range.value &&
                    styles.timeRangeButtonTextActive,
                ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>
              {readings.length > 0
                ? `${readings[0].value} mg/dL`
                : 'No readings'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {calculateAverageGlucose(readings) !== null
                ? `${calculateAverageGlucose(readings)} mg/dL`
                : 'No readings'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Estimated A1C</Text>
            <Text style={styles.statValue}>
              {a1cValue ? `${a1cValue.toFixed(1)}%` : 'No readings'}
            </Text>
            {a1cStatus && (
              <Text style={[styles.a1cStatus, {color: getA1CColor(a1cStatus)}]}>
                {a1cStatus}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#5856D6',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeRangeButtonActive: {
    backgroundColor: '#5856D6',
    borderColor: '#5856D6',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  a1cStatus: {
    fontSize: 14,
    marginTop: 4,
  },
});

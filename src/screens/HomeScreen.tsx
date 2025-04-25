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
  const [ranges, setRanges] = useState({low: 70, high: 180});
  const [inRangePercentage, setInRangePercentage] = useState<number | null>(
    null,
  );
  const [highPercentage, setHighPercentage] = useState<number | null>(null);
  const [lowPercentage, setLowPercentage] = useState<number | null>(null);

  const calculateA1c = useCallback(
    (readings: BloodGlucose[]): number | null => {
      if (readings.length === 0) return null;

      // Filter readings by selected time range
      const now = new Date();
      const startDate =
        selectedTimeRange <= 31
          ? subDays(now, selectedTimeRange)
          : subMonths(now, Math.ceil(selectedTimeRange / 30));

      const filteredReadings = readings.filter(
        reading => new Date(reading.timestamp) >= startDate,
      );

      if (filteredReadings.length === 0) return null;

      console.log(
        'Calculating A1C for readings count:',
        filteredReadings.length,
      );
      console.log(
        'Sample of readings:',
        filteredReadings.slice(0, 3).map(r => ({
          value: r.value,
          timestamp: new Date(r.timestamp),
        })),
      );

      const totalGlucose = filteredReadings.reduce(
        (sum, reading) => sum + reading.value,
        0,
      );
      const averageGlucose = totalGlucose / filteredReadings.length;
      console.log('Average glucose:', averageGlucose);

      // Convert average glucose to A1c using the formula: A1c = (average glucose + 46.7) / 28.7
      const a1c = (averageGlucose + 46.7) / 28.7;
      const roundedA1c = Number(a1c.toFixed(1));
      console.log('Calculated A1C:', roundedA1c);
      return roundedA1c;
    },
    [selectedTimeRange],
  );

  const calculateAverageGlucose = useCallback(
    (readings: BloodGlucose[]): number | null => {
      if (readings.length === 0) return null;

      // Filter readings by selected time range
      const now = new Date();
      const startDate =
        selectedTimeRange <= 31
          ? subDays(now, selectedTimeRange)
          : subMonths(now, Math.ceil(selectedTimeRange / 30));

      const filteredReadings = readings.filter(
        reading => new Date(reading.timestamp) >= startDate,
      );

      if (filteredReadings.length === 0) return null;

      console.log(
        'Calculating average glucose for readings count:',
        filteredReadings.length,
      );
      console.log(
        'Sample of readings:',
        filteredReadings.slice(0, 3).map(r => ({
          value: r.value,
          timestamp: new Date(r.timestamp),
        })),
      );

      const totalGlucose = filteredReadings.reduce(
        (sum, reading) => sum + reading.value,
        0,
      );
      const average = totalGlucose / filteredReadings.length;
      console.log('Average glucose:', average);
      return Number(average.toFixed(1));
    },
    [selectedTimeRange],
  );

  const calculateMetrics = useCallback(
    (readings: BloodGlucose[]) => {
      try {
        // Filter readings by selected time range
        const now = new Date();
        const startDate =
          selectedTimeRange <= 31
            ? subDays(now, selectedTimeRange)
            : subMonths(now, Math.ceil(selectedTimeRange / 30));

        const filteredReadings = readings.filter(
          reading => new Date(reading.timestamp) >= startDate,
        );

        console.log(
          'Calculating metrics for readings count:',
          filteredReadings.length,
        );
        const newA1c = calculateA1c(filteredReadings);
        console.log('New A1C value:', newA1c);
        setA1cValue(newA1c);
        const a1cString = newA1c !== null ? newA1c.toString() : null;
        setA1cStatus(getA1CStatus(a1cString));

        // Calculate percentages
        if (filteredReadings.length > 0) {
          const inRangeCount = filteredReadings.filter(
            reading =>
              reading.value >= ranges.low && reading.value <= ranges.high,
          ).length;
          const highCount = filteredReadings.filter(
            reading => reading.value > ranges.high,
          ).length;
          const lowCount = filteredReadings.filter(
            reading => reading.value < ranges.low,
          ).length;

          const inRangePercentage =
            (inRangeCount / filteredReadings.length) * 100;
          const highPercentage = (highCount / filteredReadings.length) * 100;
          const lowPercentage = (lowCount / filteredReadings.length) * 100;

          setInRangePercentage(inRangePercentage);
          setHighPercentage(highPercentage);
          setLowPercentage(lowPercentage);
        } else {
          setInRangePercentage(null);
          setHighPercentage(null);
          setLowPercentage(null);
        }
      } catch (error) {
        console.error('Error calculating metrics:', error);
        setA1cValue(null);
        setA1cStatus(null);
        setInRangePercentage(null);
        setHighPercentage(null);
        setLowPercentage(null);
      }
    },
    [calculateA1c, ranges.low, ranges.high, selectedTimeRange],
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
    } catch (error) {
      console.error('Error loading readings:', error);
      Alert.alert('Error', 'Failed to load readings');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  // Calculate metrics whenever readings or ranges change
  useEffect(() => {
    if (readings.length > 0) {
      calculateMetrics(readings);
    }
  }, [readings, ranges.low, ranges.high, calculateMetrics]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  useEffect(() => {
    const loadRanges = async () => {
      try {
        const savedRanges = await settingsService.getRanges();
        const newRanges = {
          low: savedRanges.useCustomRanges
            ? savedRanges.customLow ?? savedRanges.low
            : savedRanges.low,
          high: savedRanges.useCustomRanges
            ? savedRanges.customHigh ?? savedRanges.high
            : savedRanges.high,
        };
        setRanges(newRanges);
      } catch (error) {
        console.error('Error loading ranges:', error);
      }
    };
    loadRanges();
  }, []); // Only run once on mount

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
            <Text style={styles.statLabel}>In Range</Text>
            <Text style={styles.statValue}>
              {inRangePercentage !== null
                ? `${inRangePercentage.toFixed(1)}%`
                : 'No readings'}
            </Text>
            <Text style={styles.rangeText}>
              ({ranges.low} - {ranges.high} mg/dL)
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={[styles.statValue, styles.highValue]}>
              {highPercentage !== null
                ? `${highPercentage.toFixed(1)}%`
                : 'No readings'}
            </Text>
            <Text style={styles.rangeText}>(Above {ranges.high} mg/dL)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={[styles.statValue, styles.lowValue]}>
              {lowPercentage !== null
                ? `${lowPercentage.toFixed(1)}%`
                : 'No readings'}
            </Text>
            <Text style={styles.rangeText}>(Below {ranges.low} mg/dL)</Text>
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
  rangeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  highValue: {
    color: '#FF3B30', // Red color for high values
  },
  lowValue: {
    color: '#007AFF', // Blue color for low values
  },
});

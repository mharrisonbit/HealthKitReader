import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {subDays} from 'date-fns';
import {DatabaseService} from '../services/database';
import {SettingsService} from '../services/settingsService';
import {BloodGlucose} from '../types/BloodGlucose';
import {calculateA1C} from '../utils/a1cCalculator';

const TIME_RANGES = [
  {label: '7D', value: 7},
  {label: '14D', value: 14},
  {label: '30D', value: 30},
  {label: '90D', value: 90},
];

interface Metrics {
  a1cValue: number | null;
  a1cStatus: string | null;
  inRangePercentage: number | null;
  highPercentage: number | null;
  lowPercentage: number | null;
  averageGlucose: number | null;
}

export const ComparisonScreen: React.FC = (): JSX.Element => {
  const [firstRange, setFirstRange] = useState(7);
  const [secondRange, setSecondRange] = useState(14);
  const [firstMetrics, setFirstMetrics] = useState<Metrics>({
    a1cValue: null,
    a1cStatus: null,
    inRangePercentage: null,
    highPercentage: null,
    lowPercentage: null,
    averageGlucose: null,
  });
  const [secondMetrics, setSecondMetrics] = useState<Metrics>({
    a1cValue: null,
    a1cStatus: null,
    inRangePercentage: null,
    highPercentage: null,
    lowPercentage: null,
    averageGlucose: null,
  });
  const [_ranges, setRanges] = useState({low: 70, high: 180});
  const [_isLoading, setIsLoading] = useState(false);

  const calculateMetrics = (
    readings: BloodGlucose[],
    currentRanges: {low: number; high: number},
  ): Metrics => {
    if (readings.length === 0) {
      return {
        a1cValue: null,
        a1cStatus: null,
        inRangePercentage: null,
        highPercentage: null,
        lowPercentage: null,
        averageGlucose: null,
      };
    }

    try {
      const totalReadings = readings.length;
      const inRange = readings.filter(
        reading =>
          reading.value >= currentRanges.low &&
          reading.value <= currentRanges.high,
      ).length;
      const high = readings.filter(
        reading => reading.value > currentRanges.high,
      ).length;
      const low = readings.filter(
        reading => reading.value < currentRanges.low,
      ).length;

      const averageGlucose =
        readings.reduce((sum, reading) => sum + reading.value, 0) /
        totalReadings;

      const a1cValue = calculateA1C(readings);
      const a1cStatus =
        a1cValue !== null && parseFloat(a1cValue) < 5.7
          ? 'Normal'
          : a1cValue !== null && parseFloat(a1cValue) < 6.5
          ? 'Prediabetes'
          : 'Diabetes';

      return {
        a1cValue: a1cValue !== null ? parseFloat(a1cValue) : null,
        a1cStatus,
        inRangePercentage: (inRange / totalReadings) * 100,
        highPercentage: (high / totalReadings) * 100,
        lowPercentage: (low / totalReadings) * 100,
        averageGlucose,
      };
    } catch (error) {
      return {
        a1cValue: null,
        a1cStatus: null,
        inRangePercentage: null,
        highPercentage: null,
        lowPercentage: null,
        averageGlucose: null,
      };
    }
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load ranges
      const settings = SettingsService.getInstance();
      const savedRanges = await settings.getRanges();
      const newRanges = {
        low: savedRanges.useCustomRanges
          ? savedRanges.customLow ?? savedRanges.low
          : savedRanges.low,
        high: savedRanges.useCustomRanges
          ? savedRanges.customHigh ?? savedRanges.high
          : savedRanges.high,
      };
      setRanges(newRanges);

      // Load readings
      const now = new Date();
      const firstStartDate = subDays(now, firstRange);
      const secondStartDate = subDays(now, secondRange);

      const db = DatabaseService.getInstance();
      await db.initDB();

      const firstReadings = await db.getReadingsByDateRange(
        firstStartDate,
        now,
      );
      const secondReadings = await db.getReadingsByDateRange(
        secondStartDate,
        now,
      );

      setFirstMetrics(calculateMetrics(firstReadings, newRanges));
      setSecondMetrics(calculateMetrics(secondReadings, newRanges));
    } catch (error) {
      Alert.alert('Error', 'Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  }, [firstRange, secondRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTimeRangeChange = (range: number, isFirst: boolean) => {
    if (isFirst) {
      setFirstRange(range);
    } else {
      setSecondRange(range);
    }
  };

  const renderMetricRow = (
    label: string,
    firstValue: number | null,
    secondValue: number | null,
    unit: string = '',
  ) => {
    const difference =
      firstValue && secondValue ? firstValue - secondValue : null;
    const differenceColor = difference
      ? difference > 0
        ? '#4CAF50'
        : difference < 0
        ? '#F44336'
        : '#2196F3'
      : '#9E9E9E';

    return (
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricValues}>
          <Text style={styles.metricValue}>
            {firstValue !== null ? `${firstValue.toFixed(1)}${unit}` : 'N/A'}
          </Text>
          <Text style={styles.metricValue}>
            {secondValue !== null ? `${secondValue.toFixed(1)}${unit}` : 'N/A'}
          </Text>
          <Text style={[styles.metricValue, {color: differenceColor}]}>
            {difference !== null
              ? `${difference > 0 ? '+' : ''}${difference.toFixed(1)}${unit}`
              : 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Compare Time Ranges</Text>
        </View>

        <View style={styles.timeRangeContainer}>
          <View style={styles.timeRangeSection}>
            <Text style={styles.sectionTitle}>First Range</Text>
            <View style={styles.timeRangeButtons}>
              {TIME_RANGES.map(range => (
                <TouchableOpacity
                  key={range.value}
                  style={[
                    styles.timeRangeButton,
                    firstRange === range.value && styles.timeRangeButtonActive,
                  ]}
                  onPress={() => handleTimeRangeChange(range.value, true)}>
                  <Text
                    style={[
                      styles.timeRangeButtonText,
                      firstRange === range.value &&
                        styles.timeRangeButtonTextActive,
                    ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.timeRangeSection}>
            <Text style={styles.sectionTitle}>Second Range</Text>
            <View style={styles.timeRangeButtons}>
              {TIME_RANGES.map(range => (
                <TouchableOpacity
                  key={range.value}
                  style={[
                    styles.timeRangeButton,
                    secondRange === range.value && styles.timeRangeButtonActive,
                  ]}
                  onPress={() => handleTimeRangeChange(range.value, false)}>
                  <Text
                    style={[
                      styles.timeRangeButtonText,
                      secondRange === range.value &&
                        styles.timeRangeButtonTextActive,
                    ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>Metric</Text>
            <View style={styles.metricValues}>
              <Text style={styles.metricValue}>First</Text>
              <Text style={styles.metricValue}>Second</Text>
              <Text style={styles.metricValue}>Difference</Text>
            </View>
          </View>

          {renderMetricRow(
            'A1C',
            firstMetrics.a1cValue,
            secondMetrics.a1cValue,
            '%',
          )}
          {renderMetricRow(
            'In Range',
            firstMetrics.inRangePercentage,
            secondMetrics.inRangePercentage,
            '%',
          )}
          {renderMetricRow(
            'High',
            firstMetrics.highPercentage,
            secondMetrics.highPercentage,
            '%',
          )}
          {renderMetricRow(
            'Low',
            firstMetrics.lowPercentage,
            secondMetrics.lowPercentage,
            '%',
          )}
          {renderMetricRow(
            'Average Glucose',
            firstMetrics.averageGlucose,
            secondMetrics.averageGlucose,
            ' mg/dL',
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  timeRangeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  timeRangeSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  timeRangeButtonActive: {
    backgroundColor: '#2196F3',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  timeRangeButtonTextActive: {
    color: '#FFFFFF',
  },
  metricsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    marginLeft: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666666',
  },
  metricValue: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    flex: 1,
  },
});

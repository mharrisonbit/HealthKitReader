import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {SettingsService} from '../services/settingsService';
import {subDays} from 'date-fns';
import {calculateA1C} from '../utils/a1cCalculator';
import {getA1CStatus} from '../utils/a1cStatus';
import {useNavigation} from '@react-navigation/native';

interface Metrics {
  average: number | null;
  min: number | null;
  max: number | null;
  inRange: number | null;
  high: number | null;
  low: number | null;
  a1c: string | null;
  a1cStatus: string | null;
}

const getA1CColor = (a1c: string | null): string => {
  if (a1c === null) return '#666666'; // Gray for N/A

  const a1cNum = parseFloat(a1c);
  if (a1cNum >= 9.0) return '#8B0000'; // Dark red for extremely high
  if (a1cNum >= 6.5) return '#FF0000'; // Red for diabetic
  if (a1cNum >= 5.7) return '#FFA500'; // Orange for pre-diabetic
  return '#4CAF50'; // Green for normal
};

export const ComparisonScreen: React.FC = () => {
  const navigation = useNavigation();
  const [firstRangeReadings, setFirstRangeReadings] = useState<BloodGlucose[]>(
    [],
  );
  const [secondRangeReadings, setSecondRangeReadings] = useState<
    BloodGlucose[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstMetrics, setFirstMetrics] = useState<Metrics>({
    average: null,
    min: null,
    max: null,
    inRange: null,
    high: null,
    low: null,
    a1c: null,
    a1cStatus: null,
  });
  const [secondMetrics, setSecondMetrics] = useState<Metrics>({
    average: null,
    min: null,
    max: null,
    inRange: null,
    high: null,
    low: null,
    a1c: null,
    a1cStatus: null,
  });

  const calculateMetrics = async (
    readings: BloodGlucose[],
  ): Promise<Metrics> => {
    if (readings.length === 0) {
      return {
        average: null,
        min: null,
        max: null,
        inRange: null,
        high: null,
        low: null,
        a1c: null,
        a1cStatus: null,
      };
    }

    const values = readings.map(r => r.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const settings = SettingsService.getInstance();
    const ranges = await settings.getRanges();
    const currentRanges = {
      low: ranges.useCustomRanges ? ranges.customLow ?? ranges.low : ranges.low,
      high: ranges.useCustomRanges
        ? ranges.customHigh ?? ranges.high
        : ranges.high,
    };

    const inRange = readings.filter(
      r => r.value >= currentRanges.low && r.value <= currentRanges.high,
    ).length;
    const high = readings.filter(r => r.value > currentRanges.high).length;
    const low = readings.filter(r => r.value < currentRanges.low).length;

    const a1c = calculateA1C(readings);
    const a1cStatus = getA1CStatus(a1c);

    return {
      average,
      min,
      max,
      inRange: (inRange / readings.length) * 100,
      high: (high / readings.length) * 100,
      low: (low / readings.length) * 100,
      a1c,
      a1cStatus,
    };
  };

  const loadReadings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const db = DatabaseService.getInstance();
      await db.initDB();

      const today = new Date();
      const firstRangeEnd = today;
      const firstRangeStart = subDays(today, 90);
      const secondRangeEnd = firstRangeStart;
      const secondRangeStart = subDays(secondRangeEnd, 90);

      // Load readings for first range (most recent 90 days)
      const firstReadings = await db.getReadingsByDateRange(
        firstRangeStart,
        firstRangeEnd,
      );
      setFirstRangeReadings(firstReadings);
      const firstMetricsResult = await calculateMetrics(firstReadings);
      setFirstMetrics(firstMetricsResult);

      // Load readings for second range (previous 90 days)
      const secondReadings = await db.getReadingsByDateRange(
        secondRangeStart,
        secondRangeEnd,
      );
      setSecondRangeReadings(secondReadings);
      const secondMetricsResult = await calculateMetrics(secondReadings);
      setSecondMetrics(secondMetricsResult);
    } catch (err) {
      setError('Failed to load readings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadReadings();
    });

    return unsubscribe;
  }, [navigation, loadReadings]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>90-Day Comparison</Text>
        <Text style={styles.headerSubtitle}>
          Comparing the last 90 days with the previous 90 days
        </Text>
      </View>

      {firstRangeReadings.length > 0 && secondRangeReadings.length > 0 && (
        <View style={styles.resultsContainer}>
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>
              Current Period (Last 3 Months)
            </Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Average:</Text>
              <Text style={styles.metricValue}>
                {firstMetrics.average?.toFixed(1) ?? 'N/A'} mg/dL
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>In Range:</Text>
              <Text style={styles.metricValue}>
                {firstMetrics.inRange?.toFixed(1) ?? 'N/A'}%
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>High:</Text>
              <Text style={styles.metricValue}>
                {firstMetrics.high?.toFixed(1) ?? 'N/A'}%
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Low:</Text>
              <Text style={styles.metricValue}>
                {firstMetrics.low?.toFixed(1) ?? 'N/A'}%
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>A1C:</Text>
              <Text
                style={[
                  styles.metricValue,
                  {color: getA1CColor(firstMetrics.a1c)},
                ]}>
                {firstMetrics.a1c ?? 'N/A'}%
              </Text>
            </View>
            {firstMetrics.a1cStatus && (
              <Text
                style={[
                  styles.a1cStatus,
                  {color: getA1CColor(firstMetrics.a1c)},
                ]}>
                {firstMetrics.a1cStatus}
              </Text>
            )}
          </View>

          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>
              Previous Period (3 Months Before)
            </Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Average:</Text>
              <Text style={styles.metricValue}>
                {secondMetrics.average?.toFixed(1) ?? 'N/A'} mg/dL
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>In Range:</Text>
              <Text style={styles.metricValue}>
                {secondMetrics.inRange?.toFixed(1) ?? 'N/A'}%
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>High:</Text>
              <Text style={styles.metricValue}>
                {secondMetrics.high?.toFixed(1) ?? 'N/A'}%
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Low:</Text>
              <Text style={styles.metricValue}>
                {secondMetrics.low?.toFixed(1) ?? 'N/A'}%
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>A1C:</Text>
              <Text
                style={[
                  styles.metricValue,
                  {color: getA1CColor(secondMetrics.a1c)},
                ]}>
                {secondMetrics.a1c ?? 'N/A'}%
              </Text>
            </View>
            {secondMetrics.a1cStatus && (
              <Text
                style={[
                  styles.a1cStatus,
                  {color: getA1CColor(secondMetrics.a1c)},
                ]}>
                {secondMetrics.a1cStatus}
              </Text>
            )}
          </View>

          <View style={[styles.metricsContainer, styles.differenceContainer]}>
            <Text style={styles.metricsTitle}>
              Progress (Current vs Previous Period)
            </Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Average:</Text>
              <Text
                style={[
                  styles.metricValue,
                  styles.differenceValue,
                  firstMetrics.average && secondMetrics.average
                    ? firstMetrics.average < secondMetrics.average
                      ? styles.positiveDifference
                      : styles.negativeDifference
                    : null,
                ]}>
                {firstMetrics.average && secondMetrics.average
                  ? `${(firstMetrics.average - secondMetrics.average).toFixed(
                      1,
                    )} mg/dL`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>In Range:</Text>
              <Text
                style={[
                  styles.metricValue,
                  styles.differenceValue,
                  firstMetrics.inRange && secondMetrics.inRange
                    ? firstMetrics.inRange > secondMetrics.inRange
                      ? styles.positiveDifference
                      : styles.negativeDifference
                    : null,
                ]}>
                {firstMetrics.inRange && secondMetrics.inRange
                  ? `${(firstMetrics.inRange - secondMetrics.inRange).toFixed(
                      1,
                    )}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>High:</Text>
              <Text
                style={[
                  styles.metricValue,
                  styles.differenceValue,
                  firstMetrics.high && secondMetrics.high
                    ? firstMetrics.high < secondMetrics.high
                      ? styles.positiveDifference
                      : styles.negativeDifference
                    : null,
                ]}>
                {firstMetrics.high && secondMetrics.high
                  ? `${(firstMetrics.high - secondMetrics.high).toFixed(1)}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Low:</Text>
              <Text
                style={[
                  styles.metricValue,
                  styles.differenceValue,
                  firstMetrics.low && secondMetrics.low
                    ? firstMetrics.low < secondMetrics.low
                      ? styles.positiveDifference
                      : styles.negativeDifference
                    : null,
                ]}>
                {firstMetrics.low && secondMetrics.low
                  ? `${(firstMetrics.low - secondMetrics.low).toFixed(1)}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>A1C:</Text>
              <Text
                style={[
                  styles.metricValue,
                  styles.differenceValue,
                  firstMetrics.a1c && secondMetrics.a1c
                    ? parseFloat(firstMetrics.a1c) <
                      parseFloat(secondMetrics.a1c)
                      ? styles.positiveDifference
                      : styles.negativeDifference
                    : null,
                ]}>
                {firstMetrics.a1c && secondMetrics.a1c
                  ? `${(
                      parseFloat(firstMetrics.a1c) -
                      parseFloat(secondMetrics.a1c)
                    ).toFixed(1)}%`
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    padding: 16,
  },
  metricsContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
  differenceContainer: {
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
    marginTop: 8,
  },
  differenceValue: {
    fontWeight: 'bold',
  },
  positiveDifference: {
    color: '#34C759', // Green for positive changes
  },
  negativeDifference: {
    color: '#FF3B30', // Red for negative changes
  },
  a1cStatus: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});

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
import {HealthService} from '../services/healthService';

const databaseService = DatabaseService.getInstance();
const settingsService = SettingsService.getInstance();
const healthService = HealthService.getInstance();

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
  const [ranges, setRanges] = useState({low: 70, high: 180});
  const [metrics, setMetrics] = useState({
    a1cValue: null as number | null,
    a1cStatus: null as string | null,
    inRangePercentage: null as number | null,
    highPercentage: null as number | null,
    lowPercentage: null as number | null,
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(90); // Default to 3 months
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const calculateMetrics = useCallback(
    (
      currentReadings: BloodGlucose[],
      currentRanges: {low: number; high: number},
    ) => {
      if (currentReadings.length === 0) {
        setMetrics({
          a1cValue: null,
          a1cStatus: null,
          inRangePercentage: null,
          highPercentage: null,
          lowPercentage: null,
        });
        return;
      }

      try {
        // Filter readings by selected time range
        const now = new Date();
        const startDate =
          selectedTimeRange <= 31
            ? subDays(now, selectedTimeRange)
            : subMonths(now, Math.ceil(selectedTimeRange / 30));

        const filteredReadings = currentReadings.filter(
          reading => new Date(reading.timestamp) >= startDate,
        );

        if (filteredReadings.length === 0) {
          setMetrics({
            a1cValue: null,
            a1cStatus: null,
            inRangePercentage: null,
            highPercentage: null,
            lowPercentage: null,
          });
          return;
        }

        // Calculate average glucose
        const totalGlucose = filteredReadings.reduce(
          (sum, reading) => sum + reading.value,
          0,
        );
        const averageGlucose = totalGlucose / filteredReadings.length;

        // Calculate A1C
        const a1c = (averageGlucose + 46.7) / 28.7;
        const roundedA1c = Number(a1c.toFixed(1));

        const inRangeCount = filteredReadings.filter(
          reading =>
            reading.value >= currentRanges.low &&
            reading.value <= currentRanges.high,
        ).length;
        const highCount = filteredReadings.filter(
          reading => reading.value > currentRanges.high,
        ).length;
        const lowCount = filteredReadings.filter(
          reading => reading.value < currentRanges.low,
        ).length;

        const total = filteredReadings.length;
        setMetrics({
          a1cValue: roundedA1c,
          a1cStatus: getA1CStatus(roundedA1c.toString()),
          inRangePercentage: (inRangeCount / total) * 100,
          highPercentage: (highCount / total) * 100,
          lowPercentage: (lowCount / total) * 100,
        });
      } catch (error) {
        console.error('Error calculating metrics:', error);
        setMetrics({
          a1cValue: null,
          a1cStatus: null,
          inRangePercentage: null,
          highPercentage: null,
          lowPercentage: null,
        });
      }
    },
    [selectedTimeRange],
  );

  const loadReadings = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startDate = subDays(now, selectedTimeRange);
      const loadedReadings = await databaseService.getReadingsByDateRange(
        startDate,
        now,
      );
      setReadings(loadedReadings);
    } catch (error) {
      console.error('Error loading readings:', error);
      Alert.alert('Error', 'Failed to load readings');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  const loadRanges = useCallback(async () => {
    try {
      const savedRanges = await settingsService.getRanges();
      setRanges({
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
  }, []);

  const checkAndPromptForSync = useCallback(async () => {
    try {
      const shouldSync = await settingsService.shouldSyncWithHealthKit();
      if (shouldSync) {
        Alert.alert(
          'Sync with HealthKit',
          'Would you like to get the latest data from HealthKit?',
          [
            {
              text: 'Not Now',
              style: 'cancel',
            },
            {
              text: 'Sync Now',
              onPress: async () => {
                setIsLoading(true);
                try {
                  // First sync with HealthKit
                  await healthService.importBloodGlucoseInBatches(
                    new Date(2000, 0, 1),
                    new Date(),
                    progress => {
                      console.log(
                        `Importing HealthKit data: ${progress.currentDay}/${progress.totalDays}`,
                      );
                    },
                  );

                  // Then reload readings from the database
                  await loadReadings();

                  // Update the last sync time
                  await settingsService.updateLastSyncTime();

                  // Show success message
                  Alert.alert('Success', 'Successfully synced with HealthKit', [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Recalculate metrics with new data
                        calculateMetrics(readings, ranges);
                      },
                    },
                  ]);
                } catch (error) {
                  console.error('Error syncing with HealthKit:', error);
                  Alert.alert('Error', 'Failed to sync with HealthKit');
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  }, [loadReadings, readings, ranges, calculateMetrics]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        // Load ranges first
        await loadRanges();
        // Then load readings
        await loadReadings();
        // Finally check for sync
        await checkAndPromptForSync();
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []); // Empty dependency array since we're handling all dependencies inside

  // Subscribe to range changes
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(newRanges => {
      setRanges(newRanges);
    });
    return () => unsubscribe();
  }, []);

  // Recalculate metrics when readings or ranges change
  useEffect(() => {
    if (readings.length > 0) {
      calculateMetrics(readings, ranges);
    }
  }, [readings, ranges, calculateMetrics]);

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

        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'grid' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('grid')}>
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === 'grid' && styles.viewModeButtonTextActive,
              ]}>
              Grid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'list' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('list')}>
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === 'list' && styles.viewModeButtonTextActive,
              ]}>
              List
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          {viewMode === 'grid' ? (
            <>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, {width: '48%'}]}>
                  <Text style={styles.statLabel}>Estimated A1C</Text>
                  <Text style={styles.statValue}>
                    {metrics.a1cValue
                      ? `${metrics.a1cValue.toFixed(1)}%`
                      : 'No readings'}
                  </Text>
                  {metrics.a1cStatus && (
                    <Text
                      style={[
                        styles.a1cStatus,
                        {color: getA1CColor(metrics.a1cStatus)},
                      ]}>
                      {metrics.a1cStatus}
                    </Text>
                  )}
                </View>

                <View style={[styles.statCard, {width: '48%'}]}>
                  <Text style={styles.statLabel}>Current</Text>
                  <Text style={styles.statValue}>
                    {readings.length > 0
                      ? `${readings[0].value} mg/dL`
                      : 'No readings'}
                  </Text>
                </View>

                <View style={[styles.statCard, {width: '48%'}]}>
                  <Text style={styles.statLabel}>Average</Text>
                  <Text style={styles.statValue}>
                    {readings.length > 0
                      ? `${readings[0].value} mg/dL`
                      : 'No readings'}
                  </Text>
                </View>

                <View style={[styles.statCard, {width: '48%'}]}>
                  <Text style={styles.statLabel}>In Range</Text>
                  <Text style={styles.statValue}>
                    {metrics.inRangePercentage !== null
                      ? `${metrics.inRangePercentage.toFixed(1)}%`
                      : 'No readings'}
                  </Text>
                  <Text style={styles.rangeText}>
                    ({ranges.low} - {ranges.high} mg/dL)
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, {width: '48%'}]}>
                  <Text style={styles.statLabel}>High</Text>
                  <Text style={[styles.statValue, styles.highValue]}>
                    {metrics.highPercentage !== null
                      ? `${metrics.highPercentage.toFixed(1)}%`
                      : 'No readings'}
                  </Text>
                  <Text style={styles.rangeText}>
                    (Above {ranges.high} mg/dL)
                  </Text>
                </View>

                <View style={[styles.statCard, {width: '48%'}]}>
                  <Text style={styles.statLabel}>Low</Text>
                  <Text style={[styles.statValue, styles.lowValue]}>
                    {metrics.lowPercentage !== null
                      ? `${metrics.lowPercentage.toFixed(1)}%`
                      : 'No readings'}
                  </Text>
                  <Text style={styles.rangeText}>
                    (Below {ranges.low} mg/dL)
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.statsList}>
              <View style={[styles.statCard, {width: '100%'}]}>
                <Text style={styles.statLabel}>Estimated A1C</Text>
                <Text style={styles.statValue}>
                  {metrics.a1cValue
                    ? `${metrics.a1cValue.toFixed(1)}%`
                    : 'No readings'}
                </Text>
                {metrics.a1cStatus && (
                  <Text
                    style={[
                      styles.a1cStatus,
                      {color: getA1CColor(metrics.a1cStatus)},
                    ]}>
                    {metrics.a1cStatus}
                  </Text>
                )}
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <Text style={styles.statLabel}>Current</Text>
                <Text style={styles.statValue}>
                  {readings.length > 0
                    ? `${readings[0].value} mg/dL`
                    : 'No readings'}
                </Text>
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>
                  {readings.length > 0
                    ? `${readings[0].value} mg/dL`
                    : 'No readings'}
                </Text>
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <Text style={styles.statLabel}>In Range</Text>
                <Text style={styles.statValue}>
                  {metrics.inRangePercentage !== null
                    ? `${metrics.inRangePercentage.toFixed(1)}%`
                    : 'No readings'}
                </Text>
                <Text style={styles.rangeText}>
                  ({ranges.low} - {ranges.high} mg/dL)
                </Text>
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <Text style={styles.statLabel}>High</Text>
                <Text style={[styles.statValue, styles.highValue]}>
                  {metrics.highPercentage !== null
                    ? `${metrics.highPercentage.toFixed(1)}%`
                    : 'No readings'}
                </Text>
                <Text style={styles.rangeText}>
                  (Above {ranges.high} mg/dL)
                </Text>
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <Text style={styles.statLabel}>Low</Text>
                <Text style={[styles.statValue, styles.lowValue]}>
                  {metrics.lowPercentage !== null
                    ? `${metrics.lowPercentage.toFixed(1)}%`
                    : 'No readings'}
                </Text>
                <Text style={styles.rangeText}>(Below {ranges.low} mg/dL)</Text>
              </View>
            </View>
          )}
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
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 8,
  },
  viewModeButtonActive: {
    backgroundColor: '#5856D6',
    borderColor: '#5856D6',
  },
  viewModeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  statsList: {
    flex: 1,
  },
});

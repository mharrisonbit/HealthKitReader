import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {SettingsService} from '../services/settingsService';
import {subDays, subMonths} from 'date-fns';
import {HealthService} from '../services/healthService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import Logger from '../utils/logger';

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
  const navigation = useNavigation();
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ranges, setRanges] = useState({low: 70, high: 180});
  const [metrics, setMetrics] = useState({
    a1cValue: null as number | null,
    a1cStatus: null as string | null,
    inRangePercentage: null as number | null,
    highPercentage: null as number | null,
    lowPercentage: null as number | null,
    averageGlucose: null as number | null,
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(90); // Default to 3 months
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  const calculateMetrics = useCallback(async (readings: BloodGlucose[]) => {
    try {
      const ranges = await settingsService.getRanges();
      const {low, high} = ranges;

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

      const values = readings.map(reading => reading.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      const inRangeCount = values.filter(
        value => value >= low && value <= high,
      ).length;
      const highCount = values.filter(value => value > high).length;
      const lowCount = values.filter(value => value < low).length;

      const inRange = (inRangeCount / values.length) * 100;
      const highPercentage = (highCount / values.length) * 100;
      const lowPercentage = (lowCount / values.length) * 100;

      const a1c = calculateA1C(average);
      const a1cStatus = getA1CStatus(a1c);

      return {
        average,
        min,
        max,
        inRange,
        high: highPercentage,
        low: lowPercentage,
        a1c,
        a1cStatus,
      };
    } catch (error) {
      Logger.error('Error calculating metrics:', error);
      throw error;
    }
  }, []);

  const loadReadings = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = DatabaseService.getInstance();
      await db.initDB();

      const today = new Date();
      const startDate = subDays(today, 90);
      const readings = await db.getReadingsByDateRange(startDate, today);
      setReadings(readings);
      const metricsResult = await calculateMetrics(readings);
      setMetrics(metricsResult);
    } catch (error) {
      Logger.error('Error loading readings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateMetrics]);

  const loadRanges = useCallback(async () => {
    try {
      const ranges = await settingsService.getRanges();
      setRanges(ranges);
    } catch (error) {
      Logger.error('Error loading ranges:', error);
    }
  }, []);

  const checkAndPromptForSync = useCallback(async () => {
    try {
      const healthService = HealthService.getInstance();
      const shouldSync = await healthService.shouldSyncWithHealthKit();

      if (shouldSync) {
        setShowSyncModal(true);
      }
    } catch (error) {
      Logger.error('Error checking sync status:', error);
    }
  }, []);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const healthService = HealthService.getInstance();
      await healthService.syncWithHealthKit();
      await loadReadings();
      setShowSyncModal(false);
    } catch (error) {
      Logger.error('Error syncing with HealthKit:', error);
      Alert.alert('Error', 'Failed to sync with HealthKit');
    } finally {
      setIsSyncing(false);
    }
  };

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
        Logger.error('Error during initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []); // Empty dependency array since we're handling all dependencies inside

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadReadings();
    });

    return unsubscribe;
  }, [navigation, loadReadings]);

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
      calculateMetrics(readings);
    }
  }, [readings, calculateMetrics]);

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

  const infoExplanations = {
    a1c: {
      title: 'Estimated A1C',
      description:
        "A1C is a measure of your average blood glucose levels over the past 2-3 months. It's shown as a percentage. The higher the percentage, the higher your blood glucose levels have been.",
    },
    current: {
      title: 'Current Reading',
      description:
        'Your most recent blood glucose reading. This shows your current blood sugar level in mg/dL.',
    },
    average: {
      title: 'Average Reading',
      description:
        'The average of all your blood glucose readings within the selected time period.',
    },
    inRange: {
      title: 'In Range',
      description:
        "The percentage of your readings that fall within your target range. This helps you understand how well you're managing your blood glucose levels.",
    },
    high: {
      title: 'High Readings',
      description:
        'The percentage of your readings that are above your target range. Consistently high readings may indicate the need for adjustments to your management plan.',
    },
    low: {
      title: 'Low Readings',
      description:
        'The percentage of your readings that are below your target range. Low readings can be dangerous and should be addressed immediately.',
    },
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
                Logger.log('Time range button pressed:', range.value);
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
                  <View style={styles.cardHeader}>
                    <Text style={styles.statLabel}>Estimated A1C</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedInfo('a1c')}
                      style={styles.infoButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
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
                  <View style={styles.cardHeader}>
                    <Text style={styles.statLabel}>Current</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedInfo('current')}
                      style={styles.infoButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.statValue}>
                    {readings.length > 0
                      ? `${readings[0].value} mg/dL`
                      : 'No readings'}
                  </Text>
                  {readings.length > 0 && (
                    <Text style={styles.timestampText}>
                      {new Date(readings[0].timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>

                <View style={[styles.statCard, {width: '48%'}]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.statLabel}>Average</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedInfo('average')}
                      style={styles.infoButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.statValue}>
                    {metrics.averageGlucose !== null
                      ? `${metrics.averageGlucose} mg/dL`
                      : 'No readings'}
                  </Text>
                </View>

                <View style={[styles.statCard, {width: '48%'}]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.statLabel}>In Range</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedInfo('inRange')}
                      style={styles.infoButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
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
                  <View style={styles.cardHeader}>
                    <Text style={styles.statLabel}>High</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedInfo('high')}
                      style={styles.infoButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
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
                  <View style={styles.cardHeader}>
                    <Text style={styles.statLabel}>Low</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedInfo('low')}
                      style={styles.infoButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
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
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>Estimated A1C</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedInfo('a1c')}
                    style={styles.infoButton}>
                    <Icon name="info-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
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
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>Current</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedInfo('current')}
                    style={styles.infoButton}>
                    <Icon name="info-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.statValue}>
                  {readings.length > 0
                    ? `${readings[0].value} mg/dL`
                    : 'No readings'}
                </Text>
                {readings.length > 0 && (
                  <Text style={styles.timestampText}>
                    {new Date(readings[0].timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>Average</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedInfo('average')}
                    style={styles.infoButton}>
                    <Icon name="info-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.statValue}>
                  {metrics.averageGlucose !== null
                    ? `${metrics.averageGlucose} mg/dL`
                    : 'No readings'}
                </Text>
              </View>

              <View style={[styles.statCard, {width: '100%'}]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>In Range</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedInfo('inRange')}
                    style={styles.infoButton}>
                    <Icon name="info-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
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
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>High</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedInfo('high')}
                    style={styles.infoButton}>
                    <Icon name="info-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
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
                <View style={styles.cardHeader}>
                  <Text style={styles.statLabel}>Low</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedInfo('low')}
                    style={styles.infoButton}>
                    <Icon name="info-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
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

        <Modal
          visible={!!selectedInfo}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedInfo(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedInfo ? infoExplanations[selectedInfo].title : ''}
              </Text>
              <Text style={styles.modalText}>
                {selectedInfo ? infoExplanations[selectedInfo].description : ''}
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelectedInfo(null)}>
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  a1cStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  rangeText: {
    fontSize: 10,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#5856D6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestampText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
});

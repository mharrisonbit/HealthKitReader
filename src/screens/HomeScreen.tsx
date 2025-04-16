import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  useWindowDimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Button,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {HealthService} from '../services/healthService';
import {SettingsService} from '../services/settingsService';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {useFocusEffect} from '@react-navigation/native';
import {BloodGlucoseRanges} from '../services/settingsService';
import {subDays, subHours} from 'date-fns';
import {Reading} from '../types/Reading';
import AppleHealthKit from 'react-native-health';
import {LoadingIndicator} from '../components/LoadingIndicator';
import {TimeRangeSelector} from '../components/TimeRangeSelector';
import {BloodGlucoseChart} from '../components/BloodGlucoseChart';

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Add: {
    onSave: (data: Omit<BloodGlucose, 'id'>) => void;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const healthService = HealthService.getInstance();
const settingsService = SettingsService.getInstance();
const databaseService = new DatabaseService();

type HomeScreenStyles = {
  container: ViewStyle;
  header: ViewStyle;
  headerLeft: ViewStyle;
  headerRight: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  chartToggles: ViewStyle;
  chartToggle: ViewStyle;
  activeToggle: ViewStyle;
  toggleText: TextStyle;
  activeToggleText: TextStyle;
  actionButtons: ViewStyle;
  addButton: ViewStyle;
  addButtonText: TextStyle;
  settingsButton: ViewStyle;
  settingsButtonText: TextStyle;
  content: ViewStyle;
  chartContainer: ViewStyle;
  chartWrapper: ViewStyle;
  chart: ViewStyle;
  readingsContainer: ViewStyle;
  sectionTitle: TextStyle;
  readingItem: ViewStyle;
  readingContent: ViewStyle;
  readingValue: TextStyle;
  readingDate: TextStyle;
  readingSource: TextStyle;
  emptyState: ViewStyle;
  emptyStateText: TextStyle;
  emptyStateSubtext: TextStyle;
  legendContainer: ViewStyle;
  legendItem: ViewStyle;
  legendColor: ViewStyle;
  legendText: TextStyle;
  sortToggle: ViewStyle;
  sortToggleText: TextStyle;
  editButton: ViewStyle;
  deleteButton: ViewStyle;
  editButtonText: TextStyle;
  deleteButtonText: TextStyle;
  loadingContainer: ViewStyle;
  editModal: ViewStyle;
  modalOverlay: ViewStyle;
  editContent: ViewStyle;
  editTitle: TextStyle;
  editInput: ViewStyle;
  buttonContainer: ViewStyle;
  cancelButton: ViewStyle;
  readingNotes: TextStyle;
  popupOverlay: ViewStyle;
  popupContent: ViewStyle;
  popupTitle: TextStyle;
  popupInfo: ViewStyle;
  popupLabel: TextStyle;
  popupValue: TextStyle;
  closeButton: ViewStyle;
  closeButtonText: TextStyle;
  readingsSection: ViewStyle;
  readingsList: ViewStyle;
  chartContainerLandscape: ViewStyle;
  popupContentLandscape: ViewStyle;
  scrollContent: ViewStyle;
  percentagesContainer: ViewStyle;
  percentagesTitle: TextStyle;
  percentagesRow: ViewStyle;
  percentage: TextStyle;
  trendContainer: ViewStyle;
  trendTitle: TextStyle;
  trendIndicator: ViewStyle;
  trendText: TextStyle;
  importProgress: ViewStyle;
  importSpinner: ViewStyle;
  importProgressText: TextStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  footer: ViewStyle;
  emptyChartContainer: ViewStyle;
  emptyChartText: TextStyle;
  chartLoadingContainer: ViewStyle;
  readingColorIndicator: ViewStyle;
  readingInfo: ViewStyle;
  readingUnit: TextStyle;
  readingTime: TextStyle;
  a1cContainer: ViewStyle;
  a1cTimeFrameButton: ViewStyle;
  a1cTimeFrameButtonText: TextStyle;
  a1cTimeFramePicker: ViewStyle;
  a1cTimeFramePickerTitle: TextStyle;
  a1cTimeFrameOptionsContainer: ViewStyle;
  a1cTimeFrameOption: ViewStyle;
  a1cTimeFrameOptionActive: ViewStyle;
  a1cTimeFrameOptionText: TextStyle;
  a1cTimeFrameOptionTextActive: TextStyle;
  currentReadingContainer: ViewStyle;
  currentReadingTitle: TextStyle;
  currentReadingContent: ViewStyle;
  currentReadingValue: TextStyle;
  currentReadingTime: TextStyle;
  currentReadingSource: TextStyle;
  lastSyncTime: TextStyle;
  popupScrollView: ViewStyle;
};

const timeRangeOptions = [
  {label: '1 Hour', value: '1'},
  {label: '3 Hours', value: '3'},
  {label: '12 Hours', value: '12'},
  {label: '24 Hours', value: '24'},
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [ranges, setRanges] = useState<{
    low: number;
    high: number;
    useCustomRanges: boolean;
    customLow?: number;
    customHigh?: number;
  }>({
    low: 70,
    high: 180,
    useCustomRanges: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [_isEditing, _setIsEditing] = useState(false);
  const [_editingReading, _setEditingReading] = useState<BloodGlucose | null>(
    null,
  );
  const [selectedReading, setSelectedReading] = useState<BloodGlucose | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    currentDate: Date;
    totalDays: number;
    currentDay: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthKitData, setHealthKitData] = useState<any>(null);
  const [isLoadingHealthKitData, setIsLoadingHealthKitData] = useState(false);
  const [timePeriod, _setTimePeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState(24);
  const [_selectedTimeRange, setSelectedTimeRange] = useState<string>('24');
  const [_isLoadingTimeRange, _setIsLoadingTimeRange] = useState(false);
  const [a1cTimeFrame, setA1cTimeFrame] = useState<
    '1w' | '1m' | '2m' | '3m' | '6m' | '1y'
  >('3m');
  const [showA1cTimeFramePicker, setShowA1cTimeFramePicker] = useState(false);
  const [a1cValue, setA1cValue] = useState<string | null>(null);
  const [a1cStatus, setA1cStatus] = useState<string>('N/A');
  const [isCalculatingA1C, setIsCalculatingA1C] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [hasNextData, setHasNextData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: Array<{
      data: number[];
      strokeWidth: number;
      color?: (opacity: number) => string;
      withDots?: boolean;
    }>;
  }>({
    labels: [],
    datasets: [
      {
        data: [],
        strokeWidth: 2,
      },
      {
        data: [],
        strokeWidth: 1,
        color: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
        withDots: false,
      },
    ],
  });

  const calculateAverage = useCallback((readings: Reading[]): number => {
    if (readings.length === 0) return 0;
    const sum = readings.reduce(
      (acc: number, reading: Reading) => acc + reading.value,
      0,
    );
    return sum / readings.length;
  }, []);

  const formatTimeLabel = useCallback(
    (date: Date) => {
      if (timePeriod === '24h') {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    },
    [timePeriod],
  );

  const loadReadings = useCallback(async () => {
    try {
      _setIsLoadingTimeRange(true);
      setIsLoading(true);
      setError(null);
      const allReadings = await databaseService.getAllReadings();

      // Sort readings by date in descending order (newest first)
      const sortedReadings = allReadings.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      // Limit to last 100 readings for better performance
      const limitedReadings = sortedReadings.slice(0, 100);
      setReadings(limitedReadings);

      // Update last sync time if we have readings
      if (sortedReadings.length > 0) {
        setLastSyncTime(sortedReadings[0].timestamp);
      }

      // After loading readings, check for new data in HealthKit
      if (Platform.OS === 'ios') {
        try {
          const oldestDate = await healthService.getOldestBloodGlucoseDate();
          if (oldestDate) {
            const latestReading = sortedReadings[0];
            const startDate = latestReading
              ? new Date(latestReading.timestamp.getTime() + 1)
              : oldestDate;
            const endDate = new Date();

            const {importedCount} =
              await healthService.importBloodGlucoseInBatches(
                startDate,
                endDate,
                _progress => {
                  // Empty callback for progress updates
                },
              );

            if (importedCount > 0) {
              // Reload readings to show the newly imported data
              const updatedReadings = await databaseService.getAllReadings();
              const updatedSortedReadings = updatedReadings.sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
              );
              setReadings(updatedSortedReadings.slice(0, 100));
            }
          }
        } catch (error) {
          // Silently handle error
        }
      }
    } catch (error) {
      console.error('Error loading readings:', error);
    } finally {
      setIsLoading(false);
      _setIsLoadingTimeRange(false);
    }
  }, []);

  const updateChartData = useCallback(async () => {
    try {
      setIsLoadingChart(true);
      const allReadings = await databaseService.getAllReadings();

      // Sort readings by date in descending order (newest first)
      const sortedReadings = allReadings.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      // Filter readings based on time range
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - timeRange);
      const filteredReadings = sortedReadings.filter(
        reading => reading.timestamp >= cutoffTime,
      );

      // Update chart data
      setChartData({
        labels: filteredReadings.map(r => formatTimeLabel(r.timestamp)),
        datasets: [
          {
            data: filteredReadings.map(r => r.value),
            strokeWidth: 2,
          },
          {
            data: filteredReadings.map(() => {
              const average = calculateAverage(filteredReadings);
              return average ? parseFloat(average.toFixed(0)) : 0;
            }),
            strokeWidth: 1,
            color: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
            withDots: false,
          },
        ],
      });
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoadingChart(false);
    }
  }, [timeRange, formatTimeLabel, calculateAverage]);

  // Effect to update chart when time range changes
  useEffect(() => {
    updateChartData();
  }, [timeRange, updateChartData]);

  // Load all data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReadings();
      updateChartData();
    }, [loadReadings, updateChartData]),
  );

  const handleTimeRangeChange = useCallback((value: string) => {
    const newTimeRange = parseInt(value, 10);
    setTimeRange(newTimeRange);
    setSelectedTimeRange(value);
  }, []); // No dependencies needed as we're using the effect above to handle updates

  const handleImportFromHealth = async () => {
    try {
      setIsImporting(true);
      setError(null);

      // First get the oldest available date from HealthKit
      const oldestDate = await healthService.getOldestBloodGlucoseDate();

      if (!oldestDate) {
        Alert.alert('No Data', 'No blood glucose data available in HealthKit');
        return;
      }

      // Import data from the oldest available date
      const {importedCount} = await healthService.importBloodGlucoseInBatches(
        oldestDate,
        new Date(),
        _progress => {
          setImportProgress(_progress);
        },
      );

      Alert.alert(
        'Import Complete',
        `Successfully imported ${importedCount} readings.`,
      );

      // Refresh the readings list
      await loadReadings();
    } catch (err) {
      setError('Failed to import readings');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      const savedRanges = await settingsService.getRanges();
      const savedTimeRange = await settingsService.getTimeRange();
      setRanges({
        low: savedRanges.low,
        high: savedRanges.high,
        useCustomRanges: savedRanges.useCustomRanges,
        customLow: savedRanges.customLow,
        customHigh: savedRanges.customHigh,
      });
      setTimeRange(savedTimeRange);
    };

    loadSettings();

    const subscription = settingsService.subscribeToRanges(newRanges => {
      setRanges(newRanges);
      // Reload readings immediately when ranges change
      loadReadings();
    });

    return () => {
      subscription.remove();
    };
  }, [loadReadings]);

  const calculateA1C = (readings: BloodGlucose[]) => {
    if (readings.length === 0) return null;

    // Calculate average blood glucose over the selected time period
    const averageGlucose =
      readings.reduce((sum, reading) => sum + reading.value, 0) /
      readings.length;

    // Convert average glucose to A1C using the formula: A1C = (average glucose + 46.7) / 28.7
    const a1c = (averageGlucose + 46.7) / 28.7;

    return a1c.toFixed(1);
  };

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

  const getA1cReadings = useCallback(async () => {
    const now = new Date();
    const cutoff = new Date();

    switch (a1cTimeFrame) {
      case '1w':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '1m':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case '2m':
        cutoff.setMonth(now.getMonth() - 2);
        break;
      case '3m':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get fresh data from the database
    const allReadings = await databaseService.getAllReadings();

    const filteredReadings = allReadings.filter(
      reading => reading.timestamp >= cutoff,
    );

    return filteredReadings;
  }, [a1cTimeFrame]);

  // Add useEffect to update A1C when time frame changes
  useEffect(() => {
    const updateA1C = async () => {
      setIsCalculatingA1C(true);
      try {
        const a1cReadings = await getA1cReadings();
        const newA1c = calculateA1C(a1cReadings);
        setA1cValue(newA1c);
        setA1cStatus(getA1CStatus(newA1c));
      } catch (error) {
      } finally {
        setIsCalculatingA1C(false);
      }
    };

    updateA1C();
  }, [a1cTimeFrame, getA1cReadings]);

  const getColorForValue = (value: number): string => {
    if (value < ranges.low) {
      return '#ff6b6b'; // Red for low
    } else if (value > ranges.high) {
      return '#ff6b6b'; // Red for high
    }
    return '#4CAF50'; // Green for normal
  };

  // Add useEffect to update colors when ranges change
  useEffect(() => {
    // Reload readings to ensure colors are updated
    loadReadings();
  }, [ranges, loadReadings]);

  const calculateReadingPercentages = (
    readings: BloodGlucose[],
    ranges: BloodGlucoseRanges,
  ) => {
    if (readings.length === 0) return {low: 0, inRange: 0, high: 0};

    const {low, high} = ranges;
    let lowCount = 0;
    let inRangeCount = 0;
    let highCount = 0;

    readings.forEach(reading => {
      if (reading.value < low) {
        lowCount++;
      } else if (reading.value > high) {
        highCount++;
      } else {
        inRangeCount++;
      }
    });

    const total = readings.length;
    return {
      low: Math.round((lowCount / total) * 100),
      inRange: Math.round((inRangeCount / total) * 100),
      high: Math.round((highCount / total) * 100),
    };
  };

  const calculateTrend = (readings: BloodGlucose[]) => {
    if (readings.length < 6) return 'steady'; // Need at least 6 readings to determine trend

    const recentReadings = readings.slice(0, 3); // Last 3 readings
    const previousReadings = readings.slice(3, 6); // Previous 3 readings

    const recentAverage =
      recentReadings.reduce((sum, r) => sum + r.value, 0) /
      recentReadings.length;
    const previousAverage =
      previousReadings.reduce((sum, r) => sum + r.value, 0) /
      previousReadings.length;

    const difference = recentAverage - previousAverage;
    const threshold = 5; // 5 mg/dL change threshold

    if (difference > threshold) return 'up';
    if (difference < -threshold) return 'down';
    return 'steady';
  };

  // Update allReadings to be a memoized value that updates when readings or sortOrder changes
  const allReadings = useMemo(() => {
    return [...readings].sort((a, b) => {
      const dateA = a.timestamp.getTime();
      const dateB = b.timestamp.getTime();
      return dateB - dateA;
    });
  }, [readings]);

  const getFilteredReadings = useCallback(async (): Promise<Reading[]> => {
    const allReadings = await databaseService.getAllReadings();
    const now = new Date();
    let cutoffDate: Date;

    switch (timePeriod) {
      case '24h':
        cutoffDate = subHours(now, 24);
        break;
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      default:
        cutoffDate = subHours(now, 24);
    }

    return allReadings
      .filter((reading: Reading) => new Date(reading.timestamp) >= cutoffDate)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [timePeriod]);

  const checkAvailableData = useCallback(async () => {
    const now = new Date();
    const allReadings = await databaseService.getAllReadings();

    if (allReadings.length === 0) {
      setHasPreviousData(false);
      setHasNextData(false);
      return;
    }

    // Find the earliest and latest readings
    const earliestReading = allReadings.reduce(
      (earliest: Reading, current: Reading) =>
        current.timestamp < earliest.timestamp ? current : earliest,
    );
    const latestReading = allReadings.reduce(
      (latest: Reading, current: Reading) =>
        current.timestamp > latest.timestamp ? current : latest,
    );

    // Check if there's data before the selected date
    setHasPreviousData(earliestReading.timestamp < selectedDate);

    // Check if there's data after the selected date and it's not in the future
    setHasNextData(
      latestReading.timestamp > selectedDate &&
        new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000) <= now,
    );
  }, [selectedDate]);

  // Update chart data when selected date changes
  useEffect(() => {
    const updateChartData = async () => {
      setIsLoadingChart(true);
      try {
        const filteredReadings = await getFilteredReadings();
        const average = calculateAverage(filteredReadings);

        setChartData({
          labels: filteredReadings.map(r => formatTimeLabel(r.timestamp)),
          datasets: [
            {
              data: filteredReadings.map(r => r.value),
              strokeWidth: 2,
            },
            {
              data: filteredReadings.map(() =>
                average ? parseFloat(average.toFixed(0)) : 0,
              ),
              strokeWidth: 1,
              color: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
              withDots: false,
            },
          ],
        });
        await checkAvailableData();
      } finally {
        setIsLoadingChart(false);
      }
    };

    updateChartData();
  }, [
    selectedDate,
    calculateAverage,
    checkAvailableData,
    formatTimeLabel,
    getFilteredReadings,
  ]);

  const handlePointPress = useCallback(
    (data: {
      index: number;
      value: number;
      dataset: any;
      x: number;
      y: number;
      getColor: (opacity: number) => string;
    }) => {
      if (isLandscape) {
        setSelectedReading(allReadings[data.index]);
      }
    },
    [isLandscape, allReadings],
  );

  const handleCurrentReadingPress = useCallback(
    async (reading: BloodGlucose) => {
      setSelectedReading(reading);
      if (reading.sourceName === 'Apple Health') {
        setIsLoadingHealthKitData(true);
        try {
          const options = {
            startDate: new Date(
              reading.timestamp.getTime() - 1000,
            ).toISOString(), // 1 second before
            endDate: new Date(reading.timestamp.getTime() + 1000).toISOString(), // 1 second after
          };

          const results = await new Promise<any[]>(resolve => {
            AppleHealthKit.getBloodGlucoseSamples(
              options,
              (error: string, samples: any[]) => {
                if (error) {
                  resolve([]);
                } else {
                  resolve(samples);
                }
              },
            );
          });

          if (results.length > 0) {
            setHealthKitData(results[0]);
          }
        } catch (error) {
          // Silently handle error
        } finally {
          setIsLoadingHealthKitData(false);
        }
      }
    },
    [],
  );

  const handleClosePopup = useCallback(() => {
    setSelectedReading(null);
    setHealthKitData(null);
  }, []);

  const getReadingColor = useCallback(
    (value: number) => {
      const {low, high, useCustomRanges, customLow, customHigh} = ranges;
      const effectiveLow =
        useCustomRanges && customLow !== undefined ? customLow : low;
      const effectiveHigh =
        useCustomRanges && customHigh !== undefined ? customHigh : high;

      if (value < effectiveLow) {
        return '#FF3B30'; // Red for low
      } else if (value > effectiveHigh) {
        return '#FF9500'; // Orange for high
      } else {
        return '#34C759'; // Green for normal
      }
    },
    [ranges],
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <Pressable style={styles.container} onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.container}>
            {!isLandscape && (
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.a1cContainer}>
                    <Text style={styles.title}>
                      A1C:{' '}
                      {isCalculatingA1C ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <>
                          <Text style={{color: getA1CColor(a1cValue)}}>
                            {a1cValue || 'N/A'}%
                          </Text>{' '}
                          <Text
                            style={[
                              styles.subtitle,
                              {color: getA1CColor(a1cValue)},
                            ]}>
                            ({a1cStatus})
                          </Text>
                        </>
                      )}
                    </Text>
                    <TouchableOpacity
                      style={styles.a1cTimeFrameButton}
                      onPress={() => setShowA1cTimeFramePicker(true)}>
                      <Text style={styles.a1cTimeFrameButtonText}>
                        {(() => {
                          switch (a1cTimeFrame) {
                            case '1w':
                              return '1w';
                            case '1m':
                              return '1m';
                            case '2m':
                              return '2m';
                            case '3m':
                              return '3m';
                            case '6m':
                              return '6m';
                            case '1y':
                              return '1y';
                            default:
                              return '3m';
                          }
                        })()}{' '}
                        ▼
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.subtitle}>
                    Average:{' '}
                    <Text
                      style={{
                        color: getColorForValue(
                          typeof calculateAverage(allReadings) === 'number'
                            ? calculateAverage(allReadings)
                            : 0,
                        ),
                      }}>
                      {calculateAverage(allReadings) || 'N/A'} mg/dL
                    </Text>
                  </Text>
                  {allReadings.length > 0 && (
                    <View style={styles.percentagesContainer}>
                      <Text style={styles.percentagesTitle}>Readings:</Text>
                      <View style={styles.percentagesRow}>
                        <Text style={[styles.percentage, {color: '#ff6b6b'}]}>
                          Low:{' '}
                          {calculateReadingPercentages(allReadings, ranges).low}
                          %
                        </Text>
                        <Text style={[styles.percentage, {color: '#4CAF50'}]}>
                          In Range:{' '}
                          {
                            calculateReadingPercentages(allReadings, ranges)
                              .inRange
                          }
                          %
                        </Text>
                        <Text style={[styles.percentage, {color: '#ff6b6b'}]}>
                          High:{' '}
                          {
                            calculateReadingPercentages(allReadings, ranges)
                              .high
                          }
                          %
                        </Text>
                      </View>
                      <View style={styles.trendContainer}>
                        <Text style={styles.trendTitle}>Trend:</Text>
                        <View style={styles.trendIndicator}>
                          <Text
                            style={[
                              styles.trendText,
                              {
                                color:
                                  calculateTrend(allReadings) === 'up'
                                    ? '#ff6b6b'
                                    : calculateTrend(allReadings) === 'down'
                                    ? '#4CAF50'
                                    : '#666',
                              },
                            ]}>
                            {calculateTrend(allReadings) === 'up'
                              ? '↑ Trending Up'
                              : calculateTrend(allReadings) === 'down'
                              ? '↓ Trending Down'
                              : '→ Steady'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.headerRight}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.settingsButton}
                      onPress={() => navigation.navigate('Settings')}>
                      <Text style={styles.settingsButtonText}>⚙️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.chartContainer}>
              <TimeRangeSelector
                options={timeRangeOptions}
                selectedValue={timeRange}
                onSelect={handleTimeRangeChange}
              />
              <BloodGlucoseChart
                data={chartData}
                isLoading={isLoadingChart}
                ranges={ranges}
                onPointPress={handlePointPress}
              />
            </View>

            {!isLandscape && (
              <View style={styles.currentReadingContainer}>
                <Text style={styles.currentReadingTitle}>Current Reading</Text>
                {allReadings.length > 0 ? (
                  <TouchableOpacity
                    style={styles.currentReadingContent}
                    onPress={() => handleCurrentReadingPress(allReadings[0])}>
                    <Text
                      style={[
                        styles.currentReadingValue,
                        {color: getReadingColor(allReadings[0].value)},
                      ]}>
                      {allReadings[0].value} mg/dL
                    </Text>
                    <Text style={styles.currentReadingTime}>
                      {allReadings[0].timestamp.toLocaleString()}
                    </Text>
                    <Text style={styles.currentReadingSource}>
                      {allReadings[0].sourceName}
                    </Text>
                    {lastSyncTime && (
                      <Text style={styles.lastSyncTime}>
                        Last sync: {lastSyncTime.toLocaleString()}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No readings available
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      Sync with HealthKit to import readings
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </Pressable>

      {selectedReading && (
        <Modal
          visible={!!selectedReading}
          transparent
          animationType="fade"
          onRequestClose={handleClosePopup}>
          <View style={styles.popupOverlay}>
            <View style={styles.popupContent}>
              <Text style={styles.popupTitle}>Reading Details</Text>
              <ScrollView style={styles.popupScrollView}>
                <View style={styles.popupInfo}>
                  <Text style={styles.popupLabel}>Value:</Text>
                  <Text
                    style={[
                      styles.popupValue,
                      {color: getReadingColor(selectedReading.value)},
                    ]}>
                    {selectedReading.value} mg/dL
                  </Text>
                </View>
                <View style={styles.popupInfo}>
                  <Text style={styles.popupLabel}>Date:</Text>
                  <Text style={styles.popupValue}>
                    {selectedReading.timestamp.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.popupInfo}>
                  <Text style={styles.popupLabel}>Source:</Text>
                  <Text style={styles.popupValue}>
                    {selectedReading.sourceName}
                  </Text>
                </View>
                {selectedReading.notes && (
                  <View style={styles.popupInfo}>
                    <Text style={styles.popupLabel}>Notes:</Text>
                    <Text style={styles.popupValue}>
                      {selectedReading.notes}
                    </Text>
                  </View>
                )}
                {selectedReading.sourceName === 'Apple Health' && (
                  <>
                    {isLoadingHealthKitData ? (
                      <View style={styles.popupInfo}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.popupLabel}>
                          Loading HealthKit data...
                        </Text>
                      </View>
                    ) : healthKitData ? (
                      <>
                        <View style={styles.popupInfo}>
                          <Text style={styles.popupLabel}>HealthKit ID:</Text>
                          <Text style={styles.popupValue}>
                            {healthKitData.id}
                          </Text>
                        </View>
                        <View style={styles.popupInfo}>
                          <Text style={styles.popupLabel}>Original Value:</Text>
                          <Text style={styles.popupValue}>
                            {healthKitData.value} {healthKitData.unit}
                          </Text>
                        </View>
                        <View style={styles.popupInfo}>
                          <Text style={styles.popupLabel}>Device:</Text>
                          <Text style={styles.popupValue}>
                            {healthKitData.device || 'Unknown'}
                          </Text>
                        </View>
                        <View style={styles.popupInfo}>
                          <Text style={styles.popupLabel}>Metadata:</Text>
                          <Text style={styles.popupValue}>
                            {JSON.stringify(
                              healthKitData.metadata || {},
                              null,
                              2,
                            )}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.popupInfo}>
                        <Text style={styles.popupLabel}>
                          No additional HealthKit data available
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClosePopup}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {isImporting && importProgress && (
        <View style={styles.importProgress}>
          <ActivityIndicator
            size="small"
            color="#0000ff"
            style={styles.importSpinner}
          />
          <Text style={styles.importProgressText}>
            Importing data for {importProgress.currentDate.toLocaleDateString()}
          </Text>
          <Text style={styles.importProgressText}>
            Progress: {importProgress.currentDay} of {importProgress.totalDays}{' '}
            days
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLandscape && (
        <View style={styles.footer}>
          <Button
            title="Import from Health"
            onPress={handleImportFromHealth}
            disabled={isImporting}
          />
        </View>
      )}

      {showA1cTimeFramePicker && (
        <Modal
          visible={showA1cTimeFramePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowA1cTimeFramePicker(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowA1cTimeFramePicker(false)}>
            <Pressable
              style={styles.a1cTimeFramePicker}
              onPress={e => e.stopPropagation()}>
              <Text style={styles.a1cTimeFramePickerTitle}>
                Select Time Frame
              </Text>
              <ScrollView style={styles.a1cTimeFrameOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.a1cTimeFrameOption,
                    a1cTimeFrame === '1w' && styles.a1cTimeFrameOptionActive,
                  ]}
                  onPress={() => {
                    setA1cTimeFrame('1w');
                    setShowA1cTimeFramePicker(false);
                  }}>
                  <Text
                    style={[
                      styles.a1cTimeFrameOptionText,
                      a1cTimeFrame === '1w' &&
                        styles.a1cTimeFrameOptionTextActive,
                    ]}>
                    1 Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.a1cTimeFrameOption,
                    a1cTimeFrame === '1m' && styles.a1cTimeFrameOptionActive,
                  ]}
                  onPress={() => {
                    setA1cTimeFrame('1m');
                    setShowA1cTimeFramePicker(false);
                  }}>
                  <Text
                    style={[
                      styles.a1cTimeFrameOptionText,
                      a1cTimeFrame === '1m' &&
                        styles.a1cTimeFrameOptionTextActive,
                    ]}>
                    1 Month
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.a1cTimeFrameOption,
                    a1cTimeFrame === '2m' && styles.a1cTimeFrameOptionActive,
                  ]}
                  onPress={() => {
                    setA1cTimeFrame('2m');
                    setShowA1cTimeFramePicker(false);
                  }}>
                  <Text
                    style={[
                      styles.a1cTimeFrameOptionText,
                      a1cTimeFrame === '2m' &&
                        styles.a1cTimeFrameOptionTextActive,
                    ]}>
                    2 Months
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.a1cTimeFrameOption,
                    a1cTimeFrame === '3m' && styles.a1cTimeFrameOptionActive,
                  ]}
                  onPress={() => {
                    setA1cTimeFrame('3m');
                    setShowA1cTimeFramePicker(false);
                  }}>
                  <Text
                    style={[
                      styles.a1cTimeFrameOptionText,
                      a1cTimeFrame === '3m' &&
                        styles.a1cTimeFrameOptionTextActive,
                    ]}>
                    3 Months
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.a1cTimeFrameOption,
                    a1cTimeFrame === '6m' && styles.a1cTimeFrameOptionActive,
                  ]}
                  onPress={() => {
                    setA1cTimeFrame('6m');
                    setShowA1cTimeFramePicker(false);
                  }}>
                  <Text
                    style={[
                      styles.a1cTimeFrameOptionText,
                      a1cTimeFrame === '6m' &&
                        styles.a1cTimeFrameOptionTextActive,
                    ]}>
                    6 Months
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.a1cTimeFrameOption,
                    a1cTimeFrame === '1y' && styles.a1cTimeFrameOptionActive,
                  ]}
                  onPress={() => {
                    setA1cTimeFrame('1y');
                    setShowA1cTimeFramePicker(false);
                  }}>
                  <Text
                    style={[
                      styles.a1cTimeFrameOptionText,
                      a1cTimeFrame === '1y' &&
                        styles.a1cTimeFrameOptionTextActive,
                    ]}>
                    1 Year
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create<HomeScreenStyles>({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: -4,
  },
  chartToggles: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 4,
    marginRight: 12,
  },
  chartToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeToggleText: {
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: -2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  chartContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  readingsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  readingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  readingContent: {
    flex: 1,
  },
  readingValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  readingDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  readingSource: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  sortToggle: {
    marginLeft: 8,
    width: 80,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  readingNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    maxHeight: '80%',
    justifyContent: 'space-between',
  },
  popupScrollView: {
    maxHeight: '70%',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  } as TextStyle,
  popupInfo: {
    marginBottom: 12,
  },
  popupLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  popupValue: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 0,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  readingsSection: {
    flex: 1,
    padding: 16,
  },
  readingsList: {
    flex: 1,
  },
  chartContainerLandscape: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  popupContentLandscape: {
    width: '60%',
    maxWidth: 500,
  },
  percentagesContainer: {
    marginTop: 8,
  },
  percentagesTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  percentagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendTitle: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  importProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  importSpinner: {
    marginBottom: 8,
  },
  importProgressText: {
    fontSize: 16,
    color: '#333',
    marginVertical: 4,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  emptyChartContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  chartLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    borderRadius: 16,
    zIndex: 1,
  },
  readingColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  readingInfo: {
    flex: 1,
  },
  readingUnit: {
    fontSize: 14,
    color: '#666',
  },
  readingTime: {
    fontSize: 14,
    color: '#666',
  },
  a1cContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  a1cTimeFrameButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  a1cTimeFrameButtonText: {
    fontSize: 14,
    color: '#666',
  },
  a1cTimeFramePicker: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  a1cTimeFramePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  } as TextStyle,
  a1cTimeFrameOptionsContainer: {
    flex: 1,
  },
  a1cTimeFrameOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  a1cTimeFrameOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  a1cTimeFrameOptionText: {
    fontSize: 14,
    color: '#666',
  },
  a1cTimeFrameOptionTextActive: {
    color: '#fff',
  },
  currentReadingContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  currentReadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  currentReadingContent: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  currentReadingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentReadingTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentReadingSource: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastSyncTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  chartWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
});

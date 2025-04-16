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
} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {HealthService} from '../services/healthService';
import {SettingsService} from '../services/settingsService';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {useFocusEffect} from '@react-navigation/native';
import {BloodGlucoseRanges} from '../services/settingsService';
import AppleHealthKit from 'react-native-health';
import {subDays, subHours} from 'date-fns';
import {Reading} from '../types/Reading';

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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReading, setEditingReading] = useState<BloodGlucose | null>(
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

  const loadReadings = async () => {
    try {
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
    } catch (err) {
      setError('Failed to load readings');
    } finally {
      setIsLoading(false);
    }
  };

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
      setRanges({
        low: savedRanges.low,
        high: savedRanges.high,
        useCustomRanges: savedRanges.useCustomRanges,
        customLow: savedRanges.customLow,
        customHigh: savedRanges.customHigh,
      });
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
  }, []);

  // Load readings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReadings();
    }, []),
  );

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
  }, [ranges]);

  const calculateAverage = useCallback((readings: Reading[]): number => {
    if (readings.length === 0) return 0;
    const sum = readings.reduce(
      (acc: number, reading: Reading) => acc + reading.value,
      0,
    );
    return sum / readings.length;
  }, []);

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
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [readings, sortOrder]);

  const sortReadings = useCallback((a: Reading, b: Reading): number => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  }, []);

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
      .sort(sortReadings);
  }, [timePeriod, sortReadings]);

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

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  };

  const navigateToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const navigateToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

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

  const chartConfig = {
    backgroundColor: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#fff',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid line
    },
    propsForLabels: {
      fontSize: 10,
    },
    fillShadowGradient: '#4CAF50',
    fillShadowGradientOpacity: 0.1,
    yAxisInterval: 1,
    fromZero: false,
    segments: 5,
    yAxisLabel: 'mg/dL',
    yLabelsOffset: 10,
    xLabelsOffset: -10,
    withVerticalLines: false,
    withHorizontalLines: true,
    bezier: true,
    minValue: ranges.low - 20, // Add some padding below the low range
    maxValue: ranges.high + 20, // Add some padding above the high range
    backgroundGradientFrom: '#ff6b6b',
    backgroundGradientTo: '#4CAF50',
    backgroundGradientFromOpacity: 0.2,
    backgroundGradientToOpacity: 0.2,
    backgroundGradientFromOffset: 0,
    backgroundGradientToOffset: 1,
    backgroundGradientFromStop:
      (ranges.high - ranges.low) / (ranges.high + 20 - (ranges.low - 20)),
    backgroundGradientToStop:
      (ranges.high - ranges.low) / (ranges.high + 20 - (ranges.low - 20)),
    width: isLandscape ? width - 32 : 350,
    height: isLandscape ? height - 100 : 220,
  };

  const handleReadingPress = async (reading: BloodGlucose) => {
    setSelectedReading(reading);
    if (reading.sourceName === 'Apple Health') {
      setIsLoadingHealthKitData(true);
      try {
        const options = {
          startDate: new Date(reading.timestamp.getTime() - 1000).toISOString(), // 1 second before
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
  };

  const handleClosePopup = () => {
    setSelectedReading(null);
    setHealthKitData(null);
  };

  const handlePointPress = (data: {
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
  };

  const handleSaveEdit = async () => {
    if (!editingReading) return;

    try {
      await databaseService.updateReading(editingReading);
      await loadReadings();
      setIsEditing(false);
      setEditingReading(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update reading');
    }
  };

  const getReadingColor = (value: number) => {
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
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
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
                      style={styles.sortToggle}
                      onPress={() =>
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      }>
                      <Text style={styles.sortToggleText}>
                        {sortOrder === 'desc' ? 'Newest ↓' : 'Oldest ↑'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.settingsButton}
                      onPress={() => navigation.navigate('Settings')}>
                      <Text style={styles.settingsButtonText}>⚙️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View
              style={[
                styles.chartContainer,
                isLandscape && styles.chartContainerLandscape,
              ]}>
              {isLandscape && (
                <View style={styles.chartNavigationContainer}>
                  <TouchableOpacity
                    style={[
                      styles.navigationButton,
                      !hasPreviousData && styles.navigationButtonDisabled,
                    ]}
                    onPress={navigateToPreviousDay}
                    disabled={!hasPreviousData}>
                    <Text
                      style={[
                        styles.navigationButtonText,
                        !hasPreviousData && styles.navigationButtonTextDisabled,
                      ]}>
                      ←
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.dateLabel}>
                    {formatDateLabel(selectedDate)}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.navigationButton,
                      !hasNextData && styles.navigationButtonDisabled,
                    ]}
                    onPress={navigateToNextDay}
                    disabled={!hasNextData}>
                    <Text
                      style={[
                        styles.navigationButtonText,
                        !hasNextData && styles.navigationButtonTextDisabled,
                      ]}>
                      →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isLoadingChart ? (
                <View style={styles.chartLoadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              ) : chartData.labels.length > 0 ? (
                <LineChart
                  data={chartData}
                  width={chartConfig.width}
                  height={chartConfig.height}
                  chartConfig={chartConfig}
                  getDotColor={(dataPoint, index) => {
                    const value = chartData.datasets[0].data[index];
                    const range = ranges;
                    if (value < range.low) {
                      return '#ff6b6b'; // Red for low
                    } else if (value > range.high) {
                      return '#ff6b6b'; // Red for high
                    }
                    return '#4CAF50'; // Green for normal
                  }}
                  onDataPointClick={handlePointPress}
                  bezier
                  style={styles.chart}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  segments={5}
                  fromZero={false}
                  yAxisInterval={1}
                  yAxisLabel="mg/dL"
                  xLabelsOffset={-10}
                  yLabelsOffset={10}
                />
              ) : (
                <View style={styles.emptyChartContainer}>
                  <Text style={styles.emptyChartText}>
                    No readings for this day
                  </Text>
                </View>
              )}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, {backgroundColor: '#4CAF50'}]}
                  />
                  <Text style={styles.legendText}>Normal</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, {backgroundColor: '#ff6b6b'}]}
                  />
                  <Text style={styles.legendText}>High/Low</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, {backgroundColor: '#808080'}]}
                  />
                  <Text style={styles.legendText}>Average</Text>
                </View>
              </View>
            </View>

            {!isLandscape && (
              <View style={styles.readingsSection}>
                <Text style={styles.sectionTitle}>Recent Readings</Text>
                <ScrollView
                  style={styles.readingsList}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag">
                  {allReadings.length > 0 ? (
                    allReadings.map((reading, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.readingItem,
                          {borderLeftColor: getReadingColor(reading.value)},
                        ]}
                        onPress={() => handleReadingPress(reading)}>
                        <View style={styles.readingContent}>
                          <Text style={styles.readingValue}>
                            {reading.value} mg/dL
                          </Text>
                          <Text style={styles.readingDate}>
                            {reading.timestamp.toLocaleString()}
                          </Text>
                          <Text style={styles.readingSource}>
                            {reading.sourceName}
                            {reading.sourceName === 'Apple Health' &&
                              reading.notes && (
                                <Text style={styles.readingNotes}>
                                  {' '}
                                  ({reading.notes})
                                </Text>
                              )}
                          </Text>
                          {reading.notes &&
                            reading.sourceName !== 'Apple Health' && (
                              <Text
                                style={styles.readingNotes}
                                numberOfLines={1}>
                                {reading.notes}
                              </Text>
                            )}
                        </View>
                      </TouchableOpacity>
                    ))
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
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>
      </Pressable>

      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setIsEditing(false);
          setEditingReading(null);
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setIsEditing(false);
            setEditingReading(null);
          }}>
          <Pressable
            style={styles.editContent}
            onPress={e => e.stopPropagation()}>
            <Text style={styles.editTitle}>Edit Reading</Text>
            <TextInput
              style={styles.editInput}
              value={editingReading?.value.toString()}
              onChangeText={text => {
                const value = parseFloat(text);
                if (!isNaN(value) && editingReading) {
                  setEditingReading({...editingReading, value});
                }
              }}
              keyboardType="numeric"
              placeholder="Value (mg/dL)"
            />
            <TextInput
              style={[styles.editInput, {height: 100}]}
              value={editingReading?.notes || ''}
              onChangeText={text => {
                if (editingReading) {
                  setEditingReading({...editingReading, notes: text});
                }
              }}
              placeholder="Notes (optional)"
              multiline
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEditing(false);
                  setEditingReading(null);
                }}>
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  Keyboard.dismiss();
                  handleSaveEdit();
                }}>
                <Text style={styles.editButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {selectedReading && (
        <View style={styles.popupOverlay}>
          <View
            style={[
              styles.popupContent,
              isLandscape && styles.popupContentLandscape,
            ]}>
            <Text style={styles.popupTitle}>Reading Details</Text>
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
                <Text style={styles.popupValue}>{selectedReading.notes}</Text>
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
                      <Text style={styles.popupValue}>{healthKitData.id}</Text>
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
                        {JSON.stringify(healthKitData.metadata || {}, null, 2)}
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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClosePopup}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontSize: 16,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContent: {
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
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
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
    marginTop: 16,
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
  scrollContent: {
    flexGrow: 1,
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
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  timePeriodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  timePeriodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  timePeriodButtonActive: {
    backgroundColor: '#007AFF',
  },
  timePeriodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timePeriodButtonTextActive: {
    color: '#fff',
  },
  a1cContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  a1cTimeFrameButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  a1cTimeFrameButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  a1cTimeFramePicker: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    maxHeight: '80%',
  },
  a1cTimeFramePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  a1cTimeFrameOptionsContainer: {
    maxHeight: 300, // Set a fixed max height for the scrollable area
  },
  a1cTimeFrameOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  a1cTimeFrameOptionActive: {
    backgroundColor: '#007AFF',
  },
  a1cTimeFrameOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  a1cTimeFrameOptionTextActive: {
    color: '#fff',
  },
  chartNavigationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navigationButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  navigationButtonTextDisabled: {
    color: '#666',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 100,
    textAlign: 'center',
  },
  chartLoadingContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
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
});

import React, {useState, useEffect} from 'react';
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
  FlatList,
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
import AppleHealthKit from '@healthkit/react-native';

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

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [ranges, setRanges] = useState<BloodGlucoseRanges>({
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
    } catch (err) {
      setError('Failed to load readings');
      console.error('Error loading readings:', err);
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
        progress => {
          setImportProgress(progress);
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
      console.error('Error importing readings:', err);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const loadSettings = async () => {
    const savedRanges = await settingsService.getRanges();
    setRanges(savedRanges);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Load readings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReadings();
    }, []),
  );

  const getColorForValue = (value: number): string => {
    if (value < ranges.low) {
      return '#ff6b6b'; // Red for low
    } else if (value > ranges.high) {
      return '#ff6b6b'; // Red for high
    }
    return '#4CAF50'; // Green for normal
  };

  const calculateA1C = (readings: Array<{value: number}>) => {
    if (readings.length === 0) return null;

    // Calculate average blood glucose over the last 3 months
    const averageGlucose =
      readings.reduce((sum, reading) => sum + reading.value, 0) /
      readings.length;

    // Convert average glucose to A1C using the formula: A1C = (average glucose + 46.7) / 28.7
    const a1c = (averageGlucose + 46.7) / 28.7;

    return a1c.toFixed(1);
  };

  const getA1CColor = (a1c: string | null): string => {
    if (a1c === null) return '#666666'; // Gray for N/A

    const a1cNum = parseFloat(a1c);
    if (a1cNum >= 9.0) return '#8B0000'; // Dark red for extremely high
    if (a1cNum >= 6.5) return '#FF0000'; // Red for diabetic
    if (a1cNum >= 5.7) return '#FFA500'; // Orange for pre-diabetic
    return '#4CAF50'; // Green for normal
  };

  const getA1CStatus = (a1c: string | null): string => {
    if (a1c === null) return 'N/A';

    const a1cNum = parseFloat(a1c);
    if (a1cNum >= 9.0) return 'Extremely High';
    if (a1cNum >= 6.5) return 'Diabetic';
    if (a1cNum >= 5.7) return 'Pre-Diabetic';
    return 'Normal';
  };

  const calculateAverage = (readings: Array<{value: number}>) => {
    if (readings.length === 0) return null;
    const sum = readings.reduce((acc, reading) => acc + reading.value, 0);
    return (sum / readings.length).toFixed(0);
  };

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

  const allReadings = [...readings].sort((a, b) => {
    const dateA = a.timestamp.getTime();
    const dateB = b.timestamp.getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const chartData = {
    labels: allReadings.map(() => ''), // Empty labels to remove dates
    datasets: [
      {
        data: allReadings.map(r => r.value),
        strokeWidth: 2,
      },
      {
        data: allReadings.map(() => {
          const avg = calculateAverage(allReadings);
          return avg ? parseFloat(avg) : 0;
        }),
        strokeWidth: 1,
        color: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
        withDots: false,
      },
    ],
  };

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

  const handleEditReading = async (reading: BloodGlucose) => {
    if (reading.sourceName !== 'Manual Entry') {
      Alert.alert('Error', 'Only manual entries can be edited');
      return;
    }
    setEditingReading(reading);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingReading) return;

    try {
      await databaseService.updateReading(editingReading);
      await loadReadings();
      setIsEditing(false);
      setEditingReading(null);
    } catch (error) {
      console.error('Error updating reading:', error);
      Alert.alert('Error', 'Failed to update reading');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingReading(null);
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
                console.error('Error getting HealthKit data:', error);
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
        console.error('Error fetching HealthKit data:', error);
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
                  <Text style={styles.title}>
                    A1C:{' '}
                    <Text
                      style={{color: getA1CColor(calculateA1C(allReadings))}}>
                      {calculateA1C(allReadings) || 'N/A'}%
                    </Text>{' '}
                    <Text
                      style={[
                        styles.subtitle,
                        {color: getA1CColor(calculateA1C(allReadings))},
                      ]}>
                      ({getA1CStatus(calculateA1C(allReadings))})
                    </Text>
                  </Text>
                  <Text style={styles.subtitle}>
                    Average:{' '}
                    <Text
                      style={{
                        color: getColorForValue(
                          parseInt(calculateAverage(allReadings) || '0'),
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
              {allReadings.length > 0 ? (
                <LineChart
                  data={chartData}
                  width={chartConfig.width}
                  height={chartConfig.height}
                  chartConfig={chartConfig}
                  getDotColor={(dataPoint, index) => {
                    const value = allReadings[index].value;
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
                    No readings to display
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
                          {borderLeftColor: getColorForValue(reading.value)},
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
          handleCancelEdit();
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            handleCancelEdit();
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
                  handleCancelEdit();
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
                  {color: getColorForValue(selectedReading.value)},
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

      <View style={styles.footer}>
        <Button
          title="Import from Health"
          onPress={handleImportFromHealth}
          disabled={isImporting}
        />
      </View>
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
});

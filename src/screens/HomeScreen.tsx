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
  const [readings, setReadings] = useState<{
    healthKit: BloodGlucose[];
    googleFit: BloodGlucose[];
    database: BloodGlucose[];
  }>({
    healthKit: [],
    googleFit: [],
    database: [],
  });
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

  const loadReadings = async () => {
    setIsLoading(true);
    try {
      // Get readings from the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [healthKitReadings, googleFitReadings, databaseReadings] =
        await Promise.all([
          healthService.getBloodGlucoseFromHealthKit(startDate, endDate),
          healthService.getBloodGlucoseFromGoogleFit(startDate, endDate),
          databaseService.getAllReadings(),
        ]);

      console.log('Database readings:', databaseReadings);
      console.log('HealthKit readings:', healthKitReadings);
      console.log('Google Fit readings:', googleFitReadings);

      // Format database readings to ensure date is a string
      const formattedDatabaseReadings = databaseReadings.map(
        (reading: BloodGlucose) => ({
          ...reading,
          sourceName: reading.sourceName || 'Manual Entry',
        }),
      );

      console.log('Formatted database readings:', formattedDatabaseReadings);

      // Format HealthKit readings to match the expected format and convert from mmol/L to mg/dL
      const formattedHealthKitReadings = healthKitReadings.map(reading => ({
        id: `healthkit-${reading.startDate}-${reading.value}`,
        value: Math.round(reading.value * 18.0182), // Convert mmol/L to mg/dL
        unit: 'mg/dL' as const,
        timestamp: new Date(reading.startDate),
        sourceName: 'HealthKit',
        notes: undefined,
      }));

      // Format Google Fit readings
      const formattedGoogleFitReadings = googleFitReadings.map(reading => ({
        id: `googlefit-${reading.date}-${reading.value}`,
        value: reading.value,
        unit: 'mg/dL' as const,
        timestamp: new Date(reading.date),
        sourceName: 'Google Fit',
        notes: undefined,
      }));

      setReadings({
        healthKit: formattedHealthKitReadings,
        googleFit: formattedGoogleFitReadings,
        database: formattedDatabaseReadings,
      });

      console.log('All readings:', [
        ...formattedHealthKitReadings,
        ...formattedGoogleFitReadings,
        ...formattedDatabaseReadings,
      ]);
    } catch (error) {
      console.error('Error loading readings:', error);
      Alert.alert('Error', 'Failed to load readings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    const savedRanges = await settingsService.getRanges();
    setRanges(savedRanges);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Add effect to reload settings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      loadReadings();
    }, []),
  );

  const handleAddReading = async (data: Omit<BloodGlucose, 'id'>) => {
    try {
      const newReading: BloodGlucose = {
        ...data,
        id: Date.now().toString(),
        timestamp: new Date(),
        sourceName: 'Manual Entry',
      };

      // Save to database
      await databaseService.addReading(newReading);

      // Try to save to HealthKit (only on iOS)
      if (Platform.OS === 'ios') {
        try {
          await healthService.saveBloodGlucoseToHealthKit(
            newReading.value,
            newReading.timestamp,
          );
        } catch (healthKitError) {
          console.error('Failed to save to HealthKit:', healthKitError);
          // Don't throw the error, just log it, as the reading is saved in our database
        }
      }

      await loadReadings(); // Refresh readings after adding
    } catch (error) {
      console.error('Error adding reading:', error);
      Alert.alert('Error', 'Failed to save reading');
    }
  };

  const handleDeleteReading = async (
    id: string,
    value: number,
    timestamp: Date,
  ) => {
    Alert.alert(
      'Delete Reading',
      `Are you sure you want to delete the reading of ${value} mg/dL from ${timestamp.toLocaleString()}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteReading(id);
              await loadReadings(); // Refresh readings after deleting
            } catch (error) {
              console.error('Error deleting reading:', error);
              Alert.alert('Error', 'Failed to delete reading');
            }
          },
        },
      ],
    );
  };

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

  const allReadings = [
    ...readings.healthKit,
    ...readings.googleFit,
    ...readings.database,
  ].sort((a, b) => {
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

  const handleReadingPress = (reading: BloodGlucose) => {
    setSelectedReading(reading);
  };

  const handleClosePopup = () => {
    setSelectedReading(null);
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
                </View>
                <View style={styles.headerRight}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.sortToggle}
                      onPress={() =>
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      }>
                      <Text style={styles.sortToggleText}>
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() =>
                        navigation.navigate('Add', {onSave: handleAddReading})
                      }>
                      <Text style={styles.addButtonText}>+</Text>
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
                          </Text>
                          {reading.notes && (
                            <Text style={styles.readingNotes} numberOfLines={1}>
                              {reading.notes}
                            </Text>
                          )}
                        </View>
                        {reading.sourceName === 'Manual Entry' && (
                          <View style={styles.readingActions}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleEditReading(reading)}>
                              <Text style={styles.editButtonText}>✎</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() =>
                                handleDeleteReading(
                                  reading.id,
                                  reading.value,
                                  reading.timestamp,
                                )
                              }>
                              <Text style={styles.deleteButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No readings available
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        Add a reading or sync with HealthKit/Google Fit
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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClosePopup}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    marginRight: 8,
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
    width: 40,
  },
  sortToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  readingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});

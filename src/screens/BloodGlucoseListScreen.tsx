import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {SettingsService} from '../services/settingsService';
import {format} from 'date-fns';

type RootStackParamList = {
  List: {
    onDelete: (id: string) => void;
  };
  Add: undefined;
  Charts: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

const databaseService = DatabaseService.getInstance();
const settingsService = SettingsService.getInstance();

type FilterType = 'all' | 'low' | 'normal' | 'high';

export const BloodGlucoseListScreen: React.FC<Props> = ({navigation}) => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState<BloodGlucose | null>(
    null,
  );
  const [showHealthKitModal, setShowHealthKitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranges, setRanges] = useState({low: 70, high: 180});
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const loadRanges = async () => {
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
  };

  const loadReadings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const savedReadings = await databaseService.getAllReadings();
      setReadings(savedReadings);
      setFilteredReadings(savedReadings);
    } catch (error) {
      console.error('Error loading readings:', error);
      setError('Failed to load readings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await loadRanges();
        await loadReadings();
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Subscribe to navigation focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isLoading) {
        loadReadings();
      }
    });

    return unsubscribe;
  }, [navigation, isLoading]);

  // Subscribe to range changes
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(newRanges => {
      setRanges(newRanges);
    });
    return () => unsubscribe();
  }, []);

  const getReadingStatus = (value: number): 'low' | 'normal' | 'high' => {
    if (value < ranges.low) return 'low';
    if (value > ranges.high) return 'high';
    return 'normal';
  };

  const getReadingColor = (value: number): string => {
    const status = getReadingStatus(value);
    switch (status) {
      case 'low':
        return '#007AFF'; // Blue for low
      case 'high':
        return '#FF3B30'; // Red for high
      default:
        return '#4CAF50'; // Green for normal
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter === 'all') {
      setFilteredReadings(readings);
    } else {
      const filtered = readings.filter(reading => {
        const status = getReadingStatus(reading.value);
        return status === filter;
      });
      setFilteredReadings(filtered);
    }
  };

  const handleReadingPress = (reading: BloodGlucose) => {
    setSelectedReading(reading);
    if (reading.sourceName === 'Apple Health' || reading.healthKitId) {
      setShowHealthKitModal(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading readings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReadings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange('all')}>
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'all' && styles.filterButtonTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'low' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange('low')}>
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'low' && styles.filterButtonTextActive,
            ]}>
            Low
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'normal' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange('normal')}>
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'normal' && styles.filterButtonTextActive,
            ]}>
            In Range
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'high' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange('high')}>
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'high' && styles.filterButtonTextActive,
            ]}>
            High
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
        </View>
      ) : filteredReadings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeFilter === 'all'
              ? 'No readings found'
              : `No ${activeFilter} readings found`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReadings}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.readingItem,
                {borderLeftColor: getReadingColor(item.value)},
              ]}
              onPress={() => handleReadingPress(item)}>
              <View style={styles.readingInfo}>
                <Text
                  style={[
                    styles.readingValue,
                    {color: getReadingColor(item.value)},
                  ]}>
                  {item.value} mg/dL
                </Text>
                <View style={styles.readingDetails}>
                  <Text style={styles.readingDate}>
                    {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                  </Text>
                  <Text style={styles.readingSource}>{item.sourceName}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        visible={showHealthKitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHealthKitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>HealthKit Data</Text>
            {selectedReading && (
              <>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Value:</Text>
                  <Text
                    style={[
                      styles.modalValue,
                      {color: getReadingColor(selectedReading.value)},
                    ]}>
                    {selectedReading.value} mg/dL
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Date:</Text>
                  <Text style={styles.modalValue}>
                    {format(selectedReading.timestamp, 'MMM d, yyyy h:mm a')}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Source:</Text>
                  <Text style={styles.modalValue}>
                    {selectedReading.sourceName}
                  </Text>
                </View>
                {selectedReading.notes && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Notes:</Text>
                    <Text style={styles.modalValue}>
                      {selectedReading.notes}
                    </Text>
                  </View>
                )}
                {selectedReading.healthKitId && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>HealthKit ID:</Text>
                    <Text style={styles.modalValue}>
                      {selectedReading.healthKitId}
                    </Text>
                  </View>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowHealthKitModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readingInfo: {
    flex: 1,
  },
  readingValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  readingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  readingDate: {
    fontSize: 14,
    color: '#666',
  },
  readingSource: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  modalButton: {
    backgroundColor: '#5856D6',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});

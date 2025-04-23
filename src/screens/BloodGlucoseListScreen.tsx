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

export const BloodGlucoseListScreen: React.FC<Props> = ({navigation}) => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState<BloodGlucose | null>(
    null,
  );
  const [showHealthKitModal, setShowHealthKitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUniqueDays = (readings: BloodGlucose[]) => {
    const uniqueDates = new Set(
      readings.map(reading =>
        format(new Date(reading.timestamp), 'yyyy-MM-dd'),
      ),
    );
    return uniqueDates.size;
  };

  const loadReadings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const savedReadings = await databaseService.getAllReadings();
      setReadings(savedReadings);
    } catch (error) {
      console.error('Error loading readings:', error);
      setError('Failed to load readings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadReadings();
    });

    return unsubscribe;
  }, [navigation]);

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
      <View style={styles.header}>
        <Text style={styles.title}>Blood Glucose History</Text>
        {!isLoading && readings.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Readings</Text>
              <Text style={styles.summaryValue}>{readings.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Days Recorded</Text>
              <Text style={styles.summaryValue}>{getUniqueDays(readings)}</Text>
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
        </View>
      ) : readings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No readings found</Text>
        </View>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.readingItem}
              onPress={() => handleReadingPress(item)}>
              <View style={styles.readingInfo}>
                <Text style={styles.readingValue}>{item.value} mg/dL</Text>
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
                  <Text style={styles.modalValue}>
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
    color: '#333',
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
});

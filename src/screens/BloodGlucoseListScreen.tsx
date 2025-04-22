import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {HealthService} from '../services/healthService';
import {format} from 'date-fns';

type RootStackParamList = {
  List: {
    onDelete: (id: string) => void;
  };
  Add: undefined;
  Charts: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

const databaseService = new DatabaseService();
const healthService = HealthService.getInstance();

export const BloodGlucoseListScreen: React.FC<Props> = ({navigation}) => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
    // console.log({AppleHealthKit});
    const unsubscribe = navigation.addListener('focus', () => {
      loadReadings();
    });

    return unsubscribe;
  }, [navigation]);

  const handleDelete = async (id: string) => {
    try {
      await databaseService.deleteReading(id);
      await loadReadings();
    } catch (error) {
      console.error('Error deleting reading:', error);
    }
  };

  const handleImportFromHealth = async () => {
    try {
      setIsImporting(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Get last 3 months of data

      console.tron.log('Starting health data import', {startDate, endDate});

      const {healthKit, googleFit} =
        await healthService.getAllBloodGlucoseReadings(startDate, endDate);

      console.tron.log('Retrieved health data', {
        healthKitCount: healthKit.length,
        googleFitCount: googleFit.length,
      });

      // Get existing readings from our database
      const existingReadings = await databaseService.getAllReadings();

      console.tron.log('Existing readings count', existingReadings.length);

      // Create a map of existing readings for quick lookup
      // Use a 5-minute window to account for slight time differences
      const existingReadingsMap = new Map(
        existingReadings.map(reading => [
          `${Math.floor(reading.timestamp.getTime() / (5 * 60 * 1000))}_${
            reading.value
          }`,
          reading,
        ]),
      );

      let importedCount = 0;
      let duplicateCount = 0;
      let skippedAppOriginalsCount = 0;

      // Process HealthKit readings
      for (const reading of healthKit) {
        const readingTime = new Date(reading.startDate).getTime();
        const timeWindow = Math.floor(readingTime / (5 * 60 * 1000));
        const readingKey = `${timeWindow}_${reading.value}`;

        // Check if this reading already exists in our database
        const existingReading = existingReadingsMap.get(readingKey);

        if (existingReading) {
          // If the reading exists and was originally from our app, skip it
          if (
            existingReading.sourceName === 'App' ||
            existingReading.sourceName === 'Manual Entry' ||
            existingReading.sourceName === 'Manual'
          ) {
            skippedAppOriginalsCount++;
            continue;
          }
          duplicateCount++;
          continue;
        }

        // Only import if we don't already have this reading
        await databaseService.addReading({
          value: reading.value,
          unit: 'mg/dL',
          timestamp: new Date(reading.startDate),
          sourceName: 'Apple Health',
          notes: 'Imported from Apple Health',
        });
        importedCount++;
      }

      // Process Google Fit readings
      for (const reading of googleFit) {
        const readingTime = new Date(reading.date).getTime();
        const timeWindow = Math.floor(readingTime / (5 * 60 * 1000));
        const readingKey = `${timeWindow}_${reading.value}`;

        // Check if this reading already exists in our database
        const existingReading = existingReadingsMap.get(readingKey);

        if (existingReading) {
          // If the reading exists and was originally from our app, skip it
          if (
            existingReading.sourceName === 'App' ||
            existingReading.sourceName === 'Manual Entry' ||
            existingReading.sourceName === 'Manual'
          ) {
            skippedAppOriginalsCount++;
            continue;
          }
          duplicateCount++;
          continue;
        }

        // Only import if we don't already have this reading
        await databaseService.addReading({
          value: reading.value,
          unit: 'mg/dL',
          timestamp: new Date(reading.date),
          sourceName: reading.sourceName || 'Google Fit',
          notes: `Imported from ${reading.sourceName || 'Google Fit'}`,
        });
        importedCount++;
      }

      console.tron.log('Import complete', {
        importedCount,
        duplicateCount,
        skippedAppOriginalsCount,
        totalProcessed: healthKit.length + googleFit.length,
      });

      await loadReadings();
      Alert.alert(
        'Import Complete',
        `Successfully imported ${importedCount} new readings\n${duplicateCount} duplicates were skipped\n${skippedAppOriginalsCount} app-originated readings were skipped`,
      );
    } catch (error) {
      console.tron.error('Error importing health data:', error);
      console.error('Error importing health data:', error);
      Alert.alert(
        'Import Failed',
        'Failed to import health data. Please try again.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  const getUniqueDays = (readings: BloodGlucose[]) => {
    const uniqueDates = new Set(
      readings.map(reading =>
        format(new Date(reading.timestamp), 'yyyy-MM-dd'),
      ),
    );
    return uniqueDates.size;
  };

  const getAverageReadingsPerDay = (readings: BloodGlucose[]) => {
    const uniqueDays = getUniqueDays(readings);
    if (uniqueDays === 0) return 0;
    return (readings.length / uniqueDays).toFixed(1);
  };

  const renderItem = ({item}: {item: BloodGlucose}) => (
    <View style={styles.readingItem}>
      <View style={styles.readingInfo}>
        <Text style={styles.readingValue}>
          {item.value} {item.unit}
        </Text>
        <Text style={styles.readingDate}>
          {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

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
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Days</Text>
          <Text style={styles.statValue}>{getUniqueDays(readings)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Readings</Text>
          <Text style={styles.statValue}>{readings.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg/Day</Text>
          <Text style={styles.statValue}>
            {getAverageReadingsPerDay(readings)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.importButton}
        onPress={handleImportFromHealth}
        disabled={isImporting}>
        {isImporting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.importButtonText}>Import from Health</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={readings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No readings yet</Text>
        }
      />
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
  importButton: {
    backgroundColor: '#5856D6',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
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
  readingDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
});

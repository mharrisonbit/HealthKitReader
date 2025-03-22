import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';

type RootStackParamList = {
  List: {
    onDelete: (id: string) => void;
  };
  Add: undefined;
  Charts: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

const databaseService = new DatabaseService();

export const BloodGlucoseListScreen: React.FC<Props> = ({navigation}) => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    try {
      await databaseService.deleteReading(id);
      await loadReadings();
    } catch (error) {
      console.error('Error deleting reading:', error);
    }
  };

  const renderItem = ({item}: {item: BloodGlucose}) => (
    <View style={styles.readingItem}>
      <View style={styles.readingInfo}>
        <Text style={styles.readingValue}>
          {item.value} {item.unit}
        </Text>
        <Text style={styles.readingDate}>
          {new Date(item.timestamp).toLocaleString()}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Add')}>
          <Text style={styles.addButtonText}>Add Reading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chartButton}
          onPress={() => navigation.navigate('Charts')}>
          <Text style={styles.chartButtonText}>View Charts</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chartButtonText: {
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
});

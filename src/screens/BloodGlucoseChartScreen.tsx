import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {LineChart, BarChart} from 'react-native-chart-kit';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';

type RootStackParamList = {
  List: {
    onDelete: (id: string) => void;
  };
  Add: {
    onSave: (data: Omit<BloodGlucose, 'id'>) => void;
  };
  Charts: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Charts'>;

const databaseService = new DatabaseService();
const screenWidth = Dimensions.get('window').width;

export const BloodGlucoseChartScreen: React.FC<Props> = () => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

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
    loadReadings();
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const chartData = {
    labels: readings.map(reading => formatDate(reading.timestamp)),
    datasets: [
      {
        data: readings.map(reading => reading.value),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chart data...</Text>
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

  if (readings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No readings to display</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.chartTypeContainer}>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            chartType === 'line' && styles.chartTypeButtonActive,
          ]}
          onPress={() => setChartType('line')}>
          <Text
            style={[
              styles.chartTypeButtonText,
              chartType === 'line' && styles.chartTypeButtonTextActive,
            ]}>
            Line Chart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            chartType === 'bar' && styles.chartTypeButtonActive,
          ]}
          onPress={() => setChartType('bar')}>
          <Text
            style={[
              styles.chartTypeButtonText,
              chartType === 'bar' && styles.chartTypeButtonTextActive,
            ]}>
            Bar Chart
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartContainer}>
        {chartType === 'line' ? (
          <LineChart
            data={chartData}
            width={screenWidth - 20}
            height={300}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix={` ${readings[0]?.unit || ''}`}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            withDots={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            segments={5}
            fromZero
          />
        ) : (
          <BarChart
            data={chartData}
            width={screenWidth - 20}
            height={300}
            chartConfig={chartConfig}
            style={styles.chart}
            showBarTops={false}
            fromZero
            yAxisLabel=""
            yAxisSuffix={` ${readings[0]?.unit || ''}`}
            withInnerLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            segments={5}
          />
        )}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Average:</Text>
          <Text style={styles.statsValue}>
            {(
              readings.reduce((sum, reading) => sum + reading.value, 0) /
              readings.length
            ).toFixed(1)}{' '}
            {readings[0]?.unit}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>A1C (Estimated):</Text>
          <Text style={styles.statsValue}>
            {(
              (readings.reduce((sum, reading) => sum + reading.value, 0) /
                readings.length +
                46.7) /
              28.7
            ).toFixed(1)}
            %
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Highest:</Text>
          <Text style={styles.statsValue}>
            {Math.max(...readings.map(r => r.value))} {readings[0]?.unit}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Lowest:</Text>
          <Text style={styles.statsValue}>
            {Math.min(...readings.map(r => r.value))} {readings[0]?.unit}
          </Text>
        </View>
      </View>
    </ScrollView>
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
  chartTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  chartTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  chartTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  chartTypeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  chartTypeButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    margin: 20,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 16,
    color: '#666',
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  },
});

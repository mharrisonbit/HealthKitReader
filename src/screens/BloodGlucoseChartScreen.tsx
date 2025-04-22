import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {BloodGlucose} from '../types/BloodGlucose';
import {DatabaseService} from '../services/database';
import {format} from 'date-fns';

const databaseService = new DatabaseService();
const screenWidth = Dimensions.get('window').width;

const TIME_RANGES = [
  {label: '1 Hour', value: 1},
  {label: '3 Hours', value: 3},
  {label: '6 Hours', value: 6},
  {label: '12 Hours', value: 12},
];

export const BloodGlucoseChartScreen: React.FC = () => {
  const [readings, setReadings] = useState<BloodGlucose[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(6); // Default to 6 hours
  const hasLoadedRef = useRef(false);

  const loadReadings = async () => {
    if (hasLoadedRef.current) {
      console.log('Data already loaded, skipping load');
      return;
    }

    try {
      console.log('Starting to load readings...');
      setError(null);
      const savedReadings = await databaseService.getAllReadings();
      console.log('Successfully loaded readings:', savedReadings.length);
      setReadings(savedReadings);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading readings:', error);
      setError('Failed to load readings. Please try again.');
    }
  };

  useEffect(() => {
    loadReadings();
  }, []);

  const getFilteredReadings = () => {
    const now = new Date();
    const startTime = new Date(
      now.getTime() - selectedTimeRange * 60 * 60 * 1000,
    );
    return readings
      .filter(reading => reading.timestamp >= startTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const filteredReadings = getFilteredReadings();

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

  const chartData = {
    labels:
      filteredReadings.length > 0
        ? [
            formatTime(filteredReadings[0].timestamp),
            ...Array(filteredReadings.length - 2).fill(''),
            formatTime(filteredReadings[filteredReadings.length - 1].timestamp),
          ]
        : [],
    datasets: [
      {
        data: filteredReadings.map(reading => reading.value),
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
      fontSize: 10,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timeRangeContainer}>
        {TIME_RANGES.map(range => (
          <TouchableOpacity
            key={range.value}
            style={[
              styles.timeRangeButton,
              selectedTimeRange === range.value && styles.timeRangeButtonActive,
            ]}
            onPress={() => setSelectedTimeRange(range.value)}>
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

      <View style={styles.chartContainer}>
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
          fromZero={false}
        />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Average:</Text>
          <Text style={styles.statsValue}>
            {filteredReadings.length > 0
              ? `${(
                  filteredReadings.reduce(
                    (sum, reading) => sum + reading.value,
                    0,
                  ) / filteredReadings.length
                ).toFixed(1)} ${readings[0]?.unit}`
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Highest:</Text>
          <Text style={styles.statsValue}>
            {filteredReadings.length > 0
              ? `${Math.max(...filteredReadings.map(r => r.value))} ${
                  readings[0]?.unit
                }`
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Lowest:</Text>
          <Text style={styles.statsValue}>
            {filteredReadings.length > 0
              ? `${Math.min(...filteredReadings.map(r => r.value))} ${
                  readings[0]?.unit
                }`
              : 'N/A'}
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
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  timeRangeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  timeRangeButtonTextActive: {
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

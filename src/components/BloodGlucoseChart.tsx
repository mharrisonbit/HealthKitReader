import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {LoadingIndicator} from './LoadingIndicator';

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    strokeWidth: number;
    color?: (opacity: number) => string;
    withDots?: boolean;
  }>;
}

interface BloodGlucoseChartProps {
  data: ChartData;
  isLoading: boolean;
  ranges: {
    low: number;
    high: number;
  };
  onPointPress?: (data: any) => void;
  style?: ViewStyle;
}

export const BloodGlucoseChart: React.FC<BloodGlucoseChartProps> = ({
  data,
  isLoading,
  ranges,
  onPointPress,
  style,
}) => {
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
      strokeDasharray: '',
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
    minValue: ranges.low - 20,
    maxValue: ranges.high + 20,
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
  };

  return (
    <View style={[styles.container, style]}>
      {isLoading ? (
        <LoadingIndicator size="small" />
      ) : data.labels.length > 0 ? (
        <LineChart
          data={data}
          width={350}
          height={220}
          chartConfig={chartConfig}
          getDotColor={(dataPoint, index) => {
            const value = data.datasets[0].data[index];
            if (value < ranges.low) {
              return '#ff6b6b';
            } else if (value > ranges.high) {
              return '#ff6b6b';
            }
            return '#4CAF50';
          }}
          onDataPointClick={onPointPress}
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
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No readings for this time period</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

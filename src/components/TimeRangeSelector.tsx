import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface TimeRangeOption {
  label: string;
  value: string;
}

interface TimeRangeSelectorProps {
  options: TimeRangeOption[];
  selectedValue: number;
  onSelect: (value: string) => void;
  style?: ViewStyle;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  options,
  selectedValue,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.option,
            selectedValue === parseInt(option.value, 10) &&
              styles.optionSelected,
          ]}
          onPress={() => onSelect(option.value)}>
          <Text
            style={[
              styles.optionText,
              selectedValue === parseInt(option.value, 10) &&
                styles.optionTextSelected,
            ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 12,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
  },
});

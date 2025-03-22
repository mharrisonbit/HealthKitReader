import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BloodGlucose} from '../types/BloodGlucose';

type RootStackParamList = {
  List: {
    readings: BloodGlucose[];
    onDelete: (id: string) => void;
  };
  Add: {
    onSave: (data: Omit<BloodGlucose, 'id'>) => void;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Add'>;

export const AddBloodGlucoseScreen: React.FC<Props> = ({route, navigation}) => {
  const {onSave} = route.params;
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<'mg/dL' | 'mmol/L'>('mg/dL');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    onSave({
      value: numericValue,
      unit,
      timestamp: new Date(),
      notes,
    });

    // Reset form and go back
    setValue('');
    setNotes('');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Blood Glucose Reading</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Value</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholder="Enter blood glucose value"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Unit</Text>
        <View style={styles.unitContainer}>
          <TouchableOpacity
            style={[styles.unitButton, unit === 'mg/dL' && styles.selectedUnit]}
            onPress={() => setUnit('mg/dL')}>
            <Text
              style={[
                styles.unitText,
                unit === 'mg/dL' && styles.selectedUnitText,
              ]}>
              mg/dL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitButton,
              unit === 'mmol/L' && styles.selectedUnit,
            ]}
            onPress={() => setUnit('mmol/L')}>
            <Text
              style={[
                styles.unitText,
                unit === 'mmol/L' && styles.selectedUnitText,
              ]}>
              mmol/L
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes"
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Reading</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  unitButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedUnit: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unitText: {
    fontSize: 16,
    color: '#333',
  },
  selectedUnitText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Platform,
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

    const bloodGlucose: Omit<BloodGlucose, 'id'> = {
      value: Number(value),
      unit,
      timestamp: new Date(),
      notes,
      sourceName: 'Manual Entry',
    };

    onSave(bloodGlucose);

    // Reset form and go back
    setValue('');
    setNotes('');
    navigation.goBack();
  };

  const handleCancel = () => {
    // Reset form and go back
    setValue('');
    setNotes('');
    navigation.goBack();
  };

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
            <Text style={styles.title}>Add Blood Glucose Reading</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Value (mg/dL)</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                keyboardType="numeric"
                placeholder="Enter value"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unit === 'mg/dL' && styles.selectedUnit,
                  ]}
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    padding: 10,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
  },
});

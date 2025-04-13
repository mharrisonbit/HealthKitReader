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
import {RootStackParamList} from '../../App';
import {HealthService} from '../services/healthService';

type Props = NativeStackScreenProps<RootStackParamList, 'Add'>;

const healthService = HealthService.getInstance();

export const AddBloodGlucoseScreen: React.FC<Props> = ({navigation}) => {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!value) {
      Alert.alert('Error', 'Please enter a blood glucose value');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    try {
      setIsSaving(true);

      // Save to HealthKit
      await healthService.saveBloodGlucoseToHealthKit(numericValue, new Date());

      Alert.alert('Success', 'Blood glucose reading saved successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving reading:', error);
      Alert.alert('Error', 'Failed to save reading. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <Pressable style={styles.container} onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <Text style={styles.label}>Blood Glucose (mg/dL)</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="Enter value"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}>
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Save Reading'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

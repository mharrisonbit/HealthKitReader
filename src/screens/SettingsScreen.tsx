import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {SettingsService} from '../services/settingsService';
import {HealthService} from '../services/healthService';
import {BloodGlucoseRanges} from '../types/BloodGlucoseRanges';
import {DatabaseService} from '../services/database';
import {BloodGlucose} from '../types/BloodGlucose';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const settingsService = SettingsService.getInstance();
const healthService = HealthService.getInstance();
const databaseService = new DatabaseService();

export const SettingsScreen: React.FC<Props> = ({navigation}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [useCustomRanges, setUseCustomRanges] = useState(false);
  const [ranges, setRanges] = useState<BloodGlucoseRanges>({
    low: 70,
    high: 180,
    useCustomRanges: false,
  });
  const [tempRanges, setTempRanges] = useState<BloodGlucoseRanges>({
    low: 70,
    high: 180,
    useCustomRanges: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedRanges = await settingsService.getRanges();
      setRanges(savedRanges);
      setTempRanges(savedRanges);
      setUseCustomRanges(savedRanges.useCustomRanges);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = (field: 'low' | 'high', value: string) => {
    setTempRanges(prev => ({
      ...prev,
      [field]: value === '' ? '' : parseInt(value),
    }));
  };

  const handleCustomRangesToggle = async (value: boolean) => {
    setUseCustomRanges(value);
    const newRanges = {
      ...ranges,
      useCustomRanges: value,
    };
    await settingsService.setRanges(newRanges);
    setRanges(newRanges);
    setTempRanges(newRanges);
  };

  const handleSaveRanges = async () => {
    if (tempRanges.low === '' || tempRanges.high === '') {
      Alert.alert('Error', 'Please enter both low and high range values');
      return;
    }

    const low =
      typeof tempRanges.low === 'string'
        ? parseInt(tempRanges.low)
        : tempRanges.low;
    const high =
      typeof tempRanges.high === 'string'
        ? parseInt(tempRanges.high)
        : tempRanges.high;

    if (isNaN(low) || isNaN(high)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    if (low >= high) {
      Alert.alert('Error', 'Low range must be less than high range');
      return;
    }

    const newRanges = {
      ...tempRanges,
      low,
      high,
      useCustomRanges: true,
    };

    try {
      await settingsService.setRanges(newRanges);
      setRanges(newRanges);
      setTempRanges(newRanges);
      Alert.alert('Success', 'Ranges saved successfully');
    } catch (error) {
      console.error('Error saving ranges:', error);
      Alert.alert('Error', 'Failed to save ranges');
    }
  };

  const handleImportFromHealthKit = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'HealthKit is only available on iOS');
      return;
    }

    setIsImporting(true);
    try {
      // Get readings from the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [healthKitReadings, existingReadings] = await Promise.all([
        healthService.getBloodGlucoseFromHealthKit(startDate, endDate),
        databaseService.getAllReadings(),
      ]);

      if (healthKitReadings.length === 0) {
        Alert.alert('Info', 'No readings found in HealthKit');
        return;
      }

      // Create a set of existing reading timestamps for quick lookup
      const existingTimestamps = new Set(
        existingReadings.map(reading => reading.timestamp.getTime()),
      );

      // Filter out readings that already exist in the database
      const newReadings = healthKitReadings.filter(
        reading =>
          !existingTimestamps.has(new Date(reading.startDate).getTime()),
      );

      if (newReadings.length === 0) {
        Alert.alert('Info', 'No new readings to import from HealthKit');
        return;
      }

      // Convert and save only the new readings
      for (const reading of newReadings) {
        const bloodGlucose: BloodGlucose = {
          id: `healthkit-${reading.startDate}-${reading.value}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          value: reading.value,
          unit: 'mg/dL',
          timestamp: new Date(reading.startDate),
        };
        await databaseService.addReading(bloodGlucose);
      }

      Alert.alert(
        'Success',
        `Imported ${newReadings.length} new readings from HealthKit`,
      );
    } catch (error) {
      console.error('Error importing from HealthKit:', error);
      Alert.alert('Error', 'Failed to import readings from HealthKit');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    // Show warning dialog
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all blood glucose readings from the app. This action cannot be undone. Are you sure you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteAllReadings();
              Alert.alert('Success', 'All data has been deleted successfully.');
            } catch (error) {
              console.error('Error deleting all data:', error);
              Alert.alert(
                'Error',
                'Failed to delete all data. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

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
            {Platform.OS === 'ios' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Import Data</Text>
                <TouchableOpacity
                  style={[styles.button, isImporting && styles.buttonDisabled]}
                  onPress={handleImportFromHealthKit}
                  disabled={isImporting}>
                  <Text style={styles.buttonText}>
                    {isImporting ? 'Importing...' : 'Import from HealthKit'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Blood Glucose Ranges</Text>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Use Custom Ranges</Text>
                <Switch
                  value={useCustomRanges}
                  onValueChange={handleCustomRangesToggle}
                />
              </View>

              {useCustomRanges && (
                <>
                  <View style={styles.rangeInputs}>
                    <View style={styles.rangeInput}>
                      <Text style={styles.rangeLabel}>Low Range (mg/dL)</Text>
                      <TextInput
                        style={styles.input}
                        value={tempRanges.low?.toString() || ''}
                        onChangeText={value => handleRangeChange('low', value)}
                        keyboardType="numeric"
                        placeholder="Enter low range"
                      />
                    </View>
                    <View style={styles.rangeInput}>
                      <Text style={styles.rangeLabel}>High Range (mg/dL)</Text>
                      <TextInput
                        style={styles.input}
                        value={tempRanges.high?.toString() || ''}
                        onChangeText={value => handleRangeChange('high', value)}
                        keyboardType="numeric"
                        placeholder="Enter high range"
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveRanges}>
                    <Text style={styles.saveButtonText}>Save Ranges</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAllData}>
                <Text style={styles.deleteButtonText}>Delete All Data</Text>
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  rangeInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rangeInput: {
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  rangeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

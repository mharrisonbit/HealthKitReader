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
} from 'react-native';
import {SettingsService} from '../services/settingsService';
import {HealthService} from '../services/healthService';
import {BloodGlucoseRanges} from '../services/settingsService';
import {DatabaseService} from '../services/database';
import {BloodGlucose} from '../types/BloodGlucose';

const settingsService = SettingsService.getInstance();
const healthService = HealthService.getInstance();
const databaseService = new DatabaseService();

export const SettingsScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [ranges, setRanges] = useState<BloodGlucoseRanges>({
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
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = async (
    field: keyof BloodGlucoseRanges,
    value: string | boolean,
  ) => {
    const newRanges = {...ranges};

    if (field === 'useCustomRanges') {
      newRanges[field] = value as boolean;
    } else {
      const stringValue = value as string;

      // Allow empty string for intermediate states while typing
      if (stringValue === '') {
        newRanges[field] = 0;
        setRanges(newRanges);
        return;
      }

      const numericValue = parseFloat(stringValue);

      // Validate the new value
      if (isNaN(numericValue)) {
        Alert.alert('Error', 'Please enter a valid number');
        return;
      }

      // Update the value first
      newRanges[field] = numericValue;
      setRanges(newRanges);

      // Only validate after the value is set
      if (newRanges.low >= newRanges.high) {
        Alert.alert('Error', 'Low range must be less than high range');
        return;
      }
    }

    await settingsService.setRanges(newRanges);
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
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
            value={ranges.useCustomRanges}
            onValueChange={value => handleRangeChange('useCustomRanges', value)}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Low Range (mg/dL)</Text>
          <TextInput
            style={[
              styles.input,
              !ranges.useCustomRanges && styles.disabledInput,
            ]}
            value={ranges.low.toString()}
            onChangeText={value => handleRangeChange('low', value)}
            keyboardType="numeric"
            editable={ranges.useCustomRanges}
            placeholder="Enter low range"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>High Range (mg/dL)</Text>
          <TextInput
            style={[
              styles.input,
              !ranges.useCustomRanges && styles.disabledInput,
            ]}
            value={ranges.high.toString()}
            onChangeText={value => handleRangeChange('high', value)}
            keyboardType="numeric"
            editable={ranges.useCustomRanges}
            placeholder="Enter high range"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  permissionNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  permissionList: {
    marginTop: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  permissionLabel: {
    fontSize: 14,
    color: '#333',
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '500',
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
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    color: '#666',
  },
});

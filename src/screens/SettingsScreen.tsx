import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {SettingsService} from '../services/settingsService';
import {DatabaseService} from '../services/database';
import {HealthService} from '../services/healthService';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const settingsService = SettingsService.getInstance();
const databaseService = new DatabaseService();
const healthService = HealthService.getInstance();

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const [ranges, setRanges] = useState({
    low: 70,
    high: 180,
    useCustomRanges: false,
  });
  const [tempRanges, setTempRanges] = useState({
    low: 70,
    high: 180,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const commonRanges = [
    {label: 'Standard/ADA/AACE Guidelines', low: 70, high: 180},
    {label: 'Tight Control', low: 80, high: 140},
    {label: 'Liberal', low: 60, high: 200},
  ];

  const serviceName = Platform.OS === 'ios' ? 'HealthKit' : 'Google Fit';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedRanges = await settingsService.getRanges();
      setRanges(savedRanges);
      setTempRanges({
        low: savedRanges.useCustomRanges
          ? savedRanges.customLow ?? savedRanges.low
          : savedRanges.low,
        high: savedRanges.useCustomRanges
          ? savedRanges.customHigh ?? savedRanges.high
          : savedRanges.high,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleRangeSelect = async (selectedRange: {
    low: number;
    high: number;
  }) => {
    try {
      await settingsService.updateRanges({
        ...ranges,
        customLow: selectedRange.low,
        customHigh: selectedRange.high,
      });
      setTempRanges(selectedRange);
      Alert.alert('Success', 'Ranges updated successfully');
    } catch (error) {
      console.error('Error saving ranges:', error);
      Alert.alert('Error', 'Failed to save ranges');
    }
  };

  const handleToggleCustomRanges = async () => {
    try {
      await settingsService.updateRanges({
        ...ranges,
        useCustomRanges: !ranges.useCustomRanges,
      });
      setRanges(prev => ({
        ...prev,
        useCustomRanges: !prev.useCustomRanges,
      }));
    } catch (error) {
      console.error('Error toggling custom ranges:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleResetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'Are you sure you want to reset the database? This will delete all data and recreate the tables. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await databaseService.resetDatabase();
              Alert.alert('Success', 'Database has been reset successfully.', [
                {text: 'OK'},
              ]);
            } catch (error) {
              console.error('Error resetting database:', error);
              Alert.alert(
                'Error',
                'Failed to reset database. Please try again.',
                [{text: 'OK'}],
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleImportFromHealth = async () => {
    try {
      setIsImporting(true);
      const healthService = HealthService.getInstance();
      const settingsService = SettingsService.getInstance();

      // Get the last sync time from settings
      const lastSync = await settingsService.getLastSyncTime();
      const endDate = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Use the more recent of last sync or one year ago
      const startDate = lastSync
        ? lastSync > oneYearAgo
          ? lastSync
          : oneYearAgo
        : oneYearAgo;

      const {healthKit, googleFit} =
        await healthService.getAllBloodGlucoseReadings(startDate, endDate);

      // Get existing readings from our database
      const existingReadings = await databaseService.getAllReadings();

      // Create a map of existing readings for quick lookup
      const existingReadingsMap = new Map(
        existingReadings.map(reading => [
          `${Math.floor(reading.timestamp.getTime() / (5 * 60 * 1000))}_${
            reading.value
          }`,
          reading,
        ]),
      );

      let importedCount = 0;
      let duplicateCount = 0;

      // Process HealthKit readings
      for (const reading of healthKit) {
        const readingTime = new Date(reading.startDate).getTime();
        const timeWindow = Math.floor(readingTime / (5 * 60 * 1000));
        const readingKey = `${timeWindow}_${reading.value}`;

        // Check if this reading already exists in our database
        if (existingReadingsMap.has(readingKey)) {
          duplicateCount++;
          continue;
        }

        // Only import if we don't already have this reading
        await databaseService.addReading({
          value: reading.value,
          unit: 'mg/dL',
          timestamp: new Date(reading.startDate),
          sourceName: 'Apple Health',
          notes: 'Imported from Apple Health',
        });
        importedCount++;
      }

      // Process Google Fit readings
      for (const reading of googleFit) {
        const readingTime = new Date(reading.date).getTime();
        const timeWindow = Math.floor(readingTime / (5 * 60 * 1000));
        const readingKey = `${timeWindow}_${reading.value}`;

        // Check if this reading already exists in our database
        if (existingReadingsMap.has(readingKey)) {
          duplicateCount++;
          continue;
        }

        // Only import if we don't already have this reading
        await databaseService.addReading({
          value: reading.value,
          unit: 'mg/dL',
          timestamp: new Date(reading.date),
          sourceName: reading.sourceName || 'Google Fit',
          notes: `Imported from ${reading.sourceName || 'Google Fit'}`,
        });
        importedCount++;
      }

      // Update the last sync time
      await settingsService.updateLastSyncTime();

      Alert.alert(
        'Import Complete',
        `Successfully imported ${importedCount} new readings\n${duplicateCount} duplicates were skipped`,
      );
    } catch (error) {
      console.error('Error importing readings:', error);
      Alert.alert('Error', 'Failed to import readings');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <Pressable style={styles.container} onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blood Glucose Ranges</Text>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Use Custom Ranges</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  ranges.useCustomRanges && styles.toggleButtonActive,
                ]}
                onPress={handleToggleCustomRanges}>
                <Text
                  style={[
                    styles.toggleButtonText,
                    ranges.useCustomRanges && styles.toggleButtonTextActive,
                  ]}>
                  {ranges.useCustomRanges ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            {ranges.useCustomRanges && (
              <View style={styles.rangeOptions}>
                {commonRanges.map((range, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.rangeOption,
                      tempRanges.low === range.low &&
                        tempRanges.high === range.high &&
                        styles.rangeOptionSelected,
                    ]}
                    onPress={() => handleRangeSelect(range)}>
                    <Text style={styles.rangeOptionLabel}>{range.label}</Text>
                    <Text style={styles.rangeOptionValues}>
                      {range.low} - {range.high} mg/dL
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            <Text style={styles.sectionDescription}>
              Manage your blood glucose data
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.importButton]}
                onPress={handleImportFromHealth}
                disabled={isImporting}>
                {isImporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Import from Health</Text>
                    <Text style={styles.buttonSubtext}>
                      Import blood glucose readings from {serviceName}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={handleResetDatabase}>
                <Text style={styles.buttonText}>Reset Database</Text>
                <Text style={styles.buttonSubtext}>
                  Recreate database tables with latest schema
                </Text>
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  rangeOptions: {
    marginTop: 10,
  },
  rangeOption: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rangeOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  rangeOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rangeOptionValues: {
    fontSize: 14,
    color: '#666',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  resetButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  importButton: {
    backgroundColor: '#5856D6',
  },
});

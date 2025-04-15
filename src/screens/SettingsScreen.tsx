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
  const [isResyncing, setIsResyncing] = useState(false);
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

  const handleRangeChange = (type: 'low' | 'high', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setTempRanges(prev => ({
        ...prev,
        [type]: numValue,
      }));
    }
  };

  const handleSaveRanges = async () => {
    try {
      await settingsService.updateRanges({
        ...ranges,
        customLow: tempRanges.low,
        customHigh: tempRanges.high,
      });
      Alert.alert('Success', 'Ranges saved successfully');
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

  const handleDeleteAllReadings = async () => {
    Alert.alert(
      'Delete All Readings',
      'Are you sure you want to delete all readings? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteAllReadings();
              Alert.alert(
                'Success',
                'All readings have been permanently deleted.',
                [{text: 'OK'}],
              );
            } catch (error) {
              console.error('Error deleting readings:', error);
              Alert.alert(
                'Error',
                'Failed to delete readings. Please try again.',
                [{text: 'OK'}],
              );
            }
          },
        },
      ],
    );
  };

  const handleResyncHealthKit = async () => {
    if (!healthService) {
      Alert.alert('Error', `${serviceName} is not available on this device.`);
      return;
    }

    setIsResyncing(true);
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Start importing from 3 months ago
      await healthService.getBloodGlucoseFromHealthKit(
        threeMonthsAgo,
        new Date(),
      );

      Alert.alert(
        'Success',
        `${serviceName} data has been successfully imported.`,
        [{text: 'OK'}],
      );
    } catch (error) {
      console.error('Error resyncing:', error);
      Alert.alert(
        'Error',
        `Failed to import ${serviceName} data. Please check your permissions and try again.`,
        [{text: 'OK'}],
      );
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <Pressable style={styles.container} onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
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
              <View style={styles.rangeInputs}>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeLabel}>Low (mg/dL)</Text>
                  <TextInput
                    style={styles.input}
                    value={tempRanges?.low?.toString() ?? '70'}
                    onChangeText={value => handleRangeChange('low', value)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeLabel}>High (mg/dL)</Text>
                  <TextInput
                    style={styles.input}
                    value={tempRanges?.high?.toString() ?? '180'}
                    onChangeText={value => handleRangeChange('high', value)}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveRanges}>
                  <Text style={styles.saveButtonText}>Save Ranges</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            <Text style={styles.sectionDescription}>
              Manage your blood glucose data and {serviceName} integration
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleDeleteAllReadings}>
                <Text style={styles.buttonText}>Delete All Readings</Text>
                <Text style={styles.buttonSubtext}>
                  Permanently remove all stored readings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.syncButton]}
                onPress={handleResyncHealthKit}
                disabled={isResyncing}>
                {isResyncing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.loadingText}>Importing data...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Import {serviceName} Data
                    </Text>
                    <Text style={styles.buttonSubtext}>
                      Sync data from the last 3 months
                    </Text>
                  </>
                )}
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
  rangeInputs: {
    marginTop: 10,
  },
  rangeInput: {
    marginBottom: 15,
  },
  rangeLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  syncButton: {
    backgroundColor: '#007AFF',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
});

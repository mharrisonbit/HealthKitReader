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
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {SettingsService} from '../services/settingsService';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const settingsService = SettingsService.getInstance();

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
});

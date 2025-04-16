import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {SettingsScreen} from '../screens/SettingsScreen';
import {SettingsService} from '../services/settingsService';

// Mock the services
jest.mock('../services/settingsService');

describe('SettingsScreen', () => {
  const mockSettings = {
    low: 70,
    high: 180,
    useCustomRanges: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SettingsService
    (SettingsService.getInstance as jest.Mock).mockReturnValue({
      getRanges: jest.fn().mockResolvedValue(mockSettings),
      setRanges: jest.fn().mockResolvedValue(true),
      getHealthKitEnabled: jest.fn().mockResolvedValue(true),
      setHealthKitEnabled: jest.fn().mockResolvedValue(true),
    });
  });

  it('renders correctly', async () => {
    const {getByText} = render(<SettingsScreen />);

    // Check if main elements are present
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Blood Glucose Ranges')).toBeTruthy();
    expect(getByText('Data Management')).toBeTruthy();

    // Wait for settings to load
    await waitFor(() => {
      expect(getByText('70')).toBeTruthy();
      expect(getByText('180')).toBeTruthy();
    });
  });

  it('handles range updates', async () => {
    const {getByTestId, getByText} = render(<SettingsScreen />);

    // Enable custom ranges
    fireEvent.press(getByText('Use Custom Ranges'));

    // Update low range
    fireEvent.changeText(getByTestId('low-range-input'), '60');

    // Update high range
    fireEvent.changeText(getByTestId('high-range-input'), '200');

    // Save changes
    fireEvent.press(getByText('Save Ranges'));

    // Verify settings were updated
    await waitFor(() => {
      expect(SettingsService.getInstance().setRanges).toHaveBeenCalledWith({
        low: 60,
        high: 200,
        useCustomRanges: true,
      });
    });
  });

  it('handles HealthKit toggle', async () => {
    const {getByTestId} = render(<SettingsScreen />);

    // Toggle HealthKit
    fireEvent.press(getByTestId('healthkit-toggle'));

    // Verify HealthKit setting was updated
    await waitFor(() => {
      expect(
        SettingsService.getInstance().setHealthKitEnabled,
      ).toHaveBeenCalledWith(false);
    });
  });

  it('handles delete all readings', async () => {
    const {getByText} = render(<SettingsScreen />);

    // Press delete button
    fireEvent.press(getByText('Delete All Readings'));

    // Confirm deletion
    fireEvent.press(getByText('Delete'));

    // Verify deletion was handled
    await waitFor(() => {
      expect(getByText('All readings deleted successfully')).toBeTruthy();
    });
  });

  it('handles errors gracefully', async () => {
    // Mock an error in the settings service
    (SettingsService.getInstance as jest.Mock).mockReturnValue({
      getRanges: jest.fn().mockRejectedValue(new Error('Settings error')),
    });

    const {getByText} = render(<SettingsScreen />);

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error loading settings')).toBeTruthy();
    });
  });
});

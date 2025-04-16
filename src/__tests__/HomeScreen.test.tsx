import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import {SettingsService} from '../services/settingsService';
import {DatabaseService} from '../services/database';
import {HealthService} from '../services/healthService';

// Mock the services
jest.mock('../services/settingsService');
jest.mock('../services/database');
jest.mock('../services/healthService');

describe('HomeScreen', () => {
  const mockSettings = {
    low: 70,
    high: 180,
    useCustomRanges: false,
  };

  const mockReadings = [
    {
      id: '1',
      value: 120,
      timestamp: new Date('2024-03-20T10:00:00').toISOString(),
      notes: 'Test reading 1',
    },
    {
      id: '2',
      value: 150,
      timestamp: new Date('2024-03-20T12:00:00').toISOString(),
      notes: 'Test reading 2',
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock SettingsService
    (SettingsService.getInstance as jest.Mock).mockReturnValue({
      getRanges: jest.fn().mockResolvedValue(mockSettings),
      getHealthKitEnabled: jest.fn().mockResolvedValue(true),
    });

    // Mock DatabaseService
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockResolvedValue(mockReadings),
      addReading: jest.fn().mockResolvedValue('new-id'),
      deleteReading: jest.fn().mockResolvedValue(true),
    });

    // Mock HealthService
    (HealthService.getInstance as jest.Mock).mockReturnValue({
      isAvailable: jest.fn().mockResolvedValue(true),
      requestAuthorization: jest.fn().mockResolvedValue(true),
      getBloodGlucoseSamples: jest.fn().mockResolvedValue(mockReadings),
    });
  });

  it('renders correctly', async () => {
    const {getByText} = render(<HomeScreen />);

    // Check if main elements are present
    expect(getByText('Blood Glucose Tracker')).toBeTruthy();
    expect(getByText('Add Reading')).toBeTruthy();

    // Wait for initial data load
    await waitFor(() => {
      expect(getByText('120')).toBeTruthy();
      expect(getByText('150')).toBeTruthy();
    });
  });

  it('handles adding a new reading', async () => {
    const {getByText, getByTestId} = render(<HomeScreen />);

    // Open add reading modal
    fireEvent.press(getByText('Add Reading'));

    // Fill in the form
    fireEvent.changeText(getByTestId('value-input'), '130');
    fireEvent.changeText(getByTestId('notes-input'), 'Test note');

    // Submit the form
    fireEvent.press(getByText('Save'));

    // Verify the reading was added
    await waitFor(() => {
      expect(DatabaseService.getInstance().addReading).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 130,
          notes: 'Test note',
        }),
      );
    });
  });

  it('handles deleting a reading', async () => {
    const {getByTestId, queryByText} = render(<HomeScreen />);

    // Wait for readings to load
    await waitFor(() => {
      expect(getByTestId('reading-1')).toBeTruthy();
    });

    // Delete a reading
    fireEvent.press(getByTestId('delete-reading-1'));

    // Confirm deletion
    fireEvent.press(getByTestId('confirm-delete'));

    // Verify the reading was deleted
    await waitFor(() => {
      expect(DatabaseService.getInstance().deleteReading).toHaveBeenCalledWith(
        '1',
      );
      expect(queryByText('120')).toBeNull();
    });
  });

  it('handles time period changes', async () => {
    const {getByText, getByTestId} = render(<HomeScreen />);

    // Change to 7 days view
    fireEvent.press(getByText('7 Days'));

    // Verify the correct data was fetched
    await waitFor(() => {
      expect(DatabaseService.getInstance().getAllReadings).toHaveBeenCalled();
    });
  });

  it('handles A1C calculation', async () => {
    const {getByText, getByTestId} = render(<HomeScreen />);

    // Open A1C modal
    fireEvent.press(getByTestId('a1c-button'));

    // Change A1C time frame
    fireEvent.press(getByText('3 Months'));

    // Verify A1C was calculated
    await waitFor(() => {
      expect(getByText(/A1C: \d+\.\d+%/)).toBeTruthy();
    });
  });

  it('handles HealthKit import', async () => {
    const {getByText} = render(<HomeScreen />);

    // Open import modal
    fireEvent.press(getByText('Import from Health'));

    // Start import
    fireEvent.press(getByText('Import'));

    // Verify import process
    await waitFor(() => {
      expect(
        HealthService.getInstance().getBloodGlucoseSamples,
      ).toHaveBeenCalled();
      expect(DatabaseService.getInstance().addReading).toHaveBeenCalled();
    });
  });

  it('handles errors gracefully', async () => {
    // Mock an error in the database service
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getAllReadings: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const {getByText} = render(<HomeScreen />);

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error loading readings')).toBeTruthy();
    });
  });
});

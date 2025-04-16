import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import App from '../App';
import {DatabaseService} from '../services/database';
import {SettingsService} from '../services/settingsService';

// Mock the services
jest.mock('../services/database');
jest.mock('../services/settingsService');

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DatabaseService
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      initialize: jest.fn().mockResolvedValue(true),
    });

    // Mock SettingsService
    (SettingsService.getInstance as jest.Mock).mockReturnValue({
      getRanges: jest.fn().mockResolvedValue({
        low: 70,
        high: 180,
        useCustomRanges: false,
      }),
    });
  });

  it('renders correctly', async () => {
    const {getByText} = render(<App />);

    // Check if main elements are present
    expect(getByText('Blood Glucose Tracker')).toBeTruthy();

    // Wait for initialization
    await waitFor(() => {
      expect(DatabaseService.getInstance().initialize).toHaveBeenCalled();
    });
  });

  it('initializes database and settings', async () => {
    render(<App />);

    // Verify initialization
    await waitFor(() => {
      expect(DatabaseService.getInstance().initialize).toHaveBeenCalled();
      expect(SettingsService.getInstance().getRanges).toHaveBeenCalled();
    });
  });

  it('handles navigation between screens', async () => {
    const {getByText} = render(<App />);

    // Navigate to Settings
    fireEvent.press(getByText('Settings'));

    // Verify Settings screen is shown
    await waitFor(() => {
      expect(getByText('Blood Glucose Ranges')).toBeTruthy();
    });

    // Navigate back to Home
    fireEvent.press(getByText('Home'));

    // Verify Home screen is shown
    await waitFor(() => {
      expect(getByText('Add Reading')).toBeTruthy();
    });
  });

  it('handles database initialization errors gracefully', async () => {
    // Mock database error
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      initialize: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const {getByText} = render(<App />);

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error initializing database')).toBeTruthy();
    });
  });

  it('handles settings loading errors gracefully', async () => {
    // Mock settings error
    (SettingsService.getInstance as jest.Mock).mockReturnValue({
      getRanges: jest.fn().mockRejectedValue(new Error('Settings error')),
    });

    const {getByText} = render(<App />);

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error loading settings')).toBeTruthy();
    });
  });
});

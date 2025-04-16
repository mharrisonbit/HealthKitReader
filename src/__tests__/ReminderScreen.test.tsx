import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {ReminderScreen} from '../screens/ReminderScreen';
import {NotificationService} from '../services/notificationService';

// Mock the services
jest.mock('../services/notificationService');

describe('ReminderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock NotificationService
    (NotificationService.getInstance as jest.Mock).mockReturnValue({
      requestPermissions: jest.fn().mockResolvedValue(true),
      createChannel: jest.fn().mockResolvedValue('test-channel'),
      scheduleReminder: jest.fn().mockResolvedValue('test-id'),
      cancelReminder: jest.fn().mockResolvedValue(true),
    });
  });

  it('renders correctly', () => {
    const {getByText} = render(<ReminderScreen />);
    expect(getByText('Set Reminder')).toBeTruthy();
    expect(getByText('Time')).toBeTruthy();
    expect(getByText('Repeat')).toBeTruthy();
  });

  it('handles time selection', async () => {
    const {getByTestId} = render(<ReminderScreen />);

    // Open time picker
    fireEvent.press(getByTestId('time-picker'));

    // Select a time
    fireEvent(getByTestId('time-picker'), 'onChange', {
      nativeEvent: {timestamp: new Date('2024-03-20T10:00:00').getTime()},
    });

    // Verify time was set
    await waitFor(() => {
      expect(getByTestId('selected-time')).toHaveTextContent('10:00 AM');
    });
  });

  it('handles repeat selection', async () => {
    const {getByText, getByTestId} = render(<ReminderScreen />);

    // Open repeat picker
    fireEvent.press(getByTestId('repeat-picker'));

    // Select a repeat option
    fireEvent.press(getByText('Daily'));

    // Verify repeat was set
    await waitFor(() => {
      expect(getByTestId('selected-repeat')).toHaveTextContent('Daily');
    });
  });

  it('schedules a reminder', async () => {
    const {getByText} = render(<ReminderScreen />);

    // Set time and repeat
    fireEvent.press(getByText('10:00 AM'));
    fireEvent.press(getByText('Daily'));

    // Save reminder
    fireEvent.press(getByText('Save Reminder'));

    // Verify reminder was scheduled
    await waitFor(() => {
      expect(
        NotificationService.getInstance().scheduleReminder,
      ).toHaveBeenCalled();
    });
  });

  it('handles permission errors gracefully', async () => {
    // Mock permission error
    (NotificationService.getInstance as jest.Mock).mockReturnValue({
      requestPermissions: jest
        .fn()
        .mockRejectedValue(new Error('Permission error')),
    });

    const {getByText} = render(<ReminderScreen />);

    // Try to save reminder
    fireEvent.press(getByText('Save Reminder'));

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error setting reminder')).toBeTruthy();
    });
  });

  it('handles scheduling errors gracefully', async () => {
    // Mock scheduling error
    (NotificationService.getInstance as jest.Mock).mockReturnValue({
      requestPermissions: jest.fn().mockResolvedValue(true),
      createChannel: jest.fn().mockResolvedValue('test-channel'),
      scheduleReminder: jest
        .fn()
        .mockRejectedValue(new Error('Scheduling error')),
    });

    const {getByText} = render(<ReminderScreen />);

    // Try to save reminder
    fireEvent.press(getByText('Save Reminder'));

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error setting reminder')).toBeTruthy();
    });
  });
});

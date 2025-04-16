import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {AddReadingScreen} from '../screens/AddReadingScreen';
import {DatabaseService} from '../services/database';

// Mock the services
jest.mock('../services/database');

describe('AddReadingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DatabaseService
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      addReading: jest.fn().mockResolvedValue('test-id'),
    });
  });

  it('renders correctly', () => {
    const {getByText, getByPlaceholderText} = render(<AddReadingScreen />);
    expect(getByText('Add Reading')).toBeTruthy();
    expect(getByPlaceholderText('Enter blood glucose value')).toBeTruthy();
    expect(getByPlaceholderText('Add notes (optional)')).toBeTruthy();
  });

  it('handles value input', async () => {
    const {getByPlaceholderText} = render(<AddReadingScreen />);
    const valueInput = getByPlaceholderText('Enter blood glucose value');

    fireEvent.changeText(valueInput, '120');
    expect(valueInput.props.value).toBe('120');
  });

  it('handles notes input', async () => {
    const {getByPlaceholderText} = render(<AddReadingScreen />);
    const notesInput = getByPlaceholderText('Add notes (optional)');

    fireEvent.changeText(notesInput, 'Test note');
    expect(notesInput.props.value).toBe('Test note');
  });

  it('saves a reading', async () => {
    const {getByText, getByPlaceholderText} = render(<AddReadingScreen />);

    // Fill in the form
    fireEvent.changeText(
      getByPlaceholderText('Enter blood glucose value'),
      '120',
    );
    fireEvent.changeText(
      getByPlaceholderText('Add notes (optional)'),
      'Test note',
    );

    // Save the reading
    fireEvent.press(getByText('Save'));

    // Verify the reading was saved
    await waitFor(() => {
      expect(DatabaseService.getInstance().addReading).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 120,
          notes: 'Test note',
        }),
      );
    });
  });

  it('validates required fields', async () => {
    const {getByText} = render(<AddReadingScreen />);

    // Try to save without a value
    fireEvent.press(getByText('Save'));

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Please enter a blood glucose value')).toBeTruthy();
    });
  });

  it('validates value format', async () => {
    const {getByText, getByPlaceholderText} = render(<AddReadingScreen />);

    // Enter an invalid value
    fireEvent.changeText(
      getByPlaceholderText('Enter blood glucose value'),
      'abc',
    );

    // Try to save
    fireEvent.press(getByText('Save'));

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Please enter a valid number')).toBeTruthy();
    });
  });

  it('handles database errors gracefully', async () => {
    // Mock database error
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      addReading: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const {getByText, getByPlaceholderText} = render(<AddReadingScreen />);

    // Fill in the form
    fireEvent.changeText(
      getByPlaceholderText('Enter blood glucose value'),
      '120',
    );

    // Try to save
    fireEvent.press(getByText('Save'));

    // Verify error message is shown
    await waitFor(() => {
      expect(getByText('Error saving reading')).toBeTruthy();
    });
  });
});

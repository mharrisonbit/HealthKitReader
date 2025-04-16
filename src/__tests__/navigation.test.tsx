import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {HomeScreen} from '../screens/HomeScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {ReminderScreen} from '../screens/ReminderScreen';

// Mock the screens
jest.mock('../screens/HomeScreen');
jest.mock('../screens/SettingsScreen');
jest.mock('../screens/ReminderScreen');

const Tab = createBottomTabNavigator();

describe('Navigation', () => {
  const MockApp = () => (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
        <Tab.Screen name="Reminder" component={ReminderScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );

  it('renders all tabs', () => {
    const {getByText} = render(<MockApp />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Reminder')).toBeTruthy();
  });

  it('navigates between tabs', () => {
    const {getByText} = render(<MockApp />);

    // Navigate to Settings
    fireEvent.press(getByText('Settings'));
    expect(SettingsScreen).toHaveBeenCalled();

    // Navigate to Reminder
    fireEvent.press(getByText('Reminder'));
    expect(ReminderScreen).toHaveBeenCalled();

    // Navigate back to Home
    fireEvent.press(getByText('Home'));
    expect(HomeScreen).toHaveBeenCalled();
  });

  it('maintains tab state', () => {
    const {getByText} = render(<MockApp />);

    // Navigate to Settings
    fireEvent.press(getByText('Settings'));
    expect(SettingsScreen).toHaveBeenCalledTimes(1);

    // Navigate back to Home
    fireEvent.press(getByText('Home'));
    expect(HomeScreen).toHaveBeenCalledTimes(2);

    // Navigate to Settings again
    fireEvent.press(getByText('Settings'));
    expect(SettingsScreen).toHaveBeenCalledTimes(2);
  });
});

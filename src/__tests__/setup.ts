import 'react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockHealthKit from 'react-native-health';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock HealthKit
jest.mock('react-native-health', () => ({
  ...mockHealthKit,
  isAvailable: jest.fn(() => Promise.resolve(true)),
  initHealthKit: jest.fn(() => Promise.resolve(true)),
  getBloodGlucoseSamples: jest.fn(() => Promise.resolve([])),
  getOldestBloodGlucoseDate: jest.fn(() => Promise.resolve(new Date())),
}));

// Mock React Native components
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      ...rn.Platform,
      OS: 'ios',
    },
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  subDays: jest.fn((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }),
  subHours: jest.fn((date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() - hours);
    return result;
  }),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

// Mock React Native Chart Kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: jest.fn(() => null),
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

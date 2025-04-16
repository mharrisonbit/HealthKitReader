import Reactotron from 'reactotron-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare global {
  interface Console {
    tron: typeof Reactotron;
  }
}

const reactotron = Reactotron.configure({
  name: 'RN HealthKit',
  host: 'localhost',
})
  .setAsyncStorageHandler(AsyncStorage)
  .useReactNative()
  .connect();

// Extend console
if (__DEV__ && reactotron) {
  console.tron = reactotron;

  // Clear log on start
  reactotron.clear();

  // Log when connected
  // console.log('Reactotron Connected');
}

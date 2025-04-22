/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import 'react-native-gesture-handler';
import {enableScreens} from 'react-native-screens';

// Enable screens
enableScreens();

// Enable Chrome debugging and Reactotron only in development
if (__DEV__) {
  // Import Reactotron config only in development
  require('./src/config/ReactotronConfig');

  // Connect to React DevTools
  const {connectToDevTools} = require('react-devtools-core');
  connectToDevTools({
    host: 'localhost',
    port: 8081, // Standard Metro bundler port
  });

  // Enable development menu
  LogBox.ignoreLogs(['Warning: ...']); // Ignore specific warnings if needed

  // Test Reactotron connection
  console.tron.log('Reactotron test log from index.tsx');
}

AppRegistry.registerComponent(appName, () => App);

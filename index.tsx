/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import './src/config/ReactotronConfig';

// Enable Chrome debugging
if (__DEV__) {
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

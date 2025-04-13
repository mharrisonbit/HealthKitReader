/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Enable Chrome debugging
if (__DEV__) {
  const {connectToDevTools} = require('react-devtools-core');
  connectToDevTools({
    host: 'localhost',
    port: 8097,
  });
}

AppRegistry.registerComponent(appName, () => App);

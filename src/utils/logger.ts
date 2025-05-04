import {Platform} from 'react-native';

const isDevelopment = __DEV__;

class Logger {
  static log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  static error(...args: any[]) {
    if (isDevelopment) {
      console.error(...args);
    }
  }

  static warn(...args: any[]) {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  static info(...args: any[]) {
    if (isDevelopment) {
      console.info(...args);
    }
  }

  static debug(...args: any[]) {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
}

export default Logger;

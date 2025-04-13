declare module 'reactotron-react-native' {
  interface Reactotron {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    clear: () => void;
  }
}

declare global {
  interface Console {
    tron: {
      log: (...args: any[]) => void;
      error: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      debug: (...args: any[]) => void;
      clear: () => void;
    };
  }
}

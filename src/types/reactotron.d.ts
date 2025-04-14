declare module 'reactotron-react-native' {
  interface Reactotron {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    clear: () => void;
    configure: (config: {name: string; host: string}) => Reactotron;
    setAsyncStorageHandler: (handler: any) => Reactotron;
    useReactNative: () => Reactotron;
    connect: () => Reactotron;
  }

  const Reactotron: Reactotron;
  export default Reactotron;
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

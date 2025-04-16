import React from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';

export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
};

export const ErrorScreen: React.FC<{error: string}> = ({error}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.text, styles.errorText]}>{error}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    padding: 20,
  },
});

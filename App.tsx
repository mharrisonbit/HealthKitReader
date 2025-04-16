/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './src/config/ReactotronConfig';
import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from './src/screens/HomeScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {AddBloodGlucoseScreen} from './src/screens/AddBloodGlucoseScreen';
import {BloodGlucoseListScreen} from './src/screens/BloodGlucoseListScreen';
import {BloodGlucoseChartScreen} from './src/screens/BloodGlucoseChartScreen';
import {BloodGlucose} from './src/types/BloodGlucose';
import {View, Text} from 'react-native';
import {DatabaseService} from './src/services/database';
import {
  LoadingScreen,
  ErrorScreen,
} from './src/components/LoadingAndErrorScreens';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  List: {
    onDelete: (id: string) => void;
  };
  Add: {
    onSave: (data: Omit<BloodGlucose, 'id'>) => void;
  };
  Charts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const databaseService = new DatabaseService();

function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (__DEV__) {
      console.tron.log('App component mounted');
    }
    const initDatabase = async () => {
      try {
        if (__DEV__) {
          console.tron.log('Initializing database...');
        }
        await databaseService.initDB();
        if (__DEV__) {
          console.tron.log('Database initialized successfully');
        }
        setError(null);
      } catch (error) {
        if (__DEV__) {
          console.tron.error('Error initializing database:', error);
        }
        setError('Failed to initialize database. Please restart the app.');
      } finally {
        if (__DEV__) {
          console.tron.log('Setting loading state to false');
        }
        setIsLoading(false);
      }
    };

    initDatabase();
  }, []);

  const handleAddReading = async (data: Omit<BloodGlucose, 'id'>) => {
    try {
      const newReading: BloodGlucose = {
        ...data,
        id: Date.now().toString(),
      };
      await databaseService.addReading(newReading);
    } catch (error) {
      if (__DEV__) {
        console.error('Error adding reading:', error);
      }
    }
  };

  const handleDeleteReading = async (id: string) => {
    try {
      await databaseService.deleteReading(id);
    } catch (error) {
      if (__DEV__) {
        console.error('Error deleting reading:', error);
      }
    }
  };

  if (isLoading) {
    // console.log('Rendering loading screen');
    return <LoadingScreen />;
  }

  if (error) {
    // console.log('Rendering error screen:', error);
    return <ErrorScreen error={error} />;
  }

  // console.log('Rendering main app');
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Blood Glucose Tracker',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
        <Stack.Screen
          name="List"
          component={BloodGlucoseListScreen}
          options={{
            title: 'Blood Glucose Readings',
          }}
          initialParams={{onDelete: handleDeleteReading}}
        />
        <Stack.Screen
          name="Add"
          component={AddBloodGlucoseScreen}
          options={{
            title: 'Add Reading',
          }}
          initialParams={{onSave: handleAddReading}}
        />
        <Stack.Screen
          name="Charts"
          component={BloodGlucoseChartScreen}
          options={{
            title: 'Charts',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;

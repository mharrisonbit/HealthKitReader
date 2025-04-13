/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

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

type RootStackParamList = {
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
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        await databaseService.initDB();
        console.log('Database initialized successfully');
        setError(null);
      } catch (error) {
        console.error('Error initializing database:', error);
        setError('Failed to initialize database. Please restart the app.');
      } finally {
        console.log('Setting loading state to false');
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
      console.error('Error adding reading:', error);
    }
  };

  const handleDeleteReading = async (id: string) => {
    try {
      await databaseService.deleteReading(id);
    } catch (error) {
      console.error('Error deleting reading:', error);
    }
  };

  if (isLoading) {
    console.log('Rendering loading screen');
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    console.log('Rendering error screen:', error);
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
        <Text style={{color: 'red', textAlign: 'center'}}>{error}</Text>
      </View>
    );
  }

  console.log('Rendering main app');
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

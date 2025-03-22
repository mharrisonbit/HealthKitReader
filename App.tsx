/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AddBloodGlucoseScreen} from './src/screens/AddBloodGlucoseScreen';
import {BloodGlucoseListScreen} from './src/screens/BloodGlucoseListScreen';
import {BloodGlucoseChartScreen} from './src/screens/BloodGlucoseChartScreen';
import {BloodGlucose} from './src/types/BloodGlucose';
import {View, Text} from 'react-native';
import {DatabaseService} from './src/services/database';

type RootStackParamList = {
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

  React.useEffect(() => {
    const initDatabase = async () => {
      try {
        await databaseService.initDB();
      } catch (error) {
        console.error('Error initializing database:', error);
      } finally {
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
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="List"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
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

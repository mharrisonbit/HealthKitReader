/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './src/config/ReactotronConfig';
import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from './src/screens/HomeScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {AddBloodGlucoseScreen} from './src/screens/AddBloodGlucoseScreen';
import {BloodGlucoseListScreen} from './src/screens/BloodGlucoseListScreen';
import {BloodGlucoseChartScreen} from './src/screens/BloodGlucoseChartScreen';
import {ComparisonScreen} from './src/screens/ComparisonScreen';
import {BloodGlucose} from './src/types/BloodGlucose';
import {Text} from 'react-native';
import {DatabaseService} from './src/services/database';
import {
  LoadingScreen,
  ErrorScreen,
} from './src/components/LoadingAndErrorScreens';
import {SafeAreaProvider} from 'react-native-safe-area-context';

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
  Comparison: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
const databaseService = DatabaseService.getInstance();

// Create stack navigators for each tab
const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Home"
      component={HomeScreen}
      options={{title: 'Blood Glucoses Tracker'}}
    />
    <Stack.Screen
      name="Add"
      component={AddBloodGlucoseScreen}
      options={{title: 'Add Reading'}}
    />
  </Stack.Navigator>
);

const ListStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="List"
      component={BloodGlucoseListScreen}
      options={{title: 'Blood Glucose Readings'}}
    />
    <Stack.Screen
      name="Add"
      component={AddBloodGlucoseScreen}
      options={{title: 'Add Reading'}}
    />
  </Stack.Navigator>
);

const ChartsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Charts"
      component={BloodGlucoseChartScreen}
      options={{title: 'Charts'}}
    />
  </Stack.Navigator>
);

const ComparisonStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Comparison"
      component={ComparisonScreen}
      options={{title: 'Compare Time Ranges'}}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{title: 'Settings'}}
    />
  </Stack.Navigator>
);

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

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#E5E5EA',
            },
          }}>
          <Tab.Screen
            name="HomeTab"
            component={HomeStack}
            options={{
              title: 'Home',
              tabBarIcon: ({color}: {color: string}) => (
                <Text style={{color, fontSize: 24}}>🏠</Text>
              ),
            }}
          />
          <Tab.Screen
            name="ListTab"
            component={ListStack}
            options={{
              title: 'Readings',
              tabBarIcon: ({color}: {color: string}) => (
                <Text style={{color, fontSize: 24}}>📋</Text>
              ),
            }}
          />
          <Tab.Screen
            name="ComparisonTab"
            component={ComparisonStack}
            options={{
              title: 'Compare',
              tabBarIcon: ({color}: {color: string}) => (
                <Text style={{color, fontSize: 24}}>📊</Text>
              ),
            }}
          />
          <Tab.Screen
            name="ChartsTab"
            component={ChartsStack}
            options={{
              title: 'Charts',
              tabBarIcon: ({color}: {color: string}) => (
                <Text style={{color, fontSize: 24}}>📈</Text>
              ),
            }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsStack}
            options={{
              title: 'Settings',
              tabBarIcon: ({color}: {color: string}) => (
                <Text style={{color, fontSize: 24}}>⚙️</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;

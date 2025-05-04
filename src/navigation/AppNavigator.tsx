import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SettingsScreen} from '../screens/SettingsScreen';
import {ReadingsScreen} from '../screens/ReadingsScreen';
import {ChartsScreen} from '../screens/ChartsScreen';
import {ComparisonScreen} from '../screens/ComparisonScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#666666',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Tab.Screen
          name="Readings"
          component={ReadingsScreen}
          options={{
            title: 'Readings',
            tabBarIcon: ({color, size}) => (
              <Icon name="list" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Comparison"
          component={ComparisonScreen}
          options={{
            title: 'Compare',
            tabBarIcon: ({color, size}) => (
              <Icon name="compare" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Charts"
          component={ChartsScreen}
          options={{
            title: 'Charts',
            tabBarIcon: ({color, size}) => (
              <Icon name="show-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({color, size}) => (
              <Icon name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

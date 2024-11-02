// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Grocersee from './src/screens/Grocersee';
import HomeScreen from './src/screens/Home';
import Grocerlist from './src/screens/Grocerlist';
import { Button, View, Text } from 'react-native';

type RootStackParamList = {
  Home: undefined;
  Grocersee: undefined;
  Grocerlist: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Home' }}
        />
        <Stack.Screen 
          name="Grocersee" 
          component={Grocersee}
          options={{ title: 'Grocersee' }}
        />
        <Stack.Screen 
          name="Grocerlist" 
          component={Grocerlist}
          options={{ title: 'Grocerlist' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Grocersee from './src/screens/Grocersee';
import { Button, View, Text } from 'react-native';

type RootStackParamList = {
  Home: undefined;
  PoseDetection: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome</Text>
      <Button
        title="Start Pose Detection"
        onPress={() => navigation.navigate('PoseDetection')}
      />
      <Button
        title="Settings"
        onPress={() => navigation.navigate('Settings')}
      />
    </View>
  );
}

function Grocerlis() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
    </View>
  );
}

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
          name="PoseDetection" 
          component={Grocersee}
          options={{ title: 'Pose Detection' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={Grocerlis}
          options={{ title: 'Grocerlist' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
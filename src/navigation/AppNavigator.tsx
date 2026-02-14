import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeFeed } from '../screens/HomeFeed';
import { PropertyDetail } from '../screens/PropertyDetail';
import { COLORS, FONTS } from '../theme/theme';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.white },
        }}
      >
        <Stack.Screen name="Home" component={HomeFeed} />
        <Stack.Screen
          name="Details"
          component={PropertyDetail}
          options={{
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerTintColor: COLORS.text,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

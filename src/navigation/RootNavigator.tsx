import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/HomeScreen';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { colors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            orientation: 'portrait',
            gestureEnabled: true,
            // iOS 26 treats the back swipe as full-screen and steals the scrubber.
            fullScreenGestureEnabled: false,
            gestureResponseDistance: { start: 24 },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

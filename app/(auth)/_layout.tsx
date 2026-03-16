import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6B4226',
        },
        headerTintColor: '#FFF8E1',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitle: '뒤로',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: '로그인',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: '회원가입',
        }}
      />
    </Stack>
  );
}

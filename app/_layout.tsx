// app/_layout.tsx
import { Providers } from '../context/providers';
import { Stack } from 'expo-router';
import Colors from '../constants/Colors';

export default function RootLayout() {
  return (
    <Providers>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Expense Tracker'
          }} 
        />
        <Stack.Screen 
          name="add-transaction" 
          options={{ 
            title: 'Add Transaction',
            presentation: 'modal'
          }} 
        />
      </Stack>
    </Providers>
  );
}


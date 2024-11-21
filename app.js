import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import { TransactionsProvider } from './context/TransactionsContext';
import Colors from './constants/Colors';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        
        <TransactionsProvider>
            <NavigationContainer>
                <Stack.Navigator
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
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'Taxi Balance' }}
                    />
                    <Stack.Screen
                        name="AddTransaction"
                        component={AddTransactionScreen}
                        options={{ title: 'Add Transaction' }}
                    />
                </Stack.Navigator>
                <StatusBar style="light" />
            </NavigationContainer>
        </TransactionsProvider>
    );
}
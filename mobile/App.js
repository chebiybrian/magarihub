// MagariHub mobile app — bottom tabs: Cars | Reels | Drivers | More.
// Start with: npx expo start   (scan the QR code with the Expo Go app)
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';

import ListingsScreen from './src/screens/ListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import ReelsScreen from './src/screens/ReelsScreen';
import PostScreen from './src/screens/PostScreen';
import DriversScreen from './src/screens/DriversScreen';
import MoreScreen from './src/screens/MoreScreen';
import InsuranceScreen from './src/screens/InsuranceScreen';
import PriceCheckScreen from './src/screens/PriceCheckScreen';
import GuidesScreen from './src/screens/GuidesScreen';
import PartsScreen from './src/screens/PartsScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GetVerifiedScreen from './src/screens/GetVerifiedScreen';

const Tab = createBottomTabNavigator();
const CarsStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

// Cars tab = listings list + detail page
function CarsStackScreen() {
  return (
    <CarsStack.Navigator screenOptions={{
      headerTintColor: colors.greenDark,
      headerStyle: { backgroundColor: colors.glass, borderBottomWidth: 0.5, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
      headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3, color: colors.ink },
    }}>
      <CarsStack.Screen name="Listings" component={ListingsScreen} options={{ title: 'Cars for Sale' }} />
      <CarsStack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Car Details' }} />
      <CarsStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
    </CarsStack.Navigator>
  );
}

// More tab = insurance, guides, parts, profile
function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{
      headerTintColor: colors.greenDark,
      headerStyle: { backgroundColor: colors.glass, borderBottomWidth: 0.5, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
      headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3, color: colors.ink },
    }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} options={{ title: 'More' }} />
      <MoreStack.Screen name="Insurance" component={InsuranceScreen} options={{ title: 'Car Insurance' }} />
      <MoreStack.Screen name="PriceCheck" component={PriceCheckScreen} options={{ title: 'Market Price Check' }} />
      <MoreStack.Screen name="Guides" component={GuidesScreen} options={{ title: 'Guides & News' }} />
      <MoreStack.Screen name="Parts" component={PartsScreen} options={{ title: 'Car Parts' }} />
      <MoreStack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <MoreStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <MoreStack.Screen name="GetVerified" component={GetVerifiedScreen} options={{ title: 'Get Verified' }} />
    </MoreStack.Navigator>
  );
}

// Simple emoji icons keep the scaffold dependency-free.
// Swap for @expo/vector-icons when you want proper icons.
function icon(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.muted,
          // Floating translucent tab bar (Liquid Glass style)
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: colors.glass,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            elevation: 0,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: -0.2 },
          // Translucent headers to match
          headerStyle: {
            backgroundColor: colors.glass,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3, color: colors.ink },
        }}
      >
        <Tab.Screen name="Cars" component={CarsStackScreen} options={{ tabBarIcon: icon('🚗') }} />
        <Tab.Screen name="Reels" component={ReelsScreen} options={{ tabBarIcon: icon('🎬'), headerShown: true, title: 'Reels' }} />
        <Tab.Screen name="Post" component={PostScreen} options={{ tabBarIcon: icon('➕'), headerShown: true, title: 'Post to MagariHub' }} />
        <Tab.Screen name="Drivers" component={DriversScreen} options={{ tabBarIcon: icon('🧑‍✈️'), headerShown: true, title: 'Drivers for Hire' }} />
        <Tab.Screen name="More" component={MoreStackScreen} options={{ tabBarIcon: icon('☰') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

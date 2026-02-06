import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import AttractionsListScreen from '../screens/AttractionsListScreen';
import AttractionDetailsScreen from '../screens/AttractionDetailsScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import ItineraryListScreen from '../screens/ItineraryListScreen';
import ItineraryDetailsScreen from '../screens/ItineraryDetailsScreen';
import AboutScreen from '../screens/AboutScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();
const AttractionsStack = createNativeStackNavigator();
const ItinerariesStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const AttractionsStackNavigator = () => {
    return (
        <AttractionsStack.Navigator screenOptions={{ headerShown: false }}>
            <AttractionsStack.Screen name="AttractionsList" component={AttractionsListScreen} options={{ title: 'Attractions' }} />
            <AttractionsStack.Screen name="AttractionDetails" component={AttractionDetailsScreen} options={{ title: 'Details', headerShown: true }} />
            <AttractionsStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Write Review', headerShown: true }} />
        </AttractionsStack.Navigator>
    );
};

const ItinerariesStackNavigator = () => {
    return (
        <ItinerariesStack.Navigator screenOptions={{ headerShown: false }}>
            <ItinerariesStack.Screen name="ItineraryList" component={ItineraryListScreen} options={{ title: 'My Itineraries' }} />
            <ItinerariesStack.Screen name="ItineraryDetails" component={ItineraryDetailsScreen} options={{ headerShown: false }} />
        </ItinerariesStack.Navigator>
    );
};

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap = 'home';

                if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Attractions') {
                    iconName = focused ? 'location' : 'location-outline';
                } else if (route.name === 'Itineraries') {
                    iconName = focused ? 'map' : 'map-outline';
                } else if (route.name === 'About') {
                    iconName = focused ? 'information-circle' : 'information-circle-outline';
                } else if (route.name === 'Account') {
                    iconName = focused ? 'person' : 'person-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#D71A28',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
        })}
    >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Attractions" component={AttractionsStackNavigator} />
        <Tab.Screen name="Itineraries" component={ItinerariesStackNavigator} />
        <Tab.Screen name="About" component={AboutScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
);

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="MainTabs" component={MainTabs} />
                <RootStack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: true, title: 'Sign Up' }} />
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;

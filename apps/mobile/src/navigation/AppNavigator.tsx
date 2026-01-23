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

const Tab = createBottomTabNavigator();
const AttractionsStack = createNativeStackNavigator();
const ItinerariesStack = createNativeStackNavigator();

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

const AppNavigator = () => {
    return (
        <NavigationContainer>
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
            </Tab.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;

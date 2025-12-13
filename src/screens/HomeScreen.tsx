import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFeaturedAttractions, getItineraries } from '../services/database';
import { getFirstPhoto } from '../utils/attractionPhotos';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

const HomeScreen = () => {
    const navigation = useNavigation<any>();
    const [featuredAttractions, setFeaturedAttractions] = useState<any[]>([]);
    const [recentItineraries, setRecentItineraries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [attractions, itineraries] = await Promise.all([
                getFeaturedAttractions(),
                getItineraries()
            ]);
            setFeaturedAttractions(attractions.slice(0, 5));
            setRecentItineraries(itineraries.slice(0, 3));
        } catch (error) {
            console.error('Failed to load home data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                        <Text style={styles.headerTitle}>Explore Bahrain</Text>
                    </View>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>🇧🇭</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionCard}
                        onPress={() => navigation.navigate('Attractions')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#FFF0F0' }]}>
                            <Ionicons name="location" size={24} color="#D71A28" />
                        </View>
                        <Text style={styles.quickActionText}>Attractions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionCard}
                        onPress={() => navigation.navigate('Itineraries')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="map" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.quickActionText}>Itineraries</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionCard}
                        onPress={() => navigation.navigate('About')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="information-circle" size={24} color="#2196F3" />
                        </View>
                        <Text style={styles.quickActionText}>About</Text>
                    </TouchableOpacity>
                </View>

                {/* Featured Attractions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Attractions</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Attractions')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                    >
                        {featuredAttractions.map((attraction) => (
                            <TouchableOpacity
                                key={attraction.id}
                                style={styles.featuredCard}
                                onPress={() => navigation.navigate('Attractions', {
                                    screen: 'AttractionDetails',
                                    params: { attractionId: attraction.id }
                                })}
                                activeOpacity={0.9}
                            >
                                <Image
                                    source={getFirstPhoto(attraction.id)}
                                    style={styles.featuredImage}
                                />
                                <View style={styles.featuredOverlay}>
                                    <View style={styles.ratingBadge}>
                                        <Ionicons name="star" size={12} color="#FFD700" />
                                        <Text style={styles.ratingText}>{attraction.rating?.toFixed(1) || '0.0'}</Text>
                                    </View>
                                </View>
                                <View style={styles.featuredInfo}>
                                    <Text style={styles.featuredName} numberOfLines={1}>{attraction.name}</Text>
                                    <View style={styles.featuredMeta}>
                                        <Ionicons name="location-outline" size={12} color="#666" />
                                        <Text style={styles.featuredLocation}>{attraction.location}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* My Itineraries */}
                {recentItineraries.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>My Itineraries</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Itineraries')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {recentItineraries.map((itinerary) => (
                            <TouchableOpacity
                                key={itinerary.id}
                                style={styles.itineraryCard}
                                onPress={() => navigation.navigate('Itineraries', {
                                    screen: 'ItineraryDetails',
                                    params: { itineraryId: itinerary.id }
                                })}
                            >
                                <View style={styles.itineraryIcon}>
                                    <Ionicons name="map-outline" size={20} color="#D71A28" />
                                </View>
                                <View style={styles.itineraryInfo}>
                                    <Text style={styles.itineraryName}>{itinerary.name}</Text>
                                    <Text style={styles.itineraryMeta}>
                                        {itinerary.attraction_count || 0} stops • {itinerary.total_price?.toFixed(2) || '0.00'} BHD
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Create Itinerary CTA */}
                <TouchableOpacity
                    style={styles.ctaCard}
                    onPress={() => navigation.navigate('Itineraries')}
                >
                    <View style={styles.ctaContent}>
                        <Ionicons name="add-circle-outline" size={32} color="#D71A28" />
                        <View style={styles.ctaText}>
                            <Text style={styles.ctaTitle}>Plan Your Trip</Text>
                            <Text style={styles.ctaSubtitle}>Create a custom itinerary</Text>
                        </View>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color="#D71A28" />
                </TouchableOpacity>

                <View style={styles.footer} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    greeting: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoText: {
        fontSize: 28,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    quickActionCard: {
        alignItems: 'center',
    },
    quickActionIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    seeAll: {
        fontSize: 14,
        color: '#D71A28',
        fontWeight: '500',
    },
    carouselContent: {
        paddingLeft: 20,
        paddingRight: 8,
    },
    featuredCard: {
        width: CARD_WIDTH,
        marginRight: 12,
        borderRadius: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    featuredImage: {
        width: '100%',
        height: 140,
    },
    featuredOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    featuredInfo: {
        padding: 12,
    },
    featuredName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    featuredMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    featuredLocation: {
        fontSize: 12,
        color: '#666',
    },
    itineraryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    itineraryIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#FFF0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itineraryInfo: {
        flex: 1,
    },
    itineraryName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    itineraryMeta: {
        fontSize: 12,
        color: '#666',
    },
    ctaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D71A28',
        borderStyle: 'dashed',
    },
    ctaContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    ctaText: {},
    ctaTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    ctaSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    footer: {
        height: 40,
    },
});

export default HomeScreen;

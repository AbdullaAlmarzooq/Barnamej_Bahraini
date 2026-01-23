import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAttractionById, getReviewsForAttraction } from '../services/database';
import Button from '../components/Button';
import { getPhotosForAttraction } from '../utils/attractionPhotos';

const { width } = Dimensions.get('window');

const AttractionDetailsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { attractionId } = route.params;

    const [attraction, setAttraction] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [activeSlide, setActiveSlide] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    const attractionData = await getAttractionById(attractionId);
                    if (attractionData) {
                        setAttraction(attractionData);
                        const reviewsData = await getReviewsForAttraction(attractionId);
                        setReviews(reviewsData);
                    } else {
                        Alert.alert('Error', 'Attraction not found.');
                        navigation.goBack();
                    }
                } catch (error) {
                    Alert.alert('Error', 'Failed to load attraction details.');
                    console.error(error);
                }
            };
            loadData();
        }, [attractionId])
    );

    if (!attraction) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    const renderRatingRow = (label: string, rating: number) => (
        <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{label}</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= Math.round(rating) ? "star" : "star-outline"}
                        size={16}
                        color="#FFD700"
                    />
                ))}
            </View>
        </View>
    );

    const calculateAverage = (field: string) => {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + (r[field] || 0), 0);
        return sum / reviews.length;
    };

    const priceRating = calculateAverage('price_rating');
    const cleanlinessRating = calculateAverage('cleanliness_rating');
    const serviceRating = calculateAverage('service_rating');
    const experienceRating = calculateAverage('experience_rating');

    const photos = getPhotosForAttraction(attraction.id);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.carouselContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={({ nativeEvent }) => {
                            const slide = Math.ceil(nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width);
                            if (slide !== activeSlide) setActiveSlide(slide);
                        }}
                        scrollEventThrottle={16}
                    >
                        {photos.map((photo: any, index: number) => (
                            <Image key={index} source={photo} style={styles.image} />
                        ))}
                    </ScrollView>
                    {photos.length > 1 && (
                        <View style={styles.pagination}>
                            {photos.map((_: any, index: number) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.paginationDot,
                                        index === activeSlide ? styles.paginationDotActive : null
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{attraction.name}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{attraction.category}</Text>
                        </View>
                    </View>

                    <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={20} color="#666" />
                        <Text style={styles.location}>{attraction.location}</Text>
                    </View>

                    <Text style={styles.description}>{attraction.description}</Text>

                    <View style={styles.ratingsSection}>
                        <Text style={styles.sectionTitle}>Ratings</Text>
                        <View style={styles.overallRating}>
                            <Text style={styles.overallScore}>{attraction.rating.toFixed(1)}</Text>
                            <View>
                                <View style={{ flexDirection: 'row' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Ionicons
                                            key={star}
                                            name={star <= Math.round(attraction.rating) ? "star" : "star-outline"}
                                            size={20}
                                            color="#FFD700"
                                        />
                                    ))}
                                </View>
                                <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
                            </View>
                        </View>

                        <View style={styles.breakdown}>
                            {renderRatingRow('Price', priceRating)}
                            {renderRatingRow('Cleanliness', cleanlinessRating)}
                            {renderRatingRow('Service', serviceRating)}
                            {renderRatingRow('Experience', experienceRating)}
                        </View>
                    </View>

                    <View style={styles.actionButtons}>
                        <Button
                            title="Add to Itinerary"
                            onPress={() => navigation.navigate('Itineraries', { screen: 'ItineraryList', params: { addToItineraryId: attraction.id } })}
                            style={styles.button}
                        />
                        <Button
                            title="Write a Review"
                            onPress={() => navigation.navigate('WriteReview', { attractionId: attraction.id })}
                            variant="outline"
                            style={styles.button}
                        />
                    </View>

                    <View style={styles.reviewsSection}>
                        <Text style={styles.sectionTitle}>Recent Reviews</Text>
                        {reviews.length === 0 ? (
                            <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
                        ) : (
                            reviews.map((review) => (
                                <View key={review.id} style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <Text style={styles.reviewerName}>{review.name}</Text>
                                        <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.reviewComment}>{review.comment}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    carouselContainer: {
        height: 250,
        position: 'relative',
    },
    image: {
        width: width,
        height: 250,
        resizeMode: 'cover',
    },
    pagination: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    paginationDotActive: {
        backgroundColor: '#fff',
        width: 24,
    },
    content: {
        padding: 20,
        marginTop: -20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 10,
    },
    badge: {
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: {
        color: '#D71A28',
        fontWeight: '600',
        fontSize: 12,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    location: {
        fontSize: 16,
        color: '#666',
        marginLeft: 4,
    },
    description: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    ratingsSection: {
        marginBottom: 24,
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 16,
    },
    overallRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    overallScore: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginRight: 16,
    },
    reviewCount: {
        color: '#666',
        marginTop: 4,
    },
    breakdown: {
        gap: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingLabel: {
        fontSize: 14,
        color: '#666',
    },
    starsContainer: {
        flexDirection: 'row',
    },
    actionButtons: {
        gap: 12,
        marginBottom: 24,
    },
    button: {
        width: '100%',
    },
    reviewsSection: {
        marginTop: 8,
    },
    noReviews: {
        color: '#666',
        fontStyle: 'italic',
    },
    reviewCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    reviewerName: {
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    reviewDate: {
        color: '#999',
        fontSize: 12,
    },
    reviewComment: {
        color: '#444',
        lineHeight: 20,
    },
});

export default AttractionDetailsScreen;

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createReview } from '@barnamej/supabase-client';
import Button from '../components/Button';

const WriteReviewScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { attractionId } = route.params;

    const [name, setName] = useState('');
    const [comment, setComment] = useState('');
    const [ratings, setRatings] = useState({
        price: 0,
        cleanliness: 0,
        service: 0,
        experience: 0,
    });

    const handleRatingChange = (category: keyof typeof ratings, value: number) => {
        setRatings(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = async () => {
        if (!name.trim() || !comment.trim() || Object.values(ratings).some(r => r === 0)) {
            Alert.alert('Error', 'Please fill in all fields and provide all ratings.');
            return;
        }

        try {
            const { error } = await createReview({
                attraction_id: String(attractionId),
                reviewer_name: name,
                price_rating: ratings.price,
                cleanliness_rating: ratings.cleanliness,
                service_rating: ratings.service,
                experience_rating: ratings.experience,
                comment,
            });
            if (error) throw error;

            Alert.alert('Success', 'Thank you for your feedback!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to submit review. Please try again.');
            console.error(error);
        }
    };

    const renderStarInput = (label: string, category: keyof typeof ratings) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => handleRatingChange(category, star)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={star <= ratings[category] ? "star" : "star-outline"}
                            size={32}
                            color="#FFD700"
                            style={styles.star}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Write a Review</Text>
                <Text style={styles.subtitle}>Share your experience with others</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Your Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    {renderStarInput('Price', 'price')}
                    {renderStarInput('Cleanliness', 'cleanliness')}
                    {renderStarInput('Service', 'service')}
                    {renderStarInput('Experience', 'experience')}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Comment</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Tell us about your visit..."
                            value={comment}
                            onChangeText={setComment}
                            multiline={true}
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <Button title="Submit Review" onPress={handleSubmit} style={styles.submitButton} />
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
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 120,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    star: {
        marginRight: 4,
    },
    submitButton: {
        marginTop: 16,
    },
});

export default WriteReviewScreen;

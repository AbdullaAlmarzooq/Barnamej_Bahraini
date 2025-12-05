import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AboutScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>About Barnamej Bahraini</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                </View>

                {/* Discover Bahrain */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Discover Bahrain</Text>
                    <Text style={styles.text}>
                        Barnamej Bahraini is your ultimate companion for exploring the Kingdom of Bahrain.
                        Whether you are a tourist or a local, discover hidden gems, historical landmarks,
                        and vibrant culture. Create personalized itineraries and share your experiences
                        with the community.
                    </Text>
                </View>

                {/* Vision 2030 Alignment */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vision 2030 Alignment</Text>
                    <Text style={styles.text}>
                        We are proud to align with Bahrain's Economic Vision 2030, focusing on:
                    </Text>
                    <View style={styles.visionItem}>
                        <Text style={styles.visionTitle}>Sustainability</Text>
                        <Text style={styles.visionText}>
                            Promoting eco‑friendly tourism and preserving Bahrain's natural and historical heritage for future generations.
                        </Text>
                    </View>
                    <View style={styles.visionItem}>
                        <Text style={styles.visionTitle}>Competitiveness</Text>
                        <Text style={styles.visionText}>
                            Showcasing Bahrain as a world‑class destination with high standards of service and hospitality.
                        </Text>
                    </View>
                    <View style={styles.visionItem}>
                        <Text style={styles.visionTitle}>Fairness</Text>
                        <Text style={styles.visionText}>
                            Providing a platform for all businesses, big and small, to reach visitors and ensuring transparent, honest reviews.
                        </Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Made with ❤️ in Bahrain</Text>
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
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D71A28',
        marginBottom: 8,
    },
    version: {
        color: '#666',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    text: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
    },
    visionItem: {
        marginTop: 16,
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#D71A28',
    },
    visionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    visionText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    footerText: {
        color: '#999',
    },
});

export default AboutScreen;

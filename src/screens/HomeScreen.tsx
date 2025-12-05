import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Barnamej Bahraini</Text>
                <Text style={styles.subtitle}>Debug Mode - App Loaded Successfully!</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#D71A28',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
    },
});

export default HomeScreen;

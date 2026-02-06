import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAttractions } from '@barnamej/supabase-client';
import AttractionCard from '../components/AttractionCard';

const AttractionsListScreen = () => {
    const navigation = useNavigation<any>();
    const [attractions, setAttractions] = useState<any[]>([]);
    const [filteredAttractions, setFilteredAttractions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = ['All', 'Historical', 'Landmark', 'Nature', 'Religious', 'Museum'];

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    const { data, error } = await getAttractions();
                    if (error) throw error;
                    const list = (data || []).map((a: any) => {
                        const numericId = typeof a.id === 'number' ? a.id : Number(a.id);
                        const rating = typeof a.avg_rating === 'number' ? a.avg_rating : (a.rating ?? 0);
                        const categoryRaw = (a.category || '').toString().replace(/_/g, ' ');
                        const category = categoryRaw.replace(/\b\w/g, (char: string) => char.toUpperCase());
                        return {
                            ...a,
                            id: Number.isNaN(numericId) ? a.id : numericId,
                            rating,
                            category,
                        };
                    });
                    setAttractions(list);
                    setFilteredAttractions(list);
                } catch (error) {
                    console.error('Failed to load attractions:', error);
                }
            };
            loadData();
        }, [])
    );

    useEffect(() => {
        filterAttractions();
    }, [searchQuery, selectedCategory, attractions]);

    const filterAttractions = () => {
        let result = attractions;

        if (selectedCategory !== 'All') {
            const selected = selectedCategory.toLowerCase();
            result = result.filter(a => (a.category || '').toLowerCase() === selected);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(a =>
                (a.name || '').toLowerCase().includes(query) ||
                (a.location || '').toLowerCase().includes(query)
            );
        }

        setFilteredAttractions(result);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={filteredAttractions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <AttractionCard
                        attraction={item}
                        onPress={() => navigation.navigate('AttractionDetails', { attractionId: item.id })}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <AttractionsHeader
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        categories={categories}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No attractions found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

interface AttractionsHeaderProps {
    searchQuery: string;
    setSearchQuery: (text: string) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    categories: string[];
}

const AttractionsHeader = ({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, categories }: AttractionsHeaderProps) => (
    <View style={styles.header}>
        <Text style={styles.title}>Explore Bahrain</Text>

        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search attractions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>

        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((category) => (
                <TouchableOpacity
                    key={category}
                    style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                >
                    <Text style={[
                        styles.categoryText,
                        selectedCategory === category && styles.categoryTextActive
                    ]}>
                        {category}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    listContent: {
        padding: 20,
        paddingTop: 10,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    categoriesContainer: {
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    categoryChipActive: {
        backgroundColor: '#D71A28',
        borderColor: '#D71A28',
    },
    categoryText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    categoryTextActive: {
        color: '#fff',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});

export default AttractionsListScreen;

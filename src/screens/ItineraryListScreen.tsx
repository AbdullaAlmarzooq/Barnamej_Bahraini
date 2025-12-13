import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Switch } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getItineraries, getPublicItineraries, createItinerary, addToItinerary, getItineraryDetails } from '../services/database';
import Button from '../components/Button';

const ItineraryListScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');
    const [itineraries, setItineraries] = useState<any[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newItineraryName, setNewItineraryName] = useState('');
    const [newItineraryDesc, setNewItineraryDesc] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    // Check if we are in "Add to Itinerary" mode
    const addToItineraryId = route.params?.addToItineraryId;

    useFocusEffect(
        useCallback(() => {
            loadItineraries();
        }, [activeTab])
    );

    const loadItineraries = async () => {
        try {
            let data = [];
            if (activeTab === 'my') {
                data = await getItineraries();
            } else {
                data = await getPublicItineraries();
            }

            // The server now returns attraction_count in the list response
            setItineraries(data.map((it: any) => ({
                ...it,
                count: it.attraction_count || 0
            })));
        } catch (error) {
            Alert.alert('Error', 'Failed to load itineraries.');
            console.error(error);
        }
    };

    const handleCreateItinerary = async () => {
        if (!newItineraryName.trim()) {
            Alert.alert('Error', 'Please enter a name for your itinerary.');
            return;
        }

        try {
            await createItinerary(newItineraryName, newItineraryDesc, isPublic);
            setNewItineraryName('');
            setNewItineraryDesc('');
            setIsPublic(false);
            setIsModalVisible(false);
            loadItineraries();
        } catch (error) {
            Alert.alert('Error', 'Failed to create itinerary.');
            console.error(error);
        }
    };

    const handleItineraryPress = async (itinerary: any) => {
        console.log('handleItineraryPress called for itinerary:', itinerary.id, itinerary.name);
        console.log('addToItineraryId:', addToItineraryId);

        if (addToItineraryId) {
            // Add attraction to this itinerary
            console.log('IN ADD MODE: Adding attraction', addToItineraryId, 'to itinerary', itinerary.id);
            try {
                await addToItinerary(itinerary.id, addToItineraryId);
                Alert.alert('Success', 'Attraction added to itinerary!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } catch (error) {
                Alert.alert('Error', 'Failed to add to itinerary.');
                console.error(error);
            }
        } else {
            // Navigate to details
            console.log('NAVIGATING to ItineraryDetails with itineraryId:', itinerary.id);
            navigation.navigate('ItineraryDetails', { itineraryId: itinerary.id });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {addToItineraryId ? 'Select Itinerary' : 'Itineraries'}
                </Text>
            </View>

            {!addToItineraryId && (
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'my' && styles.activeTab]}
                        onPress={() => setActiveTab('my')}
                    >
                        <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>My Itineraries</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'community' && styles.activeTab]}
                        onPress={() => setActiveTab('community')}
                    >
                        <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>Community</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={itineraries}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleItineraryPress(item)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itineraryName}>{item.name}</Text>
                                {item.description ? <Text style={styles.description} numberOfLines={1}>{item.description}</Text> : null}
                                <View style={styles.metaRow}>
                                    <Text style={styles.itineraryCount}>{item.count} stops</Text>
                                    <Text style={styles.separator}>•</Text>
                                    <Text style={styles.price}>{item.total_price ? `${item.total_price} BHD` : 'Free'}</Text>
                                </View>
                                {activeTab === 'community' && (
                                    <Text style={styles.creator}>By {item.creator_name || 'Unknown'}</Text>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {activeTab === 'my' ? "You haven't created any itineraries yet." : "No community itineraries found."}
                        </Text>
                    </View>
                }
            />

            {activeTab === 'my' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setIsModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={32} color="#fff" />
                </TouchableOpacity>
            )}

            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Itinerary</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Itinerary Name (e.g., Weekend Trip)"
                            placeholderTextColor="#999"
                            value={newItineraryName}
                            onChangeText={setNewItineraryName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Description (Optional)"
                            placeholderTextColor="#999"
                            value={newItineraryDesc}
                            onChangeText={setNewItineraryDesc}
                        />
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Public (Visible to Community)</Text>
                            <Switch
                                value={isPublic}
                                onValueChange={setIsPublic}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setIsModalVisible(false)}
                                variant="secondary"
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <Button
                                title="Create"
                                onPress={handleCreateItinerary}
                                style={{ flex: 1, marginLeft: 8 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    tabs: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 0,
    },
    tab: {
        marginRight: 20,
        paddingBottom: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#D71A28',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#D71A28',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 20,
        paddingBottom: 80,
        backgroundColor: '#f8f9fa',
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itineraryName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itineraryCount: {
        fontSize: 14,
        color: '#666',
    },
    separator: {
        marginHorizontal: 8,
        color: '#ccc',
    },
    price: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D71A28',
    },
    creator: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#D71A28',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#1a1a1a',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    switchLabel: {
        fontSize: 16,
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
    },
});

export default ItineraryListScreen;

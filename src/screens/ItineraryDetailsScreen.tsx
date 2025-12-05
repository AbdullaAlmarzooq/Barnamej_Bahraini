import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Modal, TextInput, ScrollView } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getItineraryDetails, removeFromItinerary, deleteItinerary, updateItineraryAttraction } from '../services/database';
import { getFirstPhoto } from '../utils/attractionPhotos';
import Button from '../components/Button';

const ItineraryDetailsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { itineraryId } = route.params;

    const [itinerary, setItinerary] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [itineraryId])
    );

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getItineraryDetails(itineraryId);
            if (data) {
                console.log('Loaded itinerary with', data.attractions?.length || 0, 'attractions');
                setItinerary(data);
            } else {
                Alert.alert('Error', 'Itinerary not found or failed to load.');
                navigation.goBack();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load itinerary details.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteItinerary = () => {
        Alert.alert(
            'Delete Itinerary',
            'Are you sure you want to delete this itinerary?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteItinerary(itineraryId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete itinerary.');
                        }
                    },
                },
            ]
        );
    };

    const handleRemoveAttraction = (attractionId: number) => {
        Alert.alert(
            'Remove Attraction',
            'Remove this attraction from itinerary?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeFromItinerary(itineraryId, attractionId);
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove attraction.');
                        }
                    },
                },
            ]
        );
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setStartTime(item.start_time || '');
        setEndTime(item.end_time || '');
        setPrice(item.price ? item.price.toString() : '');
        setNotes(item.notes || '');
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            await updateItineraryAttraction(editingItem.link_id, startTime, endTime, parseFloat(price) || 0, notes);
            setEditingItem(null);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update details.');
        }
    };

    if (!itinerary) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteItinerary}>
                        <Ionicons name="trash-outline" size={24} color="#D71A28" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.title}>{itinerary.name}</Text>
                {itinerary.description ? <Text style={styles.description}>{itinerary.description}</Text> : null}
                <View style={styles.statsRow}>
                    <Text style={styles.subtitle}>{itinerary.attractions.length} stops</Text>
                    <Text style={styles.totalPrice}>Total: {itinerary.total_price ? itinerary.total_price.toFixed(2) : '0.00'} BHD</Text>
                </View>
            </View>

            <FlatList
                data={itinerary.attractions}
                keyExtractor={(item) => item.link_id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.cardMain}
                            onPress={() => navigation.navigate('Attractions', { screen: 'AttractionDetails', params: { attractionId: item.id } })}
                            activeOpacity={0.9}
                        >
                            <Image source={getFirstPhoto(item.id)} style={styles.image} />
                            <View style={styles.cardContent}>
                                <Text style={styles.attractionName}>{item.name}</Text>
                                <Text style={styles.category}>{item.category}</Text>
                                <View style={styles.detailsRow}>
                                    <Text style={styles.detailText}>
                                        <Ionicons name="time-outline" size={14} /> {item.start_time || '--:--'} - {item.end_time || '--:--'}
                                    </Text>
                                    <Text style={styles.detailText}>
                                        <Ionicons name="pricetag-outline" size={14} /> {item.price ? `${item.price} BHD` : 'Free'}
                                    </Text>
                                </View>
                                {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
                            </View>
                        </TouchableOpacity>
                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                                <Ionicons name="create-outline" size={20} color="#666" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveAttraction(item.id)}>
                                <Ionicons name="trash-outline" size={20} color="#D71A28" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No attractions in this itinerary yet.</Text>
                        <Button
                            title="Browse Attractions"
                            onPress={() => navigation.navigate('Attractions', { screen: 'AttractionsList' })}
                            style={styles.browseButton}
                        />
                    </View>
                }
            />

            {/* Edit Modal */}
            <Modal
                visible={!!editingItem}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditingItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Attraction</Text>
                        <View style={styles.inputRow}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Start Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="09:00 AM"
                                    placeholderTextColor="#999"
                                    value={startTime}
                                    onChangeText={setStartTime}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>End Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="11:00 AM"
                                    placeholderTextColor="#999"
                                    value={endTime}
                                    onChangeText={setEndTime}
                                />
                            </View>
                        </View>
                        <Text style={styles.label}>Price (BHD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor="#999"
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                        />
                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add notes..."
                            placeholderTextColor="#999"
                            value={notes}
                            onChangeText={setNotes}
                            multiline={true}
                            returnKeyType="done"
                            blurOnSubmit={true}
                        />
                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setEditingItem(null)}
                                variant="secondary"
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <Button
                                title="Save"
                                onPress={handleSaveEdit}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D71A28',
    },
    listContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    attractionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    category: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    detailText: {
        fontSize: 12,
        color: '#555',
        marginRight: 12,
    },
    notes: {
        fontSize: 12,
        color: '#777',
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: '#eee',
        height: '100%',
    },
    actionButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    browseButton: {
        minWidth: 200,
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
        marginBottom: 4,
        color: '#1a1a1a',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputContainer: {
        flex: 1,
        marginRight: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 8,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 16,
    },
});

export default ItineraryDetailsScreen;

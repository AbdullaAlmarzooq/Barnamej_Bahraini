import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getItineraryDetails, removeFromItinerary, deleteItinerary, updateItineraryAttraction, toggleItineraryAutoSort, reorderItineraryAttractions } from '../services/database';
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

    const handleToggleAutoSort = async (value: boolean) => {
        try {
            // Optimistic update
            setItinerary((prev: any) => ({ ...prev, is_auto_sort_enabled: value ? 1 : 0 }));
            await toggleItineraryAutoSort(itineraryId, value);
            loadData(); // Reload to get sorted list if enabled
        } catch (error) {
            Alert.alert('Error', 'Failed to toggle auto-sort.');
            loadData(); // Revert on error
        }
    };

    const handleMoveAttraction = async (index: number, direction: 'up' | 'down') => {
        if (!itinerary.attractions) return;

        const newAttractions = [...itinerary.attractions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (swapIndex < 0 || swapIndex >= newAttractions.length) return;

        // Swap items
        [newAttractions[index], newAttractions[swapIndex]] = [newAttractions[swapIndex], newAttractions[index]];

        // Optimistic update for smooth UI
        setItinerary((prev: any) => ({ ...prev, attractions: newAttractions }));

        try {
            // Create ordered list of link_ids (which serves as the "identity" for the attraction in the itinerary)
            const orderedLinkIds = newAttractions.map((item: any) => item.link_id);
            await reorderItineraryAttractions(itineraryId, orderedLinkIds);
            // No need to reload data immediately as we optimistically updated, 
            // but reloading ensures full consistency
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to reorder attractions.');
            loadData(); // Revert on error
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
            {/* Fixed Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{itinerary.name}</Text>
                    <TouchableOpacity onPress={handleDeleteItinerary}>
                        <Ionicons name="trash-outline" size={22} color="#D71A28" />
                    </TouchableOpacity>
                </View>

                {/* Summary Row */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Ionicons name="person-outline" size={16} color="#666" />
                        <Text style={styles.summaryText}>{itinerary.creator_name || 'Me'}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.summaryText}>{itinerary.attractions?.length || 0} stops</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="cash-outline" size={16} color="#D71A28" />
                        <Text style={[styles.summaryText, styles.priceText]}>
                            {itinerary.total_price ? itinerary.total_price.toFixed(2) : '0.00'} BHD
                        </Text>
                    </View>
                </View>

                {/* Auto-Sort Toggle */}
                <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Auto-sort attractions by time</Text>
                    <Switch
                        trackColor={{ false: "#767577", true: "#D71A28" }}
                        thumbColor={itinerary.is_auto_sort_enabled ? "#fff" : "#f4f3f4"}
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={handleToggleAutoSort}
                        value={itinerary.is_auto_sort_enabled === 1}
                        disabled={itinerary.is_public === 1}
                    />
                </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                {itinerary.description ? (
                    <Text style={styles.description}>{itinerary.description}</Text>
                ) : null}

                {itinerary.attractions?.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="map-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No attractions added yet</Text>
                        <Button
                            title="Browse Attractions"
                            onPress={() => navigation.navigate('Attractions', { screen: 'AttractionsList' })}
                            style={styles.browseButton}
                        />
                    </View>
                ) : (
                    itinerary.attractions?.map((item: any, index: number) => (
                        <View key={item.link_id} style={styles.card}>
                            <View style={styles.cardNumber}>
                                <Text style={styles.cardNumberText}>{index + 1}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.cardMain}
                                onPress={() => navigation.navigate('Attractions', { screen: 'AttractionDetails', params: { attractionId: item.id } })}
                                activeOpacity={0.8}
                            >
                                <Image source={getFirstPhoto(item.id)} style={styles.image} />
                                <View style={styles.cardContent}>
                                    <Text style={styles.attractionName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.cardMeta}>
                                        <Text style={styles.category}>{item.category}</Text>
                                        <Text style={styles.timeText}>
                                            {item.start_time || '--:--'} - {item.end_time || '--:--'}
                                        </Text>
                                    </View>
                                    {item.price ? (
                                        <Text style={styles.priceTag}>{item.price} BHD</Text>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                            <View style={styles.actions}>
                                {/* Manual Reorder Buttons */}
                                {(!itinerary.is_auto_sort_enabled && !itinerary.is_public) && (
                                    <View style={styles.reorderButtons}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, index === 0 && styles.disabledButton]}
                                            onPress={() => handleMoveAttraction(index, 'up')}
                                            disabled={index === 0}
                                        >
                                            <Ionicons name="chevron-up" size={20} color={index === 0 ? "#ccc" : "#666"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, index === (itinerary.attractions.length - 1) && styles.disabledButton]}
                                            onPress={() => handleMoveAttraction(index, 'down')}
                                            disabled={index === (itinerary.attractions.length - 1)}
                                        >
                                            <Ionicons name="chevron-down" size={20} color={index === (itinerary.attractions.length - 1) ? "#ccc" : "#666"} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                                    <Ionicons name="create-outline" size={18} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveAttraction(item.id)}>
                                    <Ionicons name="close-circle-outline" size={18} color="#D71A28" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

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
        </SafeAreaView >
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
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        backgroundColor: '#f8f9fa',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginHorizontal: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    summaryText: {
        fontSize: 13,
        color: '#666',
    },
    priceText: {
        color: '#D71A28',
        fontWeight: '600',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    toggleLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    scrollContent: {
        flex: 1,
    },
    scrollInner: {
        padding: 16,
        paddingBottom: 40,
        backgroundColor: '#f8f9fa',
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D71A28',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 6,
        marginRight: 10,
    },
    cardContent: {
        flex: 1,
    },
    attractionName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 8,
    },
    category: {
        fontSize: 11,
        color: '#999',
    },
    timeText: {
        fontSize: 11,
        color: '#666',
    },
    priceTag: {
        fontSize: 12,
        color: '#D71A28',
        fontWeight: '500',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButton: {
        padding: 6,
    },
    reorderButtons: {
        flexDirection: 'column',
        marginRight: 4,
    },
    disabledButton: {
        opacity: 0.3,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 12,
        marginBottom: 20,
    },
    browseButton: {
        minWidth: 180,
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

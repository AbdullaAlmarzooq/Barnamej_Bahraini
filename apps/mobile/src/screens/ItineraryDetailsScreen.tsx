import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
    getItineraryWithAttractions,
    removeAttractionFromItinerary,
    deleteItinerary,
    updateItineraryAttraction,
    toggleAutoSort,
    reorderItineraryAttractions,
    updateItinerary
} from '@barnamej/supabase-client';
import { getFirstPhoto } from '../utils/attractionPhotos';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { getPublicImageUrl } from '../utils/supabaseStorage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const ItineraryDetailsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { itineraryId } = route.params;
    const { user } = useAuth();

    const [itinerary, setItinerary] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [startTimeValue, setStartTimeValue] = useState<Date | null>(null);
    const [endTimeValue, setEndTimeValue] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [itineraryId])
    );

    const normalizeItinerary = (data: any) => {
        const normalizedAttractions = (data.attractions || []).map((item: any) => {
            const attractionId = item.attraction?.id;
            const numericId = typeof attractionId === 'number' ? attractionId : Number(attractionId);
            const categoryRaw = (item.attraction?.category || '').toString().replace(/_/g, ' ');
            return {
                link_id: item.id,
                start_time: item.scheduled_start_time,
                end_time: item.scheduled_end_time,
                price: item.custom_price ?? item.attraction?.price ?? 0,
                notes: item.notes,
                id: Number.isNaN(numericId) ? attractionId : numericId,
                name: item.attraction?.name,
                category: categoryRaw.replace(/\b\w/g, (char: string) => char.toUpperCase()),
                estimated_duration_minutes: item.attraction?.estimated_duration_minutes ?? 0,
                primary_photo_bucket: item.attraction?.primary_photo_bucket,
                primary_photo_path: item.attraction?.primary_photo_path,
            };
        });

        const mode = data.mode ?? data.itinerary_mode;
        const sortedAttractions = mode === 'scheduled'
            ? normalizedAttractions.sort((a: any, b: any) => {
                const aTime = parseTimeToDate(a.start_time)?.getTime() ?? 0;
                const bTime = parseTimeToDate(b.start_time)?.getTime() ?? 0;
                return aTime - bTime;
            })
            : normalizedAttractions;

        return {
            ...data,
            is_public: Boolean(data.is_public),
            auto_sort_enabled: Boolean(data.auto_sort_enabled),
            mode,
            attractions: sortedAttractions,
        };
    };

    const isOwner = itinerary?.user_id && user?.id === itinerary.user_id;
    const canEdit = isOwner && !itinerary?.is_public;

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await getItineraryWithAttractions(String(itineraryId));
            if (error) throw error;
            if (data) {
                const normalized = normalizeItinerary(data);
                console.log('Loaded itinerary with', normalized.attractions?.length || 0, 'attractions');
                setItinerary(normalized);
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
                            const { error } = await deleteItinerary(String(itineraryId));
                            if (error) throw error;
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete itinerary.');
                        }
                    },
                },
            ]
        );
    };

    const handleRemoveAttraction = (attractionId: string) => {
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
                            const { error } = await removeAttractionFromItinerary(String(itineraryId), String(attractionId));
                            if (error) throw error;
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove attraction.');
                        }
                    },
                },
            ]
        );
    };

    const parseTimeToDate = (value: string | null | undefined): Date | null => {
        if (!value) return null;
        const now = new Date();
        const trimmed = value.trim();
        const hmsMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (hmsMatch) {
            const hours = parseInt(hmsMatch[1], 10);
            const minutes = parseInt(hmsMatch[2], 10);
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        }
        const normalized = trimmed.includes(' ') && !trimmed.includes('T')
            ? trimmed.replace(' ', 'T')
            : trimmed;
        const iso = Date.parse(normalized);
        if (!Number.isNaN(iso)) {
            const d = new Date(iso);
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), d.getHours(), d.getMinutes(), 0, 0);
        }
        const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (ampmMatch) {
            let hours = parseInt(ampmMatch[1], 10);
            const minutes = parseInt(ampmMatch[2], 10);
            const period = ampmMatch[3].toUpperCase();
            if (period === 'PM' && hours < 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        }
        const hmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
        if (hmMatch) {
            const hours = parseInt(hmMatch[1], 10);
            const minutes = parseInt(hmMatch[2], 10);
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        }
        return null;
    };

    const formatTime = (date: Date | null) => {
        if (!date) return '';
        const hours = date.getHours();
        const minutes = `${date.getMinutes()}`.padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        return `${displayHours}:${minutes} ${period}`;
    };

    const getScheduledDuration = () => {
        if (!itinerary?.attractions || itinerary.attractions.length === 0) return null;
        const times = itinerary.attractions
            .map((item: any) => ({
                start: parseTimeToDate(item.start_time),
                end: parseTimeToDate(item.end_time),
            }))
            .filter((t: any) => t.start && t.end);

        if (times.length === 0) return null;

        const earliest = times.reduce((min: Date, t: any) => (t.start < min ? t.start : min), times[0].start);
        const latest = times.reduce((max: Date, t: any) => (t.end > max ? t.end : max), times[0].end);
        const diffMs = latest.getTime() - earliest.getTime();
        if (diffMs <= 0) return null;
        const minutes = Math.round(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const rem = minutes % 60;
        return `${hours > 0 ? `${hours}h ` : ''}${rem}m`;
    };

    const getFlexibleDuration = () => {
        if (!itinerary?.attractions || itinerary.attractions.length === 0) return null;
        const totalMinutes = itinerary.attractions.reduce((sum: number, item: any) => {
            const minutes = item.estimated_duration_minutes ?? 0;
            return sum + minutes;
        }, 0);
        if (!totalMinutes) return null;
        const hours = Math.floor(totalMinutes / 60);
        const rem = totalMinutes % 60;
        return `${hours > 0 ? `${hours}h ` : ''}${rem}m`;
    };

    const onStartTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
        setShowStartPicker(false);
        if (selected) {
            setStartTimeValue(selected);
            setStartTime(formatTime(selected));
        }
    };

    const onEndTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
        setShowEndPicker(false);
        if (selected) {
            setEndTimeValue(selected);
            setEndTime(formatTime(selected));
        }
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        const startDate = parseTimeToDate(item.start_time);
        const endDate = parseTimeToDate(item.end_time);
        setStartTimeValue(startDate);
        setEndTimeValue(endDate);
        setStartTime(startDate ? formatTime(startDate) : '');
        setEndTime(endDate ? formatTime(endDate) : '');
        setPrice(item.price ? item.price.toString() : '');
        setNotes(item.notes || '');
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            const { error } = await updateItineraryAttraction(String(editingItem.link_id), {
                scheduled_start_time: startTime || null,
                scheduled_end_time: endTime || null,
                custom_price: price ? parseFloat(price) : null,
                notes: notes || null,
            });
            if (error) throw error;
            setEditingItem(null);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update details.');
        }
    };

    const handleToggleAutoSort = async (value: boolean) => {
        if (value) {
            const missingTimes = itinerary?.attractions?.some(
                (item: any) => !item.start_time || !item.end_time
            );
            if (missingTimes) {
                Alert.alert(
                    'Missing Times',
                    'Please enter start and end times for all attractions before enabling auto-sort.'
                );
                return;
            }
        }

        try {
            // Optimistic update
            setItinerary((prev: any) => ({ ...prev, auto_sort_enabled: value }));
            const { error } = await toggleAutoSort(String(itineraryId), value);
            if (error) throw error;

            if (value) {
                const { error: modeError } = await updateItinerary(String(itineraryId), { mode: 'scheduled' });
                if (modeError) throw modeError;
            }

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
            const { error } = await reorderItineraryAttractions(String(itineraryId), orderedLinkIds);
            if (error) throw error;
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
                        {canEdit ? (
                            <TouchableOpacity onPress={handleDeleteItinerary}>
                                <Ionicons name="trash-outline" size={22} color="#D71A28" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.headerSpacer} />
                        )}
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
                    {itinerary.mode === 'scheduled' ? (
                        <View style={styles.summaryItem}>
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={styles.summaryText}>{getScheduledDuration() || '-'}</Text>
                        </View>
                    ) : (
                        <View style={styles.summaryItem}>
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={styles.summaryText}>{getFlexibleDuration() || '-'}</Text>
                        </View>
                    )}
                    <View style={styles.summaryItem}>
                        <Ionicons name="cash-outline" size={16} color="#D71A28" />
                        <Text style={[styles.summaryText, styles.priceText]}>
                            {itinerary.total_price ? itinerary.total_price.toFixed(2) : '0.00'} BHD
                        </Text>
                    </View>
                </View>

                {/* Auto-Sort Toggle */}
                {canEdit && (
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Auto-sort attractions by time</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#D71A28" }}
                            thumbColor={itinerary.auto_sort_enabled ? "#fff" : "#f4f3f4"}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={handleToggleAutoSort}
                            value={itinerary.auto_sort_enabled === true}
                        />
                    </View>
                )}
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
                                <Image
                                    source={(() => {
                                        const publicUrl = getPublicImageUrl(item.primary_photo_bucket, item.primary_photo_path);
                                        return publicUrl ? { uri: publicUrl } : getFirstPhoto(item.id);
                                    })()}
                                    style={styles.image}
                                />
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
                                {(canEdit && ((itinerary.mode === 'manual' || itinerary.mode === 'flexible') || (!itinerary.mode && !itinerary.auto_sort_enabled))) && (
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
                                {canEdit && (
                                    <>
                                        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                                            <Ionicons name="create-outline" size={18} color="#666" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveAttraction(item.id)}>
                                            <Ionicons name="close-circle-outline" size={18} color="#D71A28" />
                                        </TouchableOpacity>
                                    </>
                                )}
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
                                <TouchableOpacity onPress={() => setShowStartPicker(true)} activeOpacity={0.8}>
                                    <View pointerEvents="none">
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Select time"
                                            placeholderTextColor="#999"
                                            value={startTime}
                                            editable={false}
                                        />
                                    </View>
                                </TouchableOpacity>
                                {showStartPicker && (
                                    <DateTimePicker
                                        value={startTimeValue || new Date()}
                                        mode="time"
                                        display="default"
                                        onChange={onStartTimeChange}
                                    />
                                )}
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>End Time</Text>
                                <TouchableOpacity onPress={() => setShowEndPicker(true)} activeOpacity={0.8}>
                                    <View pointerEvents="none">
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Select time"
                                            placeholderTextColor="#999"
                                            value={endTime}
                                            editable={false}
                                        />
                                    </View>
                                </TouchableOpacity>
                                {showEndPicker && (
                                    <DateTimePicker
                                        value={endTimeValue || new Date()}
                                        mode="time"
                                        display="default"
                                        onChange={onEndTimeChange}
                                    />
                                )}
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
    headerSpacer: {
        width: 22,
        height: 22,
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

import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Nationality } from '@barnamej/supabase-client';

type NationalityPickerFieldProps = {
    label: string;
    nationalities: Nationality[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    placeholder?: string;
    helperText?: string;
    disabled?: boolean;
    compact?: boolean;
};

const NationalityPickerField = ({
    label,
    nationalities,
    selectedId,
    onSelect,
    placeholder = 'Choose nationality',
    helperText,
    disabled = false,
    compact = false,
}: NationalityPickerFieldProps) => {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const selectedNationality = nationalities.find((item) => item.id === selectedId) ?? null;
    const filteredNationalities = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return nationalities;
        }

        return nationalities.filter((item) => {
            const haystack = `${item.name} ${item.code ?? ''}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [nationalities, search]);

    const closeModal = () => {
        setVisible(false);
        setSearch('');
    };

    return (
        <View style={compact ? styles.compactContainer : undefined}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                activeOpacity={0.85}
                disabled={disabled}
                onPress={() => setVisible(true)}
            >
                <View style={[styles.field, compact && styles.compactField, disabled && styles.disabledField]}>
                    <Ionicons name="globe-outline" size={20} color="#D71A28" />
                    <Text
                        numberOfLines={1}
                        style={selectedNationality ? styles.valueText : styles.placeholderText}
                    >
                        {selectedNationality?.name ?? placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#888" />
                </View>
            </TouchableOpacity>
            {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

            <Modal
                animationType="slide"
                transparent
                visible={visible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalRoot}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeModal} />

                    <View style={styles.sheet}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Choose Nationality</Text>
                            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                <Ionicons name="close" size={22} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBox}>
                            <Ionicons name="search-outline" size={18} color="#777" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search nationality"
                                value={search}
                                onChangeText={setSearch}
                                autoCapitalize="words"
                            />
                        </View>

                        <ScrollView
                            style={styles.optionsList}
                            contentContainerStyle={styles.optionsContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {filteredNationalities.map((item) => {
                                const selected = item.id === selectedId;

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            onSelect(item.id);
                                            closeModal();
                                        }}
                                        style={[styles.optionRow, selected && styles.optionRowSelected]}
                                    >
                                        <View style={styles.optionTextWrap}>
                                            <Text style={styles.optionName}>{item.name}</Text>
                                            {item.code ? <Text style={styles.optionCode}>{item.code}</Text> : null}
                                        </View>
                                        {selected ? (
                                            <Ionicons name="checkmark-circle" size={22} color="#D71A28" />
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}

                            {!filteredNationalities.length ? (
                                <Text style={styles.emptyState}>No nationality matched your search.</Text>
                            ) : null}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    compactContainer: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginBottom: 8,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: '#f9f9f9',
    },
    compactField: {
        minHeight: 54,
    },
    disabledField: {
        opacity: 0.6,
    },
    valueText: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    placeholderText: {
        flex: 1,
        fontSize: 16,
        color: '#999',
    },
    helperText: {
        marginTop: 8,
        fontSize: 12,
        lineHeight: 18,
        color: '#777',
    },
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.32)',
    },
    sheet: {
        maxHeight: '78%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 28,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f3f3',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#f8f8f8',
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111',
    },
    optionsList: {
        minHeight: 200,
    },
    optionsContent: {
        paddingBottom: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    optionRowSelected: {
        borderColor: '#f0b4b9',
        backgroundColor: '#fff6f7',
    },
    optionTextWrap: {
        flex: 1,
        paddingRight: 12,
    },
    optionName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    optionCode: {
        marginTop: 4,
        fontSize: 12,
        color: '#777',
    },
    emptyState: {
        textAlign: 'center',
        color: '#777',
        paddingVertical: 20,
        fontSize: 14,
    },
});

export default NationalityPickerField;

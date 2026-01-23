import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ title, onPress, style, textStyle, variant = 'primary' }) => {
    let backgroundColor = '#D71A28';
    let textColor = '#fff';
    let borderWidth = 0;
    let borderColor = 'transparent';

    if (variant === 'secondary') {
        backgroundColor = '#fff';
        textColor = '#D71A28';
    } else if (variant === 'outline') {
        backgroundColor = 'transparent';
        textColor = '#D71A28';
        borderWidth = 1;
        borderColor = '#D71A28';
    }

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor, borderWidth, borderColor }, style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Button;

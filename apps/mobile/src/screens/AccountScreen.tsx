import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '@barnamej/supabase-client';
import { Ionicons } from '@expo/vector-icons';

type Mode = 'signup' | 'login';

const AccountScreen = () => {
    const [mode, setMode] = useState<Mode>('signup');

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [birthdate, setBirthdate] = useState<Date | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS !== 'ios') {
            setShowDatePicker(false);
        }
        if (selected) {
            setBirthdate(selected);
        }
    };

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setBirthdate(null);
        setPassword('');
        setShowPassword(false);
        setError(null);
        setShowDatePicker(false);
    };

    const handleSignUp = async () => {
        setError(null);

        if (!fullName.trim() || !email.trim() || !birthdate || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        const birthdateValue = formatDate(birthdate);

        setLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) {
                setError('Supabase URL is missing. Check EXPO_PUBLIC_SUPABASE_URL in root .env');
                setLoading(false);
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        birthdate: birthdateValue,
                    }
                }
            });

            if (signUpError) {
                console.error('[Auth] signUp error:', signUpError);
                throw signUpError;
            }

            const userId = data.user?.id;
            if (userId) {
                const now = new Date().toISOString();
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        email: email.trim(),
                        full_name: fullName.trim(),
                        birthdate: birthdateValue,
                        created_at: now,
                        updated_at: now,
                    });

                if (profileError) {
                    console.error('[Profiles] upsert error:', profileError);
                    throw profileError;
                }
            }

            Alert.alert('Account Created', 'Please check your email to confirm your account.');
            resetForm();
        } catch (err: any) {
            console.error('[SignUp] exception:', err);
            setError(err?.message || 'Sign up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setError(null);

        if (!email.trim() || !password.trim()) {
            setError('Please enter email and password.');
            return;
        }

        setLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) {
                setError('Supabase URL is missing. Check EXPO_PUBLIC_SUPABASE_URL in root .env');
                setLoading(false);
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                console.error('[Auth] signIn error:', signInError);
                throw signInError;
            }

            Alert.alert('Welcome back', 'You are now logged in.');
        } catch (err: any) {
            console.error('[Login] exception:', err);
            setError(err?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</Text>
                    <Text style={styles.subtitle}>
                        {mode === 'signup'
                            ? 'Join Barnamej Bahraini in a few steps.'
                            : 'Log in to access your saved plans.'}
                    </Text>
                </View>

                <View style={styles.form}>
                    {mode === 'signup' && (
                        <>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your full name"
                                value={fullName}
                                onChangeText={setFullName}
                                autoCapitalize="words"
                            />
                        </>
                    )}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    {mode === 'signup' && (
                        <>
                            <Text style={styles.label}>Birthdate</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                                <View pointerEvents="none">
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Select date"
                                        value={formatDate(birthdate)}
                                        editable={false}
                                    />
                                </View>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={styles.datePicker}>
                                    <DateTimePicker
                                        value={birthdate || new Date(2000, 0, 1)}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        maximumDate={new Date()}
                                    />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity style={styles.dateDone} onPress={() => setShowDatePicker(false)}>
                                            <Text style={styles.dateDoneText}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    )}

                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={[styles.input, styles.passwordInput]}
                            placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.passwordToggle}
                            onPress={() => setShowPassword((prev) => !prev)}
                            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#666"
                            />
                        </TouchableOpacity>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={mode === 'signup' ? handleSignUp : handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{mode === 'signup' ? 'Sign Up' : 'Log In'}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchRow}
                        onPress={() => {
                            setMode(mode === 'signup' ? 'login' : 'signup');
                            setError(null);
                        }}
                    >
                        <Text style={styles.switchText}>
                            {mode === 'signup'
                                ? 'Already have an account? Log in'
                                : "Don't have an account? Sign up"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        padding: 20,
        paddingTop: 32,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#eee',
    },
    label: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111',
    },
    passwordRow: {
        position: 'relative',
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: 44,
    },
    passwordToggle: {
        position: 'absolute',
        right: 12,
        height: '100%',
        justifyContent: 'center',
    },
    button: {
        marginTop: 20,
        backgroundColor: '#D71A28',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    errorText: {
        marginTop: 12,
        color: '#D71A28',
        fontSize: 13,
    },
    switchRow: {
        marginTop: 14,
        alignItems: 'center',
    },
    switchText: {
        color: '#D71A28',
        fontSize: 13,
        fontWeight: '600',
    },
    datePicker: {
        marginTop: 10,
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 10,
        padding: 8,
    },
    dateDone: {
        marginTop: 8,
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#D71A28',
    },
    dateDoneText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
});

export default AccountScreen;

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';

type Mode = 'signup' | 'login';
type AccountSection = 'profile' | 'security';

const AccountScreen = () => {
    const { user, signOut } = useAuth();
    const [mode, setMode] = useState<Mode>('signup');

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [birthdate, setBirthdate] = useState<Date | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [expandedSection, setExpandedSection] = useState<AccountSection | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            setLoadingProfile(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, birthdate, email')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('[Profile] load error:', error);
                setLoadingProfile(false);
                return;
            }

            setFullName(data?.full_name || '');
            setEmail(data?.email || user.email || '');
            setBirthdate(data?.birthdate ? new Date(data.birthdate) : null);
            setLoadingProfile(false);
        };

        loadProfile();
    }, [user]);

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

    const toggleSection = (section: AccountSection) => {
        setShowDatePicker(false);
        setError(null);
        setExpandedSection((current) => (current === section ? null : section));
    };

    const getInitials = () => {
        const source = fullName.trim() || user?.email || 'A';
        return source
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('');
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

    const handleUpdateProfile = async () => {
        setError(null);

        if (!user) return;
        if (!fullName.trim() || !birthdate) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        try {
            const birthdateValue = formatDate(birthdate);
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName.trim(),
                    birthdate: birthdateValue,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            Alert.alert('Updated', 'Your profile has been updated.');
        } catch (err: any) {
            setError(err?.message || 'Update failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setError(null);

        if (!password.trim()) {
            setError('Please enter a new password.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            Alert.alert('Password Updated', 'Your password has been changed.');
            setPassword('');
            setShowPassword(false);
        } catch (err: any) {
            setError(err?.message || 'Password update failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {user ? (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>My Account</Text>
                            <Text style={styles.subtitle}>Manage your details without cluttering the screen.</Text>
                        </View>

                        <View style={styles.accountSummaryCard}>
                            <View style={styles.accountSummaryRow}>
                                <View style={styles.avatarBadge}>
                                    <Text style={styles.avatarText}>{getInitials()}</Text>
                                </View>
                                <View style={styles.accountSummaryCopy}>
                                    <Text style={styles.accountName}>{fullName || 'Barnamej traveler'}</Text>
                                    <Text style={styles.accountEmail}>{email || user.email}</Text>
                                </View>
                            </View>
                            <View style={styles.accountMetaRow}>
                                <View style={styles.metaPill}>
                                    <Ionicons name="person-outline" size={14} color="#B42318" />
                                    <Text style={styles.metaPillText}>Profile ready</Text>
                                </View>
                                <View style={styles.metaPill}>
                                    <Ionicons name="shield-checkmark-outline" size={14} color="#B42318" />
                                    <Text style={styles.metaPillText}>Secure sign-in</Text>
                                </View>
                            </View>
                        </View>

                        {error ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
                                <Text style={styles.errorBannerText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.accountCardStack}>
                            <View style={styles.accordionCard}>
                                <TouchableOpacity
                                    style={styles.accordionHeader}
                                    onPress={() => toggleSection('profile')}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.accordionHeaderLeft}>
                                        <View style={styles.accordionIconWrap}>
                                            <Ionicons name="person-outline" size={18} color="#B42318" />
                                        </View>
                                        <View>
                                            <Text style={styles.accordionTitle}>Personal details</Text>
                                            <Text style={styles.accordionSubtitle}>Name, email and birthdate</Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={expandedSection === 'profile' ? 'chevron-up-outline' : 'chevron-down-outline'}
                                        size={20}
                                        color="#7A1C14"
                                    />
                                </TouchableOpacity>

                                {expandedSection === 'profile' && (
                                    <View style={styles.accordionBody}>
                                        <Text style={styles.label}>Full Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Your full name"
                                            value={fullName}
                                            onChangeText={setFullName}
                                            autoCapitalize="words"
                                        />

                                        <Text style={styles.label}>Email</Text>
                                        <TextInput
                                            style={[styles.input, styles.disabledInput]}
                                            value={email}
                                            editable={false}
                                        />
                                        <Text style={styles.helperText}>Email is tied to your sign-in and cannot be edited here.</Text>

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

                                        <TouchableOpacity
                                            style={styles.button}
                                            onPress={handleUpdateProfile}
                                            disabled={loading || loadingProfile}
                                        >
                                            {loading || loadingProfile ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.buttonText}>Save Changes</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View style={styles.accordionCard}>
                                <TouchableOpacity
                                    style={styles.accordionHeader}
                                    onPress={() => toggleSection('security')}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.accordionHeaderLeft}>
                                        <View style={styles.accordionIconWrap}>
                                            <Ionicons name="lock-closed-outline" size={18} color="#B42318" />
                                        </View>
                                        <View>
                                            <Text style={styles.accordionTitle}>Security</Text>
                                            <Text style={styles.accordionSubtitle}>Password and account access</Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={expandedSection === 'security' ? 'chevron-up-outline' : 'chevron-down-outline'}
                                        size={20}
                                        color="#7A1C14"
                                    />
                                </TouchableOpacity>

                                {expandedSection === 'security' && (
                                    <View style={styles.accordionBody}>
                                        <Text style={styles.sectionLead}>
                                            Choose a strong password you do not reuse on other apps.
                                        </Text>
                                        <Text style={styles.label}>New Password</Text>
                                        <View style={styles.passwordRow}>
                                            <TextInput
                                                style={[styles.input, styles.passwordInput]}
                                                placeholder="Enter a new password"
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
                                        <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={loading}>
                                            {loading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.buttonText}>Update Password</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                            <Ionicons name="log-out-outline" size={18} color="#D71A28" />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
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
                    </>
                )}
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
    disabledInput: {
        color: '#888',
    },
    helperText: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 18,
        color: '#777',
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
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 10,
    },
    accountSummaryCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#EED9D2',
        marginBottom: 16,
    },
    accountSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FCE9E5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#B42318',
    },
    accountSummaryCopy: {
        flex: 1,
    },
    accountName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F1A17',
        marginBottom: 4,
    },
    accountEmail: {
        fontSize: 14,
        color: '#6B5B54',
    },
    accountMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F2',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#F5D3CA',
    },
    metaPillText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '600',
        color: '#7A1C14',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF1ED',
        borderWidth: 1,
        borderColor: '#F8D0C4',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
    },
    errorBannerText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        lineHeight: 18,
        color: '#B42318',
    },
    accountCardStack: {
        gap: 12,
    },
    accordionCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#EEE7E4',
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    accordionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    accordionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF2EE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    accordionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F1A17',
        marginBottom: 3,
    },
    accordionSubtitle: {
        fontSize: 13,
        color: '#7A6A63',
    },
    accordionBody: {
        borderTopWidth: 1,
        borderTopColor: '#F1ECE9',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 16,
    },
    sectionLead: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 19,
        color: '#6B5B54',
    },
    logoutButton: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D71A28',
        alignItems: 'center',
    },
    logoutText: {
        color: '#D71A28',
        fontWeight: '700',
        fontSize: 14,
    },
});

export default AccountScreen;

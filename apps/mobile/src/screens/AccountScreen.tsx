import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
    formatBirthdayForDisplay,
    formatDateForDatabase,
    getNationalities,
    parseDateOnlyString,
    supabase,
    type Nationality,
} from '@barnamej/supabase-client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import NationalityPickerField from '../components/NationalityPickerField';

type AuthMode = 'signup' | 'login';
type DateFieldTarget = 'auth' | 'profile' | null;

type ProfileFormState = {
    fullName: string;
    email: string;
    birthdate: Date | null;
    nationalityId: string | null;
};

type ActionButtonProps = {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'dangerOutline';
    icon?: React.ComponentProps<typeof Ionicons>['name'];
};

type SectionCardProps = {
    children: React.ReactNode;
};

type InfoRowProps = {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
};

type PasswordFieldProps = {
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    secureTextEntry: boolean;
    onToggleVisibility: () => void;
};

const EMPTY_PROFILE_FORM: ProfileFormState = {
    fullName: '',
    email: '',
    birthdate: null,
    nationalityId: null,
};

const SectionCard = ({ children }: SectionCardProps) => (
    <View style={styles.sectionCard}>{children}</View>
);

const InfoRow = ({ icon, label, value }: InfoRowProps) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
            <Ionicons name={icon} size={18} color="#D71A28" />
        </View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const PasswordField = ({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    onToggleVisibility,
}: PasswordFieldProps) => (
    <View style={styles.passwordRow}>
        <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
        />
        <TouchableOpacity
            style={styles.passwordToggle}
            onPress={onToggleVisibility}
            accessibilityLabel={secureTextEntry ? 'Show password' : 'Hide password'}
        >
            <Ionicons
                name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#666"
            />
        </TouchableOpacity>
    </View>
);

const ActionButton = ({
    label,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
    icon,
}: ActionButtonProps) => {
    const isDisabled = disabled || loading;
    const buttonStyles = [
        styles.actionButton,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'ghost' && styles.ghostButton,
        variant === 'dangerOutline' && styles.dangerOutlineButton,
        isDisabled && styles.disabledButton,
    ];
    const textStyles = [
        styles.actionButtonText,
        variant === 'primary' && styles.primaryButtonText,
        variant === 'secondary' && styles.secondaryButtonText,
        variant === 'ghost' && styles.ghostButtonText,
        variant === 'dangerOutline' && styles.dangerOutlineButtonText,
    ];
    const spinnerColor = variant === 'primary' ? '#fff' : '#D71A28';
    const iconColor = variant === 'primary' ? '#fff' : '#D71A28';

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            activeOpacity={0.88}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator color={spinnerColor} />
            ) : (
                <View style={styles.actionButtonContent}>
                    {icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null}
                    <Text style={textStyles}>{label}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const AccountScreen = () => {
    const { user, signOut } = useAuth();
    const [mode, setMode] = useState<AuthMode>('signup');

    const [authFullName, setAuthFullName] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [authBirthdate, setAuthBirthdate] = useState<Date | null>(null);
    const [authPassword, setAuthPassword] = useState('');
    const [showAuthPassword, setShowAuthPassword] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
    const [savedProfile, setSavedProfile] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const [passwordValue, setPasswordValue] = useState('');
    const [showPasswordValue, setShowPasswordValue] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [nationalities, setNationalities] = useState<Nationality[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingNationalities, setLoadingNationalities] = useState(false);
    const [activeDateField, setActiveDateField] = useState<DateFieldTarget>(null);

    useEffect(() => {
        const loadNationalities = async () => {
            setLoadingNationalities(true);
            const { data, error } = await getNationalities();

            if (error) {
                console.error('[Nationalities] load error:', error);
                setLoadingNationalities(false);
                return;
            }

            setNationalities(data || []);
            setLoadingNationalities(false);
        };

        loadNationalities();
    }, []);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) {
                setProfileForm(EMPTY_PROFILE_FORM);
                setSavedProfile(EMPTY_PROFILE_FORM);
                setIsEditingProfile(false);
                setIsChangingPassword(false);
                setPasswordValue('');
                setShowPasswordValue(false);
                setProfileError(null);
                setPasswordError(null);
                setActiveDateField(null);
                return;
            }

            setLoadingProfile(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, birthdate, email, nationality_id')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('[Profile] load error:', error);
            }

            const metadata = (user.user_metadata || {}) as Record<string, unknown>;
            const metadataBirthdate = typeof metadata.birthdate === 'string' ? metadata.birthdate : null;
            const metadataNationalityId = typeof metadata.nationality_id === 'string' ? metadata.nationality_id : null;

            const nextProfile: ProfileFormState = {
                fullName: data?.full_name || (typeof metadata.full_name === 'string' ? metadata.full_name : ''),
                email: data?.email || user.email || '',
                birthdate: parseDateOnlyString(data?.birthdate || metadataBirthdate),
                nationalityId: data?.nationality_id || metadataNationalityId || null,
            };

            setProfileForm(nextProfile);
            setSavedProfile(nextProfile);
            setIsEditingProfile(false);
            setIsChangingPassword(false);
            setPasswordValue('');
            setShowPasswordValue(false);
            setProfileError(null);
            setPasswordError(null);
            setActiveDateField(null);
            setLoadingProfile(false);
        };

        loadProfile();
    }, [user]);

    const getDisplayDate = (date: Date | null) => {
        if (!date) {
            return 'Not set';
        }

        return formatBirthdayForDisplay(date);
    };

    const getDateValue = (date: Date | null) => {
        if (!date) {
            return '';
        }

        return formatDateForDatabase(date);
    };

    const getNationalityName = (nationalityId: string | null) => {
        if (!nationalityId) {
            return 'Not set';
        }

        return nationalities.find((item) => item.id === nationalityId)?.name || 'Unknown nationality';
    };

    const getInitials = () => {
        const base = savedProfile.fullName || savedProfile.email || user?.email || 'My Account';
        const parts = base
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2);

        return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'A';
    };

    const resetAuthForm = () => {
        setAuthFullName('');
        setAuthEmail('');
        setAuthBirthdate(null);
        setAuthPassword('');
        setShowAuthPassword(false);
        setAuthError(null);
        setActiveDateField(null);
    };

    const startEditingProfile = () => {
        setProfileForm(savedProfile);
        setProfileError(null);
        setActiveDateField(null);
        setIsEditingProfile(true);
    };

    const cancelEditingProfile = () => {
        setProfileForm(savedProfile);
        setProfileError(null);
        setActiveDateField(null);
        setIsEditingProfile(false);
    };

    const startChangingPassword = () => {
        setPasswordError(null);
        setIsChangingPassword(true);
    };

    const cancelChangingPassword = () => {
        setPasswordValue('');
        setShowPasswordValue(false);
        setPasswordError(null);
        setIsChangingPassword(false);
    };

    const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS !== 'ios') {
            setActiveDateField(null);
        }

        if (!selected) {
            return;
        }

        if (activeDateField === 'profile') {
            setProfileForm((current) => ({ ...current, birthdate: selected }));
            return;
        }

        if (activeDateField === 'auth') {
            setAuthBirthdate(selected);
        }
    };

    const handleSignUp = async () => {
        setAuthError(null);

        if (!authFullName.trim() || !authEmail.trim() || !authBirthdate || !authPassword.trim()) {
            setAuthError('Please fill in all fields.');
            return;
        }

        const birthdateValue = getDateValue(authBirthdate);

        setAuthLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) {
                setAuthError('Supabase URL is missing. Check EXPO_PUBLIC_SUPABASE_URL in root .env');
                setAuthLoading(false);
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: authEmail.trim(),
                password: authPassword,
                options: {
                    data: {
                        full_name: authFullName.trim(),
                        birthdate: birthdateValue,
                    },
                },
            });

            if (signUpError) {
                console.error('[Auth] signUp error:', signUpError);
                throw signUpError;
            }

            const userId = data.user?.id;
            if (userId) {
                const now = new Date().toISOString();
                const { error: profileUpsertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        email: authEmail.trim(),
                        full_name: authFullName.trim(),
                        birthdate: birthdateValue,
                        created_at: now,
                        updated_at: now,
                    });

                if (profileUpsertError) {
                    console.error('[Profiles] upsert error:', profileUpsertError);
                    throw profileUpsertError;
                }
            }

            Alert.alert('Account Created', 'Please check your email to confirm your account.');
            resetAuthForm();
        } catch (err: any) {
            console.error('[SignUp] exception:', err);
            setAuthError(err?.message || 'Sign up failed. Please try again.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async () => {
        setAuthError(null);

        if (!authEmail.trim() || !authPassword.trim()) {
            setAuthError('Please enter email and password.');
            return;
        }

        setAuthLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) {
                setAuthError('Supabase URL is missing. Check EXPO_PUBLIC_SUPABASE_URL in root .env');
                setAuthLoading(false);
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: authEmail.trim(),
                password: authPassword,
            });

            if (signInError) {
                console.error('[Auth] signIn error:', signInError);
                throw signInError;
            }

            Alert.alert('Welcome back', 'You are now logged in.');
        } catch (err: any) {
            console.error('[Login] exception:', err);
            setAuthError(err?.message || 'Login failed. Please try again.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setProfileError(null);

        if (!user) {
            return;
        }

        if (!profileForm.fullName.trim() || !profileForm.birthdate || !profileForm.nationalityId) {
            setProfileError('Please fill in full name, birthdate, and nationality.');
            return;
        }

        setProfileSaving(true);
        try {
            const nextProfile: ProfileFormState = {
                fullName: profileForm.fullName.trim(),
                email: profileForm.email.trim() || user.email || '',
                birthdate: profileForm.birthdate,
                nationalityId: profileForm.nationalityId,
            };

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: nextProfile.email || null,
                    full_name: nextProfile.fullName,
                    birthdate: getDateValue(nextProfile.birthdate),
                    nationality_id: nextProfile.nationalityId,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            setProfileForm(nextProfile);
            setSavedProfile(nextProfile);
            setIsEditingProfile(false);
            Alert.alert('Updated', 'Your profile has been updated.');
        } catch (err: any) {
            setProfileError(err?.message || 'Update failed. Please try again.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordError(null);

        if (!passwordValue.trim()) {
            setPasswordError('Please enter a new password.');
            return;
        }

        setPasswordSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordValue,
            });

            if (error) {
                throw error;
            }

            Alert.alert('Password Updated', 'Your password has been changed.');
            cancelChangingPassword();
        } catch (err: any) {
            setPasswordError(err?.message || 'Password update failed.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const renderProfileReadOnly = () => (
        <SectionCard>
            <View style={styles.profileHero}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
                <View style={styles.profileHeroText}>
                    <Text style={styles.profileHeroTitle}>{savedProfile.fullName || 'Complete your profile'}</Text>
                    <Text style={styles.profileHeroSubtitle}>{savedProfile.email || user?.email || 'No email available'}</Text>
                </View>
            </View>

            <View style={styles.infoList}>
                <InfoRow icon="person-outline" label="Full Name" value={savedProfile.fullName || 'Not set'} />
                <InfoRow icon="mail-outline" label="Email" value={savedProfile.email || user?.email || 'Not set'} />
                <InfoRow icon="calendar-outline" label="Birthdate" value={getDisplayDate(savedProfile.birthdate)} />
                <InfoRow icon="globe-outline" label="Nationality" value={getNationalityName(savedProfile.nationalityId)} />
            </View>

            <Text style={styles.helperCopy}>
                Review your account details here, then switch to edit mode only when you want to make changes.
            </Text>

            <ActionButton
                label="Edit Profile"
                onPress={startEditingProfile}
                icon="create-outline"
                disabled={loadingProfile || loadingNationalities}
            />
        </SectionCard>
    );

    const renderProfileEditor = () => (
        <SectionCard>
            <View style={styles.editingHeader}>
                <View style={styles.editingHeaderContent}>
                    <Text style={styles.cardTitle}>Edit Profile</Text>
                    <Text style={styles.cardDescription}>Update your personal details and save when you are ready.</Text>
                    <View style={styles.editingBadge}>
                        <Text style={styles.editingBadgeText}>Editing</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={profileForm.fullName}
                onChangeText={(value) => setProfileForm((current) => ({ ...current, fullName: value }))}
                autoCapitalize="words"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
                style={[styles.input, styles.disabledInput]}
                value={profileForm.email}
                editable={false}
            />

            <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                    <Text style={styles.label}>Birthdate</Text>
                    <TouchableOpacity onPress={() => setActiveDateField('profile')} activeOpacity={0.88}>
                        <View style={styles.selectField}>
                            <Ionicons name="calendar-outline" size={20} color="#D71A28" />
                            <Text
                                style={profileForm.birthdate ? styles.selectValue : styles.selectPlaceholder}
                                numberOfLines={1}
                            >
                                {profileForm.birthdate ? formatBirthdayForDisplay(profileForm.birthdate) : 'Select birthdate'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#888" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.inlineField, styles.inlineFieldOffset]}>
                    <NationalityPickerField
                        compact
                        disabled={loadingNationalities || loadingProfile || profileSaving}
                        label="Nationality"
                        nationalities={nationalities}
                        onSelect={(value) => setProfileForm((current) => ({ ...current, nationalityId: value }))}
                        selectedId={profileForm.nationalityId}
                        placeholder={loadingNationalities ? 'Loading...' : 'Choose nationality'}
                    />
                </View>
            </View>

            {activeDateField === 'profile' ? (
                <View style={styles.datePicker}>
                    <DateTimePicker
                        value={profileForm.birthdate || new Date(2000, 0, 1)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                    {Platform.OS === 'ios' ? (
                        <TouchableOpacity style={styles.dateDone} onPress={() => setActiveDateField(null)}>
                            <Text style={styles.dateDoneText}>Done</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}

            {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}

            <View style={styles.actionRow}>
                <View style={styles.actionColumn}>
                    <ActionButton
                        label="Cancel"
                        onPress={cancelEditingProfile}
                        variant="secondary"
                        disabled={profileSaving}
                    />
                </View>
                <View style={styles.actionColumn}>
                    <ActionButton
                        label="Save Changes"
                        onPress={handleUpdateProfile}
                        loading={profileSaving}
                        disabled={loadingProfile || loadingNationalities}
                    />
                </View>
            </View>
        </SectionCard>
    );

    const renderSecuritySection = () => (
        <SectionCard>
            <View style={styles.securityHeader}>
                <View style={styles.securityIconWrap}>
                    <Ionicons name="shield-checkmark-outline" size={22} color="#D71A28" />
                </View>
                <View style={styles.securityHeaderContent}>
                    <Text style={styles.cardTitle}>Security</Text>
                    <Text style={styles.cardDescription}>Keep your account secure by updating your password separately.</Text>
                </View>
            </View>

            {!isChangingPassword ? (
                <>
                    <View style={styles.securitySummary}>
                        <View style={styles.securitySummaryText}>
                            <Text style={styles.securitySummaryTitle}>Password</Text>
                            <Text style={styles.securitySummaryBody}>Change your password without mixing it into profile details.</Text>
                        </View>
                        <Text style={styles.passwordMask}>********</Text>
                    </View>

                    <ActionButton
                        label="Change Password"
                        onPress={startChangingPassword}
                        variant="ghost"
                        icon="lock-closed-outline"
                    />
                </>
            ) : (
                <>
                    <Text style={styles.label}>New Password</Text>
                    <PasswordField
                        value={passwordValue}
                        onChangeText={setPasswordValue}
                        placeholder="Enter a new password"
                        secureTextEntry={!showPasswordValue}
                        onToggleVisibility={() => setShowPasswordValue((current) => !current)}
                    />

                    {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                    <View style={styles.actionRow}>
                        <View style={styles.actionColumn}>
                            <ActionButton
                                label="Cancel"
                                onPress={cancelChangingPassword}
                                variant="secondary"
                                disabled={passwordSaving}
                            />
                        </View>
                        <View style={styles.actionColumn}>
                            <ActionButton
                                label="Update Password"
                                onPress={handleChangePassword}
                                loading={passwordSaving}
                            />
                        </View>
                    </View>
                </>
            )}
        </SectionCard>
    );

    const renderLogoutSection = () => (
        <SectionCard>
            <Text style={styles.cardTitle}>Session</Text>
            <Text style={styles.cardDescription}>
                Log out when you are finished using this device. This action is kept separate from profile management.
            </Text>
            <ActionButton
                label="Log Out"
                onPress={() => {
                    void signOut();
                }}
                variant="dangerOutline"
                icon="log-out-outline"
            />
        </SectionCard>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {user ? (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.eyebrow}>Account</Text>
                            <Text style={styles.title}>My Account</Text>
                            <Text style={styles.subtitle}>
                                View your profile first, then edit only when you need to update details.
                            </Text>
                        </View>

                        {loadingProfile ? (
                            <SectionCard>
                                <View style={styles.loadingState}>
                                    <ActivityIndicator color="#D71A28" />
                                    <Text style={styles.loadingText}>Loading your account details...</Text>
                                </View>
                            </SectionCard>
                        ) : isEditingProfile ? (
                            renderProfileEditor()
                        ) : (
                            renderProfileReadOnly()
                        )}

                        {renderSecuritySection()}
                        {renderLogoutSection()}
                    </>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.eyebrow}>{mode === 'signup' ? 'Join Us' : 'Account Access'}</Text>
                            <Text style={styles.title}>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</Text>
                            <Text style={styles.subtitle}>
                                {mode === 'signup'
                                    ? 'Join Barnamej Bahraini in a few steps.'
                                    : 'Log in to access your saved plans.'}
                            </Text>
                        </View>

                        <SectionCard>
                            {mode === 'signup' ? (
                                <>
                                    <Text style={styles.label}>Full Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Your full name"
                                        value={authFullName}
                                        onChangeText={setAuthFullName}
                                        autoCapitalize="words"
                                    />
                                </>
                            ) : null}

                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                value={authEmail}
                                onChangeText={setAuthEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {mode === 'signup' ? (
                                <>
                                    <Text style={styles.label}>Birthdate</Text>
                                    <TouchableOpacity onPress={() => setActiveDateField('auth')} activeOpacity={0.88}>
                                        <View style={styles.selectField}>
                                            <Ionicons name="calendar-outline" size={20} color="#D71A28" />
                                            <Text
                                                style={authBirthdate ? styles.selectValue : styles.selectPlaceholder}
                                                numberOfLines={1}
                                            >
                                                {authBirthdate ? formatBirthdayForDisplay(authBirthdate) : 'Select birthdate'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={18} color="#888" />
                                        </View>
                                    </TouchableOpacity>

                                    {activeDateField === 'auth' ? (
                                        <View style={styles.datePicker}>
                                            <DateTimePicker
                                                value={authBirthdate || new Date(2000, 0, 1)}
                                                mode="date"
                                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                onChange={onDateChange}
                                                maximumDate={new Date()}
                                            />
                                            {Platform.OS === 'ios' ? (
                                                <TouchableOpacity style={styles.dateDone} onPress={() => setActiveDateField(null)}>
                                                    <Text style={styles.dateDoneText}>Done</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    ) : null}
                                </>
                            ) : null}

                            <Text style={styles.label}>Password</Text>
                            <PasswordField
                                value={authPassword}
                                onChangeText={setAuthPassword}
                                placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
                                secureTextEntry={!showAuthPassword}
                                onToggleVisibility={() => setShowAuthPassword((current) => !current)}
                            />

                            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

                            <ActionButton
                                label={mode === 'signup' ? 'Sign Up' : 'Log In'}
                                onPress={mode === 'signup' ? handleSignUp : handleLogin}
                                loading={authLoading}
                            />

                            <TouchableOpacity
                                style={styles.switchRow}
                                onPress={() => {
                                    setMode(mode === 'signup' ? 'login' : 'signup');
                                    setAuthError(null);
                                    setActiveDateField(null);
                                }}
                            >
                                <Text style={styles.switchText}>
                                    {mode === 'signup'
                                        ? 'Already have an account? Log in'
                                        : "Don't have an account? Sign up"}
                                </Text>
                            </TouchableOpacity>
                        </SectionCard>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6F8',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 32,
    },
    header: {
        marginBottom: 20,
    },
    eyebrow: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D71A28',
        letterSpacing: 0.6,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: '#5F6368',
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        borderColor: '#ECEEF1',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 18,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 21,
        color: '#6B7280',
        maxWidth: '92%',
    },
    profileHero: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF4F4',
        borderRadius: 18,
        padding: 16,
        marginBottom: 18,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#D71A28',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    profileHeroText: {
        flex: 1,
    },
    profileHeroTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    profileHeroSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    infoList: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E6E8EB',
    },
    infoIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFF4F4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8A8F98',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
        lineHeight: 22,
    },
    helperCopy: {
        fontSize: 13,
        lineHeight: 20,
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 16,
    },
    editingHeader: {
        marginBottom: 8,
    },
    editingHeaderContent: {
        alignItems: 'flex-start',
    },
    editingBadge: {
        backgroundColor: '#FFF4F4',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 12,
    },
    editingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D71A28',
    },
    label: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 14,
    },
    input: {
        backgroundColor: '#F8F9FB',
        borderWidth: 1,
        borderColor: '#E4E7EC',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 15,
        color: '#111827',
    },
    disabledInput: {
        color: '#8A8F98',
        backgroundColor: '#F2F4F7',
    },
    inlineFields: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    inlineField: {
        flex: 1,
    },
    inlineFieldOffset: {
        paddingTop: 14,
    },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#E4E7EC',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: '#F8F9FB',
        minHeight: 54,
    },
    selectValue: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
    },
    selectPlaceholder: {
        flex: 1,
        fontSize: 15,
        color: '#98A2B3',
    },
    datePicker: {
        marginTop: 12,
        backgroundColor: '#F8F9FB',
        borderWidth: 1,
        borderColor: '#E4E7EC',
        borderRadius: 14,
        padding: 8,
    },
    dateDone: {
        marginTop: 8,
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#D71A28',
    },
    dateDoneText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    errorText: {
        marginTop: 12,
        color: '#D71A28',
        fontSize: 13,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 18,
    },
    actionColumn: {
        flex: 1,
    },
    actionButton: {
        minHeight: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderWidth: 1,
        marginTop: 4,
    },
    actionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    primaryButton: {
        backgroundColor: '#D71A28',
        borderColor: '#D71A28',
    },
    primaryButtonText: {
        color: '#FFFFFF',
    },
    secondaryButton: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E4E7EC',
    },
    secondaryButtonText: {
        color: '#344054',
    },
    ghostButton: {
        backgroundColor: '#FFF4F4',
        borderColor: '#FFF4F4',
    },
    ghostButtonText: {
        color: '#D71A28',
    },
    dangerOutlineButton: {
        backgroundColor: '#FFFFFF',
        borderColor: '#F0B8BC',
    },
    dangerOutlineButtonText: {
        color: '#D71A28',
    },
    disabledButton: {
        opacity: 0.6,
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
    securityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    securityHeaderContent: {
        flex: 1,
    },
    securityIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#FFF4F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    securitySummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ECEEF1',
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        marginBottom: 14,
        backgroundColor: '#FCFCFD',
    },
    securitySummaryText: {
        flex: 1,
        paddingRight: 16,
    },
    securitySummaryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    securitySummaryBody: {
        fontSize: 13,
        lineHeight: 19,
        color: '#6B7280',
    },
    passwordMask: {
        fontSize: 18,
        fontWeight: '700',
        color: '#98A2B3',
        letterSpacing: 2,
    },
    switchRow: {
        marginTop: 16,
        alignItems: 'center',
    },
    switchText: {
        color: '#D71A28',
        fontSize: 13,
        fontWeight: '700',
    },
    loadingState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
});

export default AccountScreen;

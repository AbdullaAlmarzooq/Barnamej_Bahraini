import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../api/client';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    isAdmin: false,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            // Don't set loading false here, checkAdminRole will do it
            checkAdminRole(session?.user);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoading(true); // Reset loading on auth change
            setSession(session);
            setUser(session?.user ?? null);
            checkAdminRole(session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

        const checkAdminRole = async (user: User | null | undefined) => {
            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching profile:', error);
                    setIsAdmin(false);
                } else if (!data) {
                    console.warn('No profile found for user:', user.id);
                    setIsAdmin(false);
                } else {
                    setIsAdmin(data.role === 'admin');
                }
            } catch (err) {
                console.error('Unexpected error checking admin role:', err);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, isAdmin, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

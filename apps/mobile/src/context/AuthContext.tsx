import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@barnamej/supabase-client';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextValue = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (!mounted) return;
            if (error) {
                console.error('[Auth] getSession error:', error);
            }
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            setLoading(false);
        };

        init();

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);
            setUser(newSession?.user ?? null);
            setLoading(false);
        });

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = useMemo(() => ({ session, user, loading, signOut }), [session, user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
};

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
    const currentUserIdRef = useRef<string | null>(null);
    const roleCheckRequestRef = useRef(0);

    const resolveAdminRole = useCallback(async (nextUser: User) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', nextUser.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return false;
            }

            if (!data) {
                console.warn('No profile found for user:', nextUser.id);
                return false;
            }

            return data.role === 'admin';
        } catch (err) {
            console.error('Unexpected error checking admin role:', err);
            return false;
        }
    }, []);

    const syncSessionState = useCallback(async (
        nextSession: Session | null,
        options: { forceRoleCheck?: boolean; showLoading?: boolean } = {}
    ) => {
        const { forceRoleCheck = false, showLoading = false } = options;
        const nextUser = nextSession?.user ?? null;
        const previousUserId = currentUserIdRef.current;

        setSession(nextSession);
        setUser(nextUser);
        currentUserIdRef.current = nextUser?.id ?? null;

        if (!nextUser) {
            roleCheckRequestRef.current += 1;
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        const shouldCheckRole = forceRoleCheck || previousUserId !== nextUser.id;
        if (!shouldCheckRole) {
            setLoading(false);
            return;
        }

        if (showLoading) {
            setLoading(true);
        }

        const requestId = ++roleCheckRequestRef.current;
        const nextIsAdmin = await resolveAdminRole(nextUser);

        if (requestId !== roleCheckRequestRef.current || currentUserIdRef.current !== nextUser.id) {
            return;
        }

        setIsAdmin(nextIsAdmin);
        setLoading(false);
    }, [resolveAdminRole]);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            void syncSessionState(session, {
                forceRoleCheck: true,
                showLoading: true,
            });
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'SIGNED_OUT') {
                void syncSessionState(null);
                return;
            }

            if (_event === 'SIGNED_IN') {
                const nextUserId = session?.user?.id ?? null;

                // Supabase can emit SIGNED_IN again when the tab regains focus.
                if (nextUserId === currentUserIdRef.current) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    return;
                }

                void syncSessionState(session, {
                    forceRoleCheck: true,
                    showLoading: true,
                });
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [syncSessionState]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, loading, isAdmin, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

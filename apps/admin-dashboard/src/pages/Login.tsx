import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    // checkAdminRole is no longer needed here as AuthContext handles it automatically
    // const { checkAdminRole } = useAuth() as any;

    // Check for error in URL params (e.g. from ProtectedRoute)
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('error') === 'unauthorized') {
            setError('You do not have permission to access the admin dashboard.');
        }
    }, [location]);

    const toLoginErrorMessage = (err: any) => {
        const message = err?.message || '';

        // Browser/network failures usually surface as "Failed to fetch"
        // when Supabase host is unreachable (DNS/network/proxy/VPN).
        if (
            message.includes('Failed to fetch') ||
            message.includes('NetworkError') ||
            message.includes('ERR_NAME_NOT_RESOLVED')
        ) {
            return 'Cannot reach Supabase Auth. Check VITE_SUPABASE_URL and your network/DNS settings.';
        }

        return message || 'Failed to login';
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            // No direct navigation here. 
            // The AuthContext will pick up the session change, 
            // check the role, and trigger a re-render.
            // UseEffect below will handle the redirect.
        } catch (err: any) {
            setError(toLoginErrorMessage(err));
            setLoading(false);
        }
    };

    // Watch for successful admin login
    const { isAdmin, user } = useAuth();
    React.useEffect(() => {
        if (user && isAdmin) {
            const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
            navigate(from, { replace: true });
        }
    }, [user, isAdmin, navigate, location]);

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Admin Login</h1>
                    <p>Barnamej Bahraini Admin Dashboard</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;

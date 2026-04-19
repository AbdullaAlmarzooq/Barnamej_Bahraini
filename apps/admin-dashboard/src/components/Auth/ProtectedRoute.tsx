import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
    const { session, loading, isAdmin, signOut } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!loading && session && !isAdmin) {
            void signOut();
        }
    }, [loading, session, isAdmin, signOut]);

    if (loading) {
        return (
            <div className="loading-container" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // 1. Not logged in -> Redirect to login
    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Logged in but not Admin -> Redirect to login (and sign out)
    if (!isAdmin) {
        return <Navigate to="/login?error=unauthorized" replace />;
    }

    // 3. Authorized -> Render child routes
    return <Outlet />;
};

export default ProtectedRoute;

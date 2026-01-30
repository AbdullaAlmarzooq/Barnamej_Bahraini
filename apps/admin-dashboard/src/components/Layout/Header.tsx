import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
    const { user, signOut } = useAuth();

    return (
        <header className="header">
            <div className="header-content">
                <h1 className="header-title">Admin Dashboard</h1>

                <div className="header-actions">
                    <div className="header-info">
                        <span className="header-user">👤 {user?.email || 'Administrator'}</span>
                    </div>
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => signOut()}
                        style={{ marginLeft: '1rem' }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;

import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="header-content">
                <h1 className="header-title">Admin Dashboard</h1>

                <div className="header-actions">
                    <div className="header-info">
                        <span className="header-user">👤 Administrator</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

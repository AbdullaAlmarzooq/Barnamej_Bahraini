import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/attractions', label: 'Attractions', icon: '🏛️' },
    { path: '/reviews', label: 'Reviews', icon: '⭐' },
    { path: '/itineraries', label: 'Itineraries', icon: '🗺️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Barnamej Admin</h2>
        <div className="sidebar-subtitle">Bahraini Tourism</div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-text">v1.0.0</div>
        <div className="footer-text text-sm text-muted">Admin Dashboard</div>
      </div>
    </aside >
  );
};

export default Sidebar;

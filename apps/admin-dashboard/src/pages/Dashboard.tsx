import { useState, useEffect } from 'react';
import { fetchStatistics } from '../api/client';
import { type Statistics } from '../types';
import StatCard from '../components/Common/StatCard';
import './Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStatistics();
    }, []);

    const loadStatistics = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchStatistics();
            setStats(data);
        } catch (err) {
            setError('Failed to load statistics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-message">
                {error}
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Dashboard Overview</h1>
                <p className="text-muted">Welcome to the Barnamej Bahraini Admin Dashboard</p>
            </div>

            <div className="stats-grid">
                <StatCard
                    title="Total Attractions"
                    value={stats?.total_attractions || 0}
                    icon="🏛️"
                />
                <StatCard
                    title="Total Reviews"
                    value={stats?.total_reviews || 0}
                    icon="⭐"
                />
                <StatCard
                    title="Total Itineraries"
                    value={stats?.total_itineraries || 0}
                    icon="🗺️"
                />
                <StatCard
                    title="Average Rating"
                    value={stats?.average_rating?.toFixed(1) || '0.0'}
                    icon="📊"
                />
            </div>

            <div className="dashboard-content">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <a href="/attractions" className="action-card">
                            <div className="action-icon">🏛️</div>
                            <div className="action-title">Manage Attractions</div>
                            <div className="action-description">Add, edit, or remove attractions</div>
                        </a>
                        <a href="/reviews" className="action-card">
                            <div className="action-icon">⭐</div>
                            <div className="action-title">Moderate Reviews</div>
                            <div className="action-description">View and manage user reviews</div>
                        </a>
                        <a href="/itineraries" className="action-card">
                            <div className="action-icon">🗺️</div>
                            <div className="action-title">View Itineraries</div>
                            <div className="action-description">Browse user itineraries</div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

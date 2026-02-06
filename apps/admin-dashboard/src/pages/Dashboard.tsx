import { useState, useEffect } from 'react';
import { fetchStatistics, fetchRatingByCategory, fetchReviewTrend } from '../api/client';
import { type Statistics, type CategoryRating, type ReviewTrendPoint } from '../types';
import StatCard from '../components/Common/StatCard';
import './Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState<Statistics | null>(null);
    const [categoryRatings, setCategoryRatings] = useState<CategoryRating[]>([]);
    const [reviewTrend, setReviewTrend] = useState<ReviewTrendPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStatistics();
    }, []);

    const loadStatistics = async () => {
        try {
            setLoading(true);
            setError(null);
            const [statsData, categoryData, trendData] = await Promise.all([
                fetchStatistics(),
                fetchRatingByCategory(),
                fetchReviewTrend(8)
            ]);
            setStats(statsData);
            setCategoryRatings(categoryData);
            setReviewTrend(trendData);
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
                <div className="dashboard-charts">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Rating Quality by Category</h2>
                        </div>
                        <div className="chart-body">
                            {categoryRatings.length === 0 ? (
                                <div className="text-muted">No rating data available yet.</div>
                            ) : (
                                <div className="bar-list">
                                    {categoryRatings
                                        .slice()
                                        .sort((a, b) => b.average_rating - a.average_rating)
                                        .map(item => (
                                            <div className="bar-row" key={item.category}>
                                                <div className="bar-label">
                                                    {item.category}
                                                    <span className="bar-subtext">
                                                        {item.total_reviews} reviews
                                                    </span>
                                                </div>
                                                <div className="bar-track">
                                                    <div
                                                        className="bar-fill"
                                                        style={{ width: `${Math.min(100, (item.average_rating / 5) * 100)}%` }}
                                                    />
                                                </div>
                                                <div className="bar-value">
                                                    {item.average_rating.toFixed(1)}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Review Recency Trend (Last 8 Weeks)</h2>
                        </div>
                        <div className="chart-body">
                            {reviewTrend.length === 0 ? (
                                <div className="text-muted">No review activity yet.</div>
                            ) : (
                                <div className="trend-chart">
                                    <svg viewBox="0 0 320 120" role="img" aria-label="Review trend line">
                                        <polyline
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            points={(() => {
                                                const max = Math.max(...reviewTrend.map(p => p.count), 1)
                                                const span = Math.max(reviewTrend.length - 1, 1)
                                                return reviewTrend
                                                    .map((point, index) => {
                                                        const x = (index / span) * 300 + 10
                                                        const y = 100 - (point.count / max) * 80 + 10
                                                        return `${x},${y}`
                                                    })
                                                    .join(' ')
                                            })()}
                                        />
                                    </svg>
                                    <div className="trend-labels">
                                        {reviewTrend.map(point => {
                                            const date = new Date(point.week_start)
                                            const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
                                            return (
                                                <div key={point.week_start} className="trend-label">
                                                    <span className="trend-count">{point.count}</span>
                                                    <span className="trend-date">{label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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

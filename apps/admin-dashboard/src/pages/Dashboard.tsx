import { useState, useEffect } from 'react';
import { fetchStatistics, fetchRatingByCategory, fetchReviewTrend } from '../api/client';
import { type Statistics, type CategoryRating, type ReviewTrendPoint } from '../types';
import { IconAttractions, IconDashboard, IconItineraries, IconReviews } from '../components/Common/LineIcons';
import ChartCard from '../components/Dashboard/ChartCard';
import EmptyState from '../components/Dashboard/EmptyState';
import QuickActionCard from '../components/Dashboard/QuickActionCard';
import ReviewTrendInteractiveChart from '../components/Dashboard/ReviewTrendInteractiveChart';
import SectionCard from '../components/Dashboard/SectionCard';
import StatCard from '../components/Dashboard/StatCard';
import UserDemographics from '../components/Dashboard/UserDemographics';
import './Dashboard.css';

const REVIEW_TREND_MONTHS = 8;

function startOfUtcMonth(date: Date): Date {
    const result = new Date(date);
    result.setUTCDate(1);
    result.setUTCHours(0, 0, 0, 0);
    return result;
}

function normalizeReviewTrend(points: ReviewTrendPoint[], months = REVIEW_TREND_MONTHS): ReviewTrendPoint[] {
    const countsByMonth = new Map<string, number>();
    for (const point of points) {
        const monthStart = startOfUtcMonth(new Date(point.period_start)).toISOString();
        countsByMonth.set(monthStart, (countsByMonth.get(monthStart) || 0) + point.count);
    }

    const latestMonth = startOfUtcMonth(new Date());
    const firstMonth = new Date(latestMonth);
    firstMonth.setUTCMonth(firstMonth.getUTCMonth() - (months - 1));

    const normalized: ReviewTrendPoint[] = [];
    for (let i = 0; i < months; i++) {
        const monthStart = new Date(firstMonth);
        monthStart.setUTCMonth(firstMonth.getUTCMonth() + i);
        const key = monthStart.toISOString();
        normalized.push({
            period_start: key,
            count: countsByMonth.get(key) || 0,
        });
    }

    return normalized;
}

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
                fetchReviewTrend(REVIEW_TREND_MONTHS)
            ]);
            setStats(statsData);
            setCategoryRatings(categoryData);
            setReviewTrend(normalizeReviewTrend(trendData, REVIEW_TREND_MONTHS));
        } catch (err) {
            setError('Failed to load statistics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container dashboard-loading-state">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-page">
                <SectionCard title="Dashboard Overview" subtitle="Unable to load the latest dashboard metrics.">
                    <EmptyState
                        title="Data couldn't be loaded"
                        description={error}
                        actionLabel="Try again"
                        onAction={loadStatistics}
                    />
                </SectionCard>
            </div>
        );
    }

    const statItems = [
        {
            title: 'Total Attractions',
            value: stats?.total_attractions || 0,
            icon: <IconAttractions />,
        },
        {
            title: 'Total Reviews',
            value: stats?.total_reviews || 0,
            icon: <IconReviews />,
        },
        {
            title: 'Total Itineraries',
            value: stats?.total_itineraries || 0,
            icon: <IconItineraries />,
        },
        {
            title: 'Average Rating',
            value: stats?.average_rating?.toFixed(1) || '0.0',
            icon: <IconDashboard />,
        },
    ];

    const quickActions = [
        {
            to: '/admin/attractions',
            title: 'Manage Attractions',
            description: 'Add, edit, or remove attractions',
            icon: <IconAttractions />,
        },
        {
            to: '/admin/reviews',
            title: 'Moderate Reviews',
            description: 'View and manage user reviews',
            icon: <IconReviews />,
        },
        {
            to: '/admin/itineraries',
            title: 'View Itineraries',
            description: 'Browse user itineraries',
            icon: <IconItineraries />,
        },
    ];

    const sortedCategoryRatings = categoryRatings
        .slice()
        .sort((a, b) => b.average_rating - a.average_rating);

    return (
        <div className="dashboard-page">
            <header className="dashboard-page__header">
                <h1 className="dashboard-page__title">Dashboard Overview</h1>
                <p className="dashboard-page__subtitle text-muted">Welcome to the Barnamej Bahraini Admin Dashboard</p>
            </header>

            <section className="dashboard-grid dashboard-grid--stats" aria-label="Top statistics">
                {statItems.map((item) => (
                    <StatCard key={item.title} title={item.title} value={item.value} icon={item.icon} />
                ))}
            </section>

            <section className="dashboard-grid dashboard-grid--charts" aria-label="Performance and quality charts">
                <ChartCard
                    title="Rating Quality by Category"
                    subtitle="Average ratings across attraction categories"
                >
                    {sortedCategoryRatings.length === 0 ? (
                        <div className="dashboard-chart-empty">
                            <EmptyState
                                title="No ratings available"
                                description="Rating data will appear here once categories receive reviews."
                                compact
                            />
                        </div>
                    ) : (
                        <div className="dashboard-chart-bar-list">
                            {sortedCategoryRatings.map((item) => (
                                <div className="dashboard-chart-bar-row" key={item.category}>
                                    <div className="dashboard-chart-bar-label">
                                        {item.category}
                                        <span className="dashboard-chart-bar-subtext">
                                            {item.total_reviews} reviews
                                        </span>
                                    </div>
                                    <div className="dashboard-chart-bar-track">
                                        <div
                                            className="dashboard-chart-bar-fill"
                                            style={{ width: `${Math.min(100, (item.average_rating / 5) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="dashboard-chart-bar-value">{item.average_rating.toFixed(1)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </ChartCard>

                <ChartCard
                    title="Review Recency Trend (Last 8 Months)"
                    subtitle="Monthly review submissions over the latest window"
                >
                    {reviewTrend.length === 0 ? (
                        <div className="dashboard-chart-empty">
                            <EmptyState
                                title="No review activity"
                                description="Review volume by month will appear once new reviews are submitted."
                                compact
                            />
                        </div>
                    ) : (
                        <ReviewTrendInteractiveChart data={reviewTrend} />
                    )}
                </ChartCard>
            </section>

            <UserDemographics />

            <SectionCard
                title="Quick Actions"
                subtitle="Common admin tasks to jump into moderation and content management"
            >
                <div className="dashboard-grid dashboard-grid--actions">
                    {quickActions.map((action) => (
                        <QuickActionCard
                            key={action.title}
                            to={action.to}
                            title={action.title}
                            description={action.description}
                            icon={action.icon}
                        />
                    ))}
                </div>
            </SectionCard>
        </div>
    );
};

export default Dashboard;

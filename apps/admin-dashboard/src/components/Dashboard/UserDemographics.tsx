import { useEffect, useState } from 'react';
import { fetchReviewDemographics } from '../../api/client';
import { hasDemographicsData } from '../../utils/demographics';
import type { AgeGroupDatum, DemographicDatum, UserDemographicsData } from '../../types';
import './UserDemographics.css';

interface UserDemographicsProps {
    title?: string;
    loadDemographics?: () => Promise<UserDemographicsData>;
}

const LoadingState = ({ title }: { title: string }) => (
    <div className="card user-demographics-card">
        <div className="card-header">
            <div>
                <h2 className="card-title">{title}</h2>
                <p className="text-muted mb-0">Analyzing review submitter details</p>
            </div>
        </div>
        <div className="user-demographics-state">
            <div className="spinner"></div>
            <p className="text-muted mb-0">Loading demographics...</p>
        </div>
    </div>
);

const EmptyState = ({ title }: { title: string }) => (
    <div className="card user-demographics-card">
        <div className="card-header">
            <div>
                <h2 className="card-title">{title}</h2>
                <p className="text-muted mb-0">Analyzing review submitter details</p>
            </div>
        </div>
        <div className="empty-state">
            <p className="mb-sm">No demographic data available yet.</p>
            <p className="text-sm text-muted mb-0">
                Nationality or age information will appear here once review data includes those fields.
            </p>
        </div>
    </div>
);

const PIE_CHART_COLORS = [
    '#D71A28',
    '#FF6B6B',
    '#F59E0B',
    '#14B8A6',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#84CC16',
    '#F97316',
    '#06B6D4',
    '#A855F7',
    '#64748B',
];

function describePieArc(startAngle: number, endAngle: number, radius: number) {
    const center = 50;
    const startRadians = (startAngle - 90) * (Math.PI / 180);
    const endRadians = (endAngle - 90) * (Math.PI / 180);
    const startX = center + radius * Math.cos(startRadians);
    const startY = center + radius * Math.sin(startRadians);
    const endX = center + radius * Math.cos(endRadians);
    const endY = center + radius * Math.sin(endRadians);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
        `M ${center} ${center}`,
        `L ${startX} ${startY}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        'Z',
    ].join(' ');
}

const NationalityChart = ({ data }: { data: DemographicDatum[] }) => {
    if (data.length === 0) {
        return <div className="text-muted">No nationality data available yet.</div>;
    }

    let currentAngle = 0;
    const slices = data.map((item, index) => {
        const sweepAngle = (item.percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sweepAngle;
        currentAngle = endAngle;

        return {
            ...item,
            color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
            path: describePieArc(startAngle, endAngle, 44),
        };
    });

    return (
        <div className="pie-chart-layout">
            <div className="pie-chart-wrap">
                <svg viewBox="0 0 100 100" className="pie-chart" role="img" aria-label="Nationality distribution pie chart">
                    {slices.map((slice) => (
                        <path
                            key={slice.label}
                            d={slice.path}
                            fill={slice.color}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                        />
                    ))}
                    <circle cx="50" cy="50" r="18" fill="white" />
                    <text x="50" y="47" textAnchor="middle" className="pie-chart-total">
                        {data.reduce((sum, item) => sum + item.count, 0)}
                    </text>
                    <text x="50" y="56" textAnchor="middle" className="pie-chart-caption">
                        users
                    </text>
                </svg>
            </div>

            <div className="pie-chart-legend">
                {slices.map((slice) => (
                    <div className="pie-chart-legend-row" key={slice.label}>
                        <div className="pie-chart-legend-label">
                            <span
                                className="pie-chart-swatch"
                                style={{ backgroundColor: slice.color }}
                                aria-hidden="true"
                            />
                            <span>{slice.label}</span>
                        </div>
                        <div className="pie-chart-legend-meta">
                            <span>{slice.count}</span>
                            <span className="text-muted">{slice.percentage.toFixed(0)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AgeGroupChart = ({ data }: { data: AgeGroupDatum[] }) => {
    const maxCount = Math.max(...data.map((item) => item.count), 0);

    if (maxCount === 0) {
        return <div className="text-muted">No age data available yet.</div>;
    }

    return (
        <div className="age-chart" role="img" aria-label="Age group distribution chart">
            {data.map((item) => {
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                return (
                    <div className="age-chart-column" key={item.label}>
                        <span className="age-chart-value">{item.count}</span>
                        <div className="age-chart-bar-wrap">
                            <div className="age-chart-bar-bg">
                                <div className="age-chart-bar" style={{ height: `${Math.max(height, item.count > 0 ? 10 : 0)}%` }} />
                            </div>
                        </div>
                        <span className="age-chart-label">{item.label}</span>
                        <span className="age-chart-percentage text-muted">{item.percentage.toFixed(0)}%</span>
                    </div>
                );
            })}
        </div>
    );
};

const UserDemographics = ({
    title = 'User Demographics',
    loadDemographics = fetchReviewDemographics,
}: UserDemographicsProps) => {
    const [data, setData] = useState<UserDemographicsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            console.info('[UserDemographics] Component load started');

            try {
                setLoading(true);
                setError(null);
                const demographics = await loadDemographics();
                console.info(
                    `[UserDemographics] loadDemographics resolved: reviews=${demographics.review_count}, contributors=${demographics.contributor_count}, nationalitySamples=${demographics.nationality_sample_count}, ageSamples=${demographics.age_sample_count}`
                );
                if (active) {
                    console.info('[UserDemographics] Component load succeeded');
                    setData(demographics);
                }
            } catch (err) {
                console.log('[UserDemographics] Component load failed:', err);
                console.error('[UserDemographics] Component load failed:', err);
                if (active) {
                    setError('Failed to load user demographics');
                }
            } finally {
                if (active) {
                    console.info('[UserDemographics] Component load finished');
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [loadDemographics]);

    if (loading) {
        return <LoadingState title={title} />;
    }

    if (error) {
        return (
            <div className="card user-demographics-card">
                <div className="card-header">
                    <div>
                        <h2 className="card-title">{title}</h2>
                        <p className="text-muted mb-0">Analyzing review submitter details</p>
                    </div>
                </div>
                <div className="error-message mb-0">{error}</div>
            </div>
        );
    }

    if (!hasDemographicsData(data)) {
        return <EmptyState title={title} />;
    }

    return (
        <div className="card user-demographics-card">
            <div className="card-header user-demographics-header">
                <div>
                    <h2 className="card-title">{title}</h2>
                    <p className="text-muted mb-0">
                        Based on {data?.contributor_count || 0} review contributors across {data?.review_count || 0} submitted reviews
                    </p>
                </div>
                <div className="user-demographics-summary">
                    <div>
                        <strong>{data?.nationality_sample_count || 0}</strong>
                        <span className="text-muted"> with nationality</span>
                    </div>
                    <div>
                        <strong>{data?.age_sample_count || 0}</strong>
                        <span className="text-muted"> with age group</span>
                    </div>
                </div>
            </div>

            <div className="user-demographics-grid">
                <section className="demographics-panel">
                    <div className="demographics-panel-header">
                        <h3>Nationality Distribution</h3>
                        <span className="text-muted">{data?.nationality_sample_count || 0} contributors</span>
                    </div>
                    <NationalityChart data={data?.nationality_distribution || []} />
                </section>

                <section className="demographics-panel">
                    <div className="demographics-panel-header">
                        <h3>Age Group Distribution</h3>
                        <span className="text-muted">{data?.age_sample_count || 0} contributors</span>
                    </div>
                    <AgeGroupChart data={data?.age_group_distribution || []} />
                </section>
            </div>
        </div>
    );
};

export default UserDemographics;

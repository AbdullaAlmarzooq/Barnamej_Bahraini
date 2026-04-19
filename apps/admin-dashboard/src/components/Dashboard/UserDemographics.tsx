import { useEffect, useState } from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import { fetchReviewDemographics } from '../../api/client';
import { hasDemographicsData } from '../../utils/demographics';
import type { AgeGroupDatum, DemographicDatum, UserDemographicsData } from '../../types';
import EmptyState from './EmptyState';
import SectionCard from './SectionCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import './UserDemographics.css';

interface UserDemographicsProps {
    title?: string;
    loadDemographics?: () => Promise<UserDemographicsData>;
}

const DEMOGRAPHICS_SUBTITLE = 'Analyzing review submitter details';

const LoadingState = ({ title }: { title: string }) => (
    <SectionCard title={title} subtitle={DEMOGRAPHICS_SUBTITLE} className="user-demographics-card">
        <div className="user-demographics-state">
            <div className="spinner"></div>
            <p className="text-muted mb-0">Loading demographics...</p>
        </div>
    </SectionCard>
);

const NoDataState = ({ title }: { title: string }) => (
    <SectionCard title={title} subtitle={DEMOGRAPHICS_SUBTITLE} className="user-demographics-card">
        <EmptyState
            title="No demographic data available yet"
            description="Nationality or age information will appear here once review data includes those fields."
        />
    </SectionCard>
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

const NationalityChart = ({ data }: { data: DemographicDatum[] }) => {
    if (data.length === 0) {
        return <div className="text-muted">No nationality data available yet.</div>;
    }

    const slices = data.map((item, index) => {
        return {
            ...item,
            color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
        };
    });
    const totalUsers = data.reduce((sum, item) => sum + item.count, 0);

    const chartConfig = {
        count: {
            label: 'Contributors',
        },
    } satisfies ChartConfig;

    return (
        <div className="pie-chart-layout">
            <div className="pie-chart-wrap">
                <ChartContainer config={chartConfig} className="pie-chart" role="img" aria-label="Nationality distribution pie chart">
                    <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Pie data={slices} dataKey="count" nameKey="label" innerRadius={56} outerRadius={102} stroke="#FFFFFF" strokeWidth={2}>
                            {slices.map((slice) => (
                                <Cell key={slice.label} fill={slice.color} />
                            ))}
                            <Label
                                content={({ viewBox }) => {
                                    const pieViewBox = viewBox as { cx?: number; cy?: number } | undefined;

                                    if (!pieViewBox?.cx || !pieViewBox?.cy) {
                                        return null;
                                    }

                                    return (
                                        <text
                                            x={pieViewBox.cx}
                                            y={pieViewBox.cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                        >
                                            <tspan x={pieViewBox.cx} y={pieViewBox.cy - 4} className="pie-chart-total">
                                                {totalUsers}
                                            </tspan>
                                            <tspan x={pieViewBox.cx} y={pieViewBox.cy + 13} className="pie-chart-caption">
                                                users
                                            </tspan>
                                        </text>
                                    );
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
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
    const [refreshCount, setRefreshCount] = useState(0);

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
    }, [loadDemographics, refreshCount]);

    const handleRetry = () => {
        setRefreshCount((count) => count + 1);
    };

    if (loading) {
        return <LoadingState title={title} />;
    }

    if (error) {
        return (
            <SectionCard title={title} subtitle={DEMOGRAPHICS_SUBTITLE} className="user-demographics-card">
                <EmptyState
                    title="Unable to load demographics"
                    description={error}
                    actionLabel="Try again"
                    onAction={handleRetry}
                />
            </SectionCard>
        );
    }

    if (!hasDemographicsData(data)) {
        return <NoDataState title={title} />;
    }

    return (
        <SectionCard
            title={title}
            subtitle={`Based on ${data?.contributor_count || 0} review contributors across ${data?.review_count || 0} submitted reviews`}
            className="user-demographics-card"
            action={(
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
            )}
        >
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
        </SectionCard>
    );
};

export default UserDemographics;

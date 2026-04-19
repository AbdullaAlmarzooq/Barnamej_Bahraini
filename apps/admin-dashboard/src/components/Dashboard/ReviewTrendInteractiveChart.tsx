import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ReviewTrendPoint } from '../../types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Button } from '../ui/button';
import './dashboard-ui.css';

interface ReviewTrendInteractiveChartProps {
    data: ReviewTrendPoint[];
}

const RANGE_OPTIONS = [3, 6, 8] as const;
type RangeOption = (typeof RANGE_OPTIONS)[number];

function formatTrendMonthLabel(periodStartIso: string): string {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
    }).format(new Date(periodStartIso));
}

const chartConfig = {
    count: {
        label: 'Reviews',
        color: 'var(--color-primary)',
    },
} satisfies ChartConfig;

const ReviewTrendInteractiveChart = ({ data }: ReviewTrendInteractiveChartProps) => {
    const [activeRange, setActiveRange] = useState<RangeOption>(8);

    const chartData = useMemo(() => {
        return data.slice(-activeRange).map((point) => ({
            ...point,
            month_label: formatTrendMonthLabel(point.period_start),
        }));
    }, [activeRange, data]);

    return (
        <div className="dashboard-trend-interactive">
            <div className="dashboard-trend-interactive__controls" aria-label="Review trend range controls">
                {RANGE_OPTIONS.map((option) => (
                    <Button
                        key={option}
                        size="sm"
                        variant={activeRange === option ? 'default' : 'outline'}
                        onClick={() => setActiveRange(option)}
                        aria-pressed={activeRange === option}
                    >
                        {option}M
                    </Button>
                ))}
            </div>

            <ChartContainer config={chartConfig} className="dashboard-trend-interactive__chart">
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border-light)" />
                    <XAxis
                        dataKey="month_label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={12}
                    />
                    <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={28}
                        fontSize={12}
                    />
                    <ChartTooltip
                        cursor={{ fill: 'rgba(215, 26, 40, 0.08)' }}
                        content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="var(--color-primary)" />
                </BarChart>
            </ChartContainer>
        </div>
    );
};

export default ReviewTrendInteractiveChart;

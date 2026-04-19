import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import './dashboard-ui.css';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

const StatCard = ({ title, value, icon, trend }: StatCardProps) => {
    return (
        <Card className="dashboard-stat-card">
            <CardContent>
                <div className="dashboard-stat-card__row">
                    <div className="dashboard-stat-card__icon">{icon}</div>
                    <div className="dashboard-stat-card__details">
                        <div className="dashboard-stat-card__label">{title}</div>
                        <div className="dashboard-stat-card__value">{value}</div>
                    </div>
                </div>
                {trend ? (
                    <div
                        className={cn(
                            'dashboard-stat-card__trend',
                            trend.isPositive ? 'dashboard-stat-card__trend--positive' : 'dashboard-stat-card__trend--negative'
                        )}
                    >
                        {trend.isPositive ? '\u2191' : '\u2193'} {trend.value}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
};

export default StatCard;

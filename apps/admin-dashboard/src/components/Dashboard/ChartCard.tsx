import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import SectionCard from './SectionCard';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    className?: string;
    children: ReactNode;
}

const ChartCard = ({ title, subtitle, className, children }: ChartCardProps) => {
    return (
        <SectionCard
            title={title}
            subtitle={subtitle}
            className={cn('dashboard-chart-card', className)}
            contentClassName="dashboard-chart-card__content"
        >
            {children}
        </SectionCard>
    );
};

export default ChartCard;

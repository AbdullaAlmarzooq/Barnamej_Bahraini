import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import './dashboard-ui.css';

interface SectionCardProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    className?: string;
    contentClassName?: string;
    children: ReactNode;
}

const SectionCard = ({ title, subtitle, action, className, contentClassName, children }: SectionCardProps) => {
    return (
        <section className={cn('dashboard-section-card', className)}>
            <Card>
                <CardHeader className="dashboard-section-card__header">
                    <div className="dashboard-section-card__title-wrap">
                        <CardTitle className="dashboard-section-card__title">{title}</CardTitle>
                        {subtitle ? (
                            <CardDescription className="dashboard-section-card__description">{subtitle}</CardDescription>
                        ) : null}
                    </div>
                    {action}
                </CardHeader>
                <CardContent className={cn('dashboard-section-card__content', contentClassName)}>{children}</CardContent>
            </Card>
        </section>
    );
};

export default SectionCard;

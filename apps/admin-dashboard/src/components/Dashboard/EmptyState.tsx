import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import './dashboard-ui.css';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    compact?: boolean;
}

const EmptyState = ({
    title,
    description,
    icon,
    actionLabel,
    onAction,
    compact = false,
}: EmptyStateProps) => {
    return (
        <div className={cn('dashboard-empty-state', compact && 'dashboard-empty-state--compact')}>
            {icon ? <div className="dashboard-empty-state__icon">{icon}</div> : null}
            <h3 className="dashboard-empty-state__title">{title}</h3>
            <p className="dashboard-empty-state__description">{description}</p>
            {actionLabel && onAction ? (
                <Button variant="outline" size="sm" onClick={onAction}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
};

export default EmptyState;

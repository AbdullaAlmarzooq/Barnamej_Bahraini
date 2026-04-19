import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import './dashboard-ui.css';

interface QuickActionCardProps {
    to: string;
    title: string;
    description: string;
    icon: ReactNode;
}

const QuickActionCard = ({ to, title, description, icon }: QuickActionCardProps) => {
    return (
        <Link to={to} className="dashboard-quick-action-card">
            <Card>
                <CardContent className="dashboard-quick-action-card__body">
                    <div className="dashboard-quick-action-card__icon">{icon}</div>
                    <h3 className="dashboard-quick-action-card__title">{title}</h3>
                    <p className="dashboard-quick-action-card__description">{description}</p>
                    <span className="dashboard-quick-action-card__hint">Open section</span>
                </CardContent>
            </Card>
        </Link>
    );
};

export default QuickActionCard;

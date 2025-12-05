import './StatCard.css';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

const StatCard = ({ title, value, icon, trend }: StatCardProps) => {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <div className="stat-card-icon">{icon}</div>
                <div className="stat-card-content">
                    <div className="stat-card-title">{title}</div>
                    <div className="stat-card-value">{value}</div>
                </div>
            </div>
            {trend && (
                <div className={`stat-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
                    {trend.isPositive ? '↑' : '↓'} {trend.value}
                </div>
            )}
        </div>
    );
};

export default StatCard;

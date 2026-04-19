import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../../lib/utils';

type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        color?: string;
    }
>;

interface ChartContextProps {
    config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

const useChart = () => {
    const context = React.useContext(ChartContext);

    if (!context) {
        throw new Error('useChart must be used inside a <ChartContainer />');
    }

    return context;
};

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    config: ChartConfig;
    children: React.ReactElement;
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
    ({ className, children, config, style, ...props }, ref) => {
        const chartStyle = { ...style } as React.CSSProperties & Record<string, string>;

        Object.entries(config).forEach(([key, value]) => {
            if (value.color) {
                chartStyle[`--chart-color-${key}`] = value.color;
            }
        });

        return (
            <ChartContext.Provider value={{ config }}>
                <div ref={ref} className={cn('ui-chart-container', className)} style={chartStyle} {...props}>
                    <RechartsPrimitive.ResponsiveContainer>
                        {children}
                    </RechartsPrimitive.ResponsiveContainer>
                </div>
            </ChartContext.Provider>
        );
    }
);
ChartContainer.displayName = 'ChartContainer';

const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipContentProps extends RechartsPrimitive.TooltipProps<number, string> {
    hideLabel?: boolean;
    hideIndicator?: boolean;
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
    ({ active, payload, className, hideLabel = false, hideIndicator = false }, ref) => {
        const { config } = useChart();

        if (!active || !payload?.length) {
            return null;
        }

        return (
            <div ref={ref} className={cn('ui-chart-tooltip', className)}>
                {payload.map((item, index) => {
                    const itemKey = String(item.dataKey || item.name || 'value');
                    const itemConfig = config[itemKey];
                    const indicatorColor = item.color || item.payload?.fill;
                    const labelFromPayload =
                        typeof item.payload?.label === 'string' && item.payload.label.length > 0
                            ? item.payload.label
                            : null;
                    const labelText = labelFromPayload || itemConfig?.label || item.name || itemKey;

                    return (
                        <div key={`${itemKey}-${index}`} className="ui-chart-tooltip__row">
                            <div className="ui-chart-tooltip__title">
                                {!hideIndicator ? (
                                    <span
                                        className="ui-chart-tooltip__indicator"
                                        style={{ backgroundColor: indicatorColor }}
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <span>{labelText}</span>
                            </div>
                            <div className="ui-chart-tooltip__value">
                                {!hideLabel ? <span>{item.value}</span> : null}
                                {typeof item.payload?.percentage === 'number' ? (
                                    <span className="text-muted">{item.payload.percentage.toFixed(0)}%</span>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export { ChartContainer, ChartTooltip, ChartTooltipContent };
export type { ChartConfig };

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import './ui.css';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const sizeClassMap: Record<ButtonSize, string> = {
    default: 'ui-button--default-size',
    sm: 'ui-button--sm',
    lg: 'ui-button--lg',
};

const Button = ({
    className,
    type = 'button',
    variant = 'default',
    size = 'default',
    ...props
}: ButtonProps) => {
    return (
        <button
            type={type}
            className={cn('ui-button', `ui-button--${variant}`, sizeClassMap[size], className)}
            {...props}
        />
    );
};

export { Button };
export type { ButtonProps };

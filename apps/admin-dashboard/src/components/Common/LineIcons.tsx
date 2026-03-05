const baseProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
}

export const IconDashboard = () => (
    <svg {...baseProps}>
        <path d="M4 13h6v7H4z" />
        <path d="M14 4h6v16h-6z" />
        <path d="M4 4h6v5H4z" />
    </svg>
)

export const IconAttractions = () => (
    <svg {...baseProps}>
        <path d="M4 20h16" />
        <path d="M6 20V9l6-4 6 4v11" />
        <path d="M10 20v-4h4v4" />
        <path d="M8 12h.01M16 12h.01" />
    </svg>
)

export const IconReviews = () => (
    <svg {...baseProps}>
        <path d="M12 3l2.7 5.5 6.1.9-4.4 4.2 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.2 6.1-.9z" />
    </svg>
)

export const IconItineraries = () => (
    <svg {...baseProps}>
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
        <path d="M9 8l6 8" />
        <path d="M13 5h6v6" />
        <path d="M19 5l-6 6" />
    </svg>
)

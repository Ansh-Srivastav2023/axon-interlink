export const getButtonStyles = (t, theme = 'dark') => {
    const isDark = theme === 'dark';
    const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';
    const borderStrong = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)';
    const neutralBg = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.035)';
    const neutralHover = isDark ? 'rgba(255,255,255,0.075)' : 'rgba(15,23,42,0.06)';
    const activeBg = isDark ? 'rgba(59,130,246,0.14)' : 'rgba(37,99,235,0.09)';
    const activeBorder = isDark ? 'rgba(96,165,250,0.48)' : 'rgba(37,99,235,0.32)';
    const text = t.textHeading || t.text;
    const mutedText = t.textSecondary || t.text;
    const primary = t.primary || '#2563eb';
    const primaryHover = t.primaryHover || '#1d4ed8';
    const danger = t.danger || '#dc2626';

    const base = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '34px',
        padding: '8px 12px',
        borderRadius: '9px',
        border: `1px solid ${border}`,
        background: neutralBg,
        color: text,
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '0',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        boxShadow: 'none',
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease, opacity 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
    };

    const icon = {
        ...base,
        width: '36px',
        height: '36px',
        minHeight: '36px',
        padding: 0,
        borderRadius: '10px',
        color: mutedText,
    };

    return {
        tokens: {
            border,
            borderStrong,
            neutralBg,
            neutralHover,
            activeBg,
            activeBorder,
            text,
            mutedText,
            primary,
            primaryHover,
            danger,
        },
        base,
        primary: {
            ...base,
            background: primary,
            borderColor: primary,
            color: '#ffffff',
        },
        secondary: base,
        ghost: {
            ...base,
            background: 'transparent',
            borderColor: 'transparent',
            color: mutedText,
        },
        danger: {
            ...base,
            background: danger,
            borderColor: danger,
            color: '#ffffff',
        },
        softDanger: {
            ...base,
            background: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(220,38,38,0.08)',
            borderColor: isDark ? 'rgba(239,68,68,0.28)' : 'rgba(220,38,38,0.24)',
            color: '#ef4444',
        },
        icon,
        iconActive: {
            ...icon,
            background: activeBg,
            borderColor: activeBorder,
            color: text,
        },
        tab: (active) => ({
            ...base,
            minHeight: '32px',
            padding: '7px 10px',
            borderRadius: '8px',
            background: active ? activeBg : 'transparent',
            borderColor: active ? activeBorder : 'transparent',
            color: active ? text : mutedText,
            fontWeight: active ? 700 : 600,
        }),
        menuItem: {
            ...base,
            width: '100%',
            justifyContent: 'flex-start',
            minHeight: '36px',
            padding: '9px 12px',
            border: 'none',
            borderRadius: '7px',
            background: 'transparent',
            color: text,
            fontWeight: 500,
        },
        chip: {
            ...base,
            minHeight: '24px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '10px',
        },
    };
};

export const buttonHoverHandlers = (baseStyle, hoverStyle = {}) => ({
    onMouseEnter: (e) => {
        if (e.currentTarget.disabled) return;
        Object.assign(e.currentTarget.style, hoverStyle);
    },
    onMouseLeave: (e) => {
        Object.assign(e.currentTarget.style, baseStyle);
    },
    onMouseDown: (e) => {
        if (e.currentTarget.disabled) return;
        e.currentTarget.style.transform = 'scale(0.98)';
    },
    onMouseUp: (e) => {
        if (e.currentTarget.disabled) return;
        e.currentTarget.style.transform = hoverStyle.transform || baseStyle.transform || 'none';
    },
});

import { IconChevronRight } from '../../styles';
import { TABS } from './constants';

// Moved outside render - no more re-creation
const InsetHighlight = ({ isDark }) => (
    <div
        style={{
            position: 'absolute',
            inset: '1px',
            borderRadius: '11px',
            background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 50%)`,
            pointerEvents: 'none',
        }}
    />
);

const CollapsedView = ({ theme, setLeftTab, setLeftCollapsed, leftTab }) => {
    const isDark = theme === 'dark';

    const tokens = {
        bg: isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.65)',
        bgHover: isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        bgActive: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
        border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        borderHover: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        borderActive: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)',
        text: isDark ? 'rgba(244, 244, 245, 0.9)' : 'rgba(24, 24, 27, 0.9)',
        textActive: isDark ? '#60a5fa' : '#2563eb',
        shadow: isDark 
            ? '0 0 0 1px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
            : '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)',
        shadowHover: isDark
            ? '0 0 0 1px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)'
            : '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
    };

    const proGlassHover = (isActive = false) => ({
        onMouseEnter: (e) => {
            if (isActive) return;
            e.currentTarget.style.background = tokens.bgHover;
            e.currentTarget.style.borderColor = tokens.borderHover;
            e.currentTarget.style.boxShadow = tokens.shadowHover;
            e.currentTarget.style.transform = 'translateY(-1px)';
        },
        onMouseLeave: (e) => {
            if (isActive) return;
            e.currentTarget.style.background = tokens.bg;
            e.currentTarget.style.borderColor = tokens.border;
            e.currentTarget.style.boxShadow = tokens.shadow;
            e.currentTarget.style.transform = 'translateY(0)';
        },
        onMouseDown: (e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.96)';
        },
        onMouseUp: (e) => {
            e.currentTarget.style.transform = isActive ? 'translateY(0)' : 'translateY(-1px)';
        },
    });

    const getButtonStyle = (isActive) => ({
        position: 'relative',
        width: '44px',
        marginTop: '20px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '18px',
        cursor: 'pointer',
        border: `1px solid ${isActive ? tokens.borderActive : tokens.border}`,
        background: isActive 
            ? `linear-gradient(180deg, ${tokens.bgActive} 0%, ${tokens.bg} 100%)`
            : `linear-gradient(180deg, ${tokens.bg} 0%, ${isDark ? 'rgba(24,24,27,0.5)' : 'rgba(255,255,255,0.5)'} 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        color: isActive ? tokens.textActive : tokens.text,
        boxShadow: tokens.shadow,
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
    });

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 12px',
                gap: '8px',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            {TABS.map(([tab, Icon, label]) => {
                const isActive = leftTab === tab;
                return (
                    <button
                        key={tab}
                        onClick={() => {
                            setLeftTab(tab);
                            setLeftCollapsed(false);
                        }}
                        style={getButtonStyle(isActive)}
                        title={label}
                        {...proGlassHover(isActive)}
                    >
                        <InsetHighlight isDark={isDark} />
                        <Icon 
                            size={20} 
                            strokeWidth={isActive ? 2 : 1.5}
                            style={{ position: 'relative', zIndex: 1 }}
                        />
                    </button>
                );
            })}
            
            <div style={{ flex: 1 }} />
            
            <button
                onClick={() => setLeftCollapsed(false)}
                style={{
                    ...getButtonStyle(false),
                    marginTop: 'auto',
                }}
                title="Expand panel"
                {...proGlassHover(false)}
            >
                <InsetHighlight isDark={isDark} />
                <IconChevronRight
                    size={20}
                    strokeWidth={1.5}
                    style={{ position: 'relative', zIndex: 1 }}
                />
            </button>
        </div>
    );
};

export default CollapsedView;
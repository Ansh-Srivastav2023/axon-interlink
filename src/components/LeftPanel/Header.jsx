import { IconChevronLeft } from '../../styles';
import { TABS } from './constants';

const Header = ({ leftTab, setLeftTab, leftWidth, setLeftCollapsed, theme, s }) => {
    const isDark = theme === 'dark';
    const isCompact = leftWidth < 260;

    // Neutral professional tokens - no blue
    const tokens = {
        bg: isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.65)',
        bgHover: isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        bgActive: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        borderHover: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        borderActive: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        text: isDark ? 'rgba(244, 244, 245, 0.7)' : 'rgba(24, 24, 27, 0.7)',
        textActive: isDark ? 'rgba(244, 244, 245, 0.95)' : 'rgba(24, 24, 27, 0.95)',
        textSecondary: isDark ? 'rgba(244, 244, 245, 0.6)' : 'rgba(24, 24, 27, 0.6)',
    };

    const tabHover = (isActive) => ({
        onMouseEnter: (e) => {
            if (isActive) return;
            e.currentTarget.style.background = tokens.bgHover;
            e.currentTarget.style.borderColor = tokens.borderHover;
            e.currentTarget.style.color = tokens.text;
        },
        onMouseLeave: (e) => {
            if (isActive) return;
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = tokens.textSecondary;
        },
        onMouseDown: (e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
        },
        onMouseUp: (e) => {
            e.currentTarget.style.transform = 'scale(1)';
        },
    });

    const getTabStyle = (isActive) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isCompact ? '8px' : '7px 12px',
        fontSize: '13px',
        borderRadius: '8px',
        border: `1px solid ${isActive ? tokens.borderActive : 'transparent'}`,
        cursor: 'pointer',
        fontWeight: isActive ? 600 : 500,
        background: isActive ? tokens.bgActive : 'transparent',
        backdropFilter: isActive ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: isActive ? 'blur(20px) saturate(180%)' : 'none',
        color: isActive ? tokens.textActive : tokens.textSecondary,
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        whiteSpace: 'nowrap',
    });

    const collapseBtnHover = {
        onMouseEnter: (e) => {
            e.currentTarget.style.background = tokens.bgHover;
            e.currentTarget.style.borderColor = tokens.borderHover;
            e.currentTarget.style.transform = 'translateX(-1px)';
        },
        onMouseLeave: (e) => {
            e.currentTarget.style.background = tokens.bg;
            e.currentTarget.style.borderColor = tokens.border;
            e.currentTarget.style.transform = 'translateX(0)';
        },
        onMouseDown: (e) => {
            e.currentTarget.style.transform = 'translateX(0) scale(0.94)';
        },
        onMouseUp: (e) => {
            e.currentTarget.style.transform = 'translateX(-1px)';
        },
    };

    return (
        <div 
            style={{
                ...s.panelHeader,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '12px',
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <div style={{ 
                display: 'flex', 
                gap: '4px', 
                flex: 1,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}>
                {TABS.map(([tab, Icon, label]) => {
                    const isActive = leftTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setLeftTab(tab)}
                            title={label}
                            style={getTabStyle(isActive)}
                            {...tabHover(isActive)}
                        >
                            {isActive && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: '1px',
                                        borderRadius: '7px',
                                        background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 60%)`,
                                        pointerEvents: 'none',
                                    }}
                                />
                            )}
                            <Icon 
                                size={16} 
                                strokeWidth={isActive ? 2 : 1.75}
                                style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
                            />
                            {!isCompact && (
                                <span style={{ position: 'relative', zIndex: 1 }}>
                                    {label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            
            <button
                onClick={() => setLeftCollapsed(true)}
                style={{
                    ...s.iconBtn,
                    position: 'relative',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '18px',
                    border: `1px solid ${tokens.borderActive}`,
                    background: tokens.bg,
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    color: tokens.text,
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                    flexShrink: 0,
                    boxShadow: isDark 
                        ? 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 2px rgba(0, 0, 0, 0.3)'
                        : 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 1px 2px rgba(0, 0, 0, 0.04)',
                }}
                title="Collapse"
                {...collapseBtnHover}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: '1px',
                        borderRadius: '18px',
                        background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 50%)`,
                        pointerEvents: 'none',
                    }}
                />
                <IconChevronLeft 
                    size={16} 
                    strokeWidth={1.75}
                    style={{ position: 'relative', zIndex: 1 }}
                />
            </button>
        </div>
    );
};

export default Header;

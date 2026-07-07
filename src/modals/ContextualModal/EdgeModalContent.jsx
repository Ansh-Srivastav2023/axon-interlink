import { IconTrace } from '../../styles/icons';
import { EDGE_COLORS } from './constants';
import ModalHeader from './ModalHeader';

const EdgeModalContent = ({
    edge,
    targetId,
    t,
    s,
    theme,
    recordHistory,
    setEdges,
    closeModal,
    setGlowingNet
}) => {
    const isDark = theme === 'dark';

    // Neutral professional tokens
    const tokens = {
        bg: isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.65)',
        bgHover: isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        borderHover: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        text: isDark ? 'rgba(244, 244, 245, 0.9)' : 'rgba(24, 24, 27, 0.9)',
        textSecondary: isDark ? 'rgba(244, 244, 245, 0.6)' : 'rgba(24, 24, 27, 0.6)',
        danger: '#ef4444',
        dangerBg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
        dangerBorder: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
        inputBg: isDark ? 'rgba(24, 24, 27, 0.5)' : 'rgba(255, 255, 255, 0.6)',
    };

    const glassInput = {
        ...s.input,
        background: tokens.inputBg,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        color: tokens.text,
        border: `1px solid ${tokens.border}`,
        borderRadius: '8px',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
    };

    const glassButton = (isDanger = false) => ({
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        borderRadius: '8px',
        border: `1px solid ${isDanger ? tokens.dangerBorder : tokens.border}`,
        background: isDanger 
            ? tokens.dangerBg
            : tokens.bg,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        color: isDanger ? tokens.danger : tokens.text,
        cursor: 'pointer',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        userSelect: 'none',
        boxShadow: isDark 
            ? 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 2px rgba(0, 0, 0, 0.3)'
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 1px 2px rgba(0, 0, 0, 0.04)',
    });

    const buttonHover = (isDanger = false) => ({
        onMouseEnter: (e) => {
            e.currentTarget.style.background = isDanger 
                ? (isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)')
                : tokens.bgHover;
            e.currentTarget.style.borderColor = isDanger 
                ? (isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.35)')
                : tokens.borderHover;
            e.currentTarget.style.transform = 'translateY(-1px)';
        },
        onMouseLeave: (e) => {
            e.currentTarget.style.background = isDanger ? tokens.dangerBg : tokens.bg;
            e.currentTarget.style.borderColor = isDanger ? tokens.dangerBorder : tokens.border;
            e.currentTarget.style.transform = 'translateY(0)';
        },
        onMouseDown: (e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
        },
        onMouseUp: (e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
        },
    });

    return (
        <>
            <ModalHeader
                title="Net Trace Metrics"
                icon={<IconTrace size={20} />}
                onClose={closeModal}
                theme={theme}
                t={t}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={s.formGroup}>
                    <label style={{ ...s.label, color: tokens.textSecondary, fontWeight: 500 }}>
                        Explicit Bus Width Constraint
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                        <input
                            type="number"
                            min="1"
                            max="128"
                            value={edge.data?.bitWidth || 1}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val > 0 && val <= 128) {
                                    recordHistory();
                                    setEdges(eds => eds.map(ed =>
                                        ed.id === targetId
                                            ? { ...ed, data: { ...ed.data, bitWidth: val } }
                                            : ed
                                    ));
                                }
                            }}
                            style={{ 
                                ...glassInput, 
                                width: '70px', 
                                padding: '7px', 
                                textAlign: 'center',
                                fontSize: '13px'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = tokens.borderHover;
                                e.currentTarget.style.background = tokens.bgHover;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = tokens.border;
                                e.currentTarget.style.background = tokens.inputBg;
                            }}
                        />
                        <span style={{ fontSize: '12px', color: tokens.textSecondary }}>
                            bits width array
                        </span>
                    </div>
                    <span style={{ 
                        fontSize: '12px', 
                        color: tokens.textSecondary,
                        marginTop: '6px',
                        display: 'block'
                    }}> 
                        Note: Max <strong style={{ color: tokens.text, fontWeight: 600 }}>Width</strong> possible is <strong style={{ color: tokens.text, fontWeight: 600 }}>128</strong>. 
                    </span>
                </div>

                <div style={s.formGroup}>
                    <label style={{ ...s.label, color: tokens.textSecondary, fontWeight: 500 }}>
                        Net Highlighter Schematic Tint
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {EDGE_COLORS.map(color => (
                            <div
                                key={color}
                                onClick={() => {
                                    recordHistory();
                                    setEdges(eds => eds.map(e =>
                                        e.id === targetId
                                            ? { ...e, data: { ...e.data, color } }
                                            : e
                                    ));
                                }}
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    backgroundColor: color,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    border: edge.data?.color === color 
                                        ? `2px solid ${isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'}`
                                        : `1px solid ${tokens.border}`,
                                    boxShadow: edge.data?.color === color
                                        ? '0 0 0 2px rgba(255,255,255,0.1)'
                                        : 'none',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = edge.data?.color === color
                                        ? '0 0 0 2px rgba(255,255,255,0.1)'
                                        : 'none';
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: `1px solid ${tokens.border}`,
                userSelect: 'none'
            }}>
                <button
                    onClick={() => {
                        setEdges(eds => eds.filter(e => e.id !== targetId));
                        closeModal();
                        setGlowingNet(null);
                    }}
                    style={glassButton(true)}
                    {...buttonHover(true)}
                >
                    Purge Route
                </button>
                <button 
                    onClick={closeModal} 
                    style={glassButton(false)}
                    {...buttonHover(false)}
                >
                    Confirm
                </button>
            </div>
        </>
    );
};

export default EdgeModalContent;
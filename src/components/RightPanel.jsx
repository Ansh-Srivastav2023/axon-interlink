import { IconChevronLeft, IconChevronRight } from "../styles";
import { highlightVerilogCode } from "../verilog-code/verilogEdits";
import TopSymbolView from "./TopSymbolView";

const VIEW_TABS = [
    {
        id: 'code',
        label: 'Code',
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        )
    },
    {
        id: 'symbol',
        label: 'Block Diagram',
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
        )
    },
    {
        id: 'testbench',
        label: 'TB Template',
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
        )
    }
];

const RightPanel = ({
    s,
    setTopViewMode,
    setRightCollapsed,
    rightCollapsed,
    topViewMode,
    t,
    theme,
    exposedPorts,
    nodes,
    handleVerilogLineClick,
    structuralVerilogFull,
    testbenchCodeFull,
    copied,
    handleCopyCode,
    rightWidth
}) => {
    const isDark = theme === 'dark';

    // Professional neutral glass tokens
    const tokens = {
        bg: isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.65)',
        bgHover: isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        bgActive: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        borderHover: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        borderActive: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        text: isDark ? 'rgba(244, 244, 245, 0.9)' : 'rgba(24, 24, 27, 0.9)',
        textSecondary: isDark ? 'rgba(244, 244, 245, 0.6)' : 'rgba(24, 24, 27, 0.6)',
        success: '#10b981',
    };

    const glassHover = (isActive = false) => ({
        onMouseEnter: (e) => {
            if (isActive) return;
            e.currentTarget.style.background = tokens.bgHover;
            e.currentTarget.style.borderColor = tokens.borderHover;
            e.currentTarget.style.transform = 'translateY(-1px)';
        },
        onMouseLeave: (e) => {
            if (isActive) return;
            e.currentTarget.style.background = isActive ? tokens.bgActive : tokens.bg;
            e.currentTarget.style.borderColor = isActive ? tokens.borderActive : tokens.border;
            e.currentTarget.style.transform = 'translateY(0)';
        },
        onMouseDown: (e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
        },
        onMouseUp: (e) => {
            e.currentTarget.style.transform = isActive ? 'translateY(0)' : 'translateY(-1px)';
        },
    });

    const renderCollapsed = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 12px',
            gap: '8px',
            height: '100%',
            boxSizing: 'border-box',
            position: 'relative',
        }}>
            {VIEW_TABS.map(({ id, icon }) => (
                <button
                    key={id}
                    onClick={() => { setTopViewMode(id); setRightCollapsed(false); }}
                    style={{
                        position: 'relative',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '20px',
                        borderRadius: '18px',
                        cursor: 'pointer',
                        border: `1px solid ${tokens.border}`,
                        background: tokens.bg,
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        color: tokens.text,
                        boxShadow: isDark
                            ? '0 0 0 1px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
                            : '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none',
                    }}
                    title={id === 'code' ? 'Code View' : id === 'symbol' ? 'Block Diagram' : 'Testbench'}
                    {...glassHover(false)}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: '1px',
                            borderRadius: '11px',
                            background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 50%)`,
                            pointerEvents: 'none',
                        }}
                    />
                    <div style={{ position: 'relative', zIndex: 1 }}>{icon}</div>
                </button>
            ))}

            <div style={{ flex: 1 }} />

            <button
                onClick={() => setRightCollapsed(false)}
                style={{
                    position: "relative",
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    // marginBottom: "17px",
                    borderRadius: "18px",
                    border: `1px solid ${tokens.border}`,
                    background: tokens.bg,
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    cursor: "pointer",
                    color: tokens.text,
                    boxShadow: isDark
                        ? '0 0 0 1px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
                        : '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)',
                    transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                    outline: 'none',
                }}
                title="Expand panel"
                {...glassHover(false)}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: '1px',
                        borderRadius: '11px',
                        background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 50%)`,
                        pointerEvents: 'none',
                    }}
                />
                <IconChevronLeft size={20} style={{ position: 'relative', zIndex: 1 }} />
            </button>
        </div>
    );

    const renderHeader = () => (
        <div style={{
            ...s.panelHeader,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: '12px',
            borderBottom: `1px solid ${tokens.border}`,
        }}>
            <span style={s.sectionTitle}>
                Complete Structural System Top Layout
            </span>

            <button
                onClick={() => setRightCollapsed(true)}
                style={{
                    position: 'relative',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    border: `1px solid ${tokens.border}`,
                    background: tokens.bg,
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    color: tokens.text,
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                }}
                title="Collapse"
                {...glassHover(false)}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: '1px',
                        borderRadius: '7px',
                        background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 50%)`,
                        pointerEvents: 'none',
                    }}
                />
                <IconChevronRight size={16} style={{ position: 'relative', zIndex: 1 }} />
            </button>
        </div>
    );

    const renderTabs = () => {
        const isTightSpace = rightWidth < 360;
        const hasCode = topViewMode === 'code' || topViewMode === 'testbench';

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                background: t.bgSecondary,
                borderBottom: `1px solid ${tokens.border}`,
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    {VIEW_TABS.map(({ id, label, icon }) => {
                        const active = topViewMode === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setTopViewMode(id)}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: isTightSpace ? '8px' : '7px 12px',
                                    minWidth: isTightSpace ? '36px' : 'auto',
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 500,
                                    borderRadius: '8px',
                                    border: `1px solid ${active ? tokens.borderActive : 'transparent'}`,
                                    background: active ? tokens.bgActive : 'transparent',
                                    backdropFilter: active ? 'blur(20px) saturate(180%)' : 'none',
                                    WebkitBackdropFilter: active ? 'blur(20px) saturate(180%)' : 'none',
                                    color: active ? tokens.text : tokens.textSecondary,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                    outline: 'none',
                                }}
                                title={label}
                                {...glassHover(active)}
                            >
                                {active && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: '1px',
                                            borderRadius: '7px',
                                            background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)'} 0%, transparent 60%)`,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )}
                                <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>{icon}</div>
                                {!isTightSpace && <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{label}</span>}
                            </button>
                        );
                    })}
                </div>

                {hasCode && (
                    <button
                        onClick={handleCopyCode}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 10px',
                            height: '32px',
                            width: '36px',
                            borderRadius: '8px',
                            border: `1px solid ${copied ? tokens.success + '40' : tokens.border}`,
                            background: copied ? tokens.success + '15' : tokens.bg,
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                            color: copied ? tokens.success : tokens.text,
                            cursor: 'pointer',
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            outline: 'none',
                            flexShrink: 0,
                        }}
                        title={copied ? "Copied!" : "Copy Code"}
                        onMouseEnter={(e) => {
                            if (copied) return;
                            e.currentTarget.style.background = tokens.bgHover;
                            e.currentTarget.style.borderColor = tokens.borderHover;
                        }}
                        onMouseLeave={(e) => {
                            if (copied) return;
                            e.currentTarget.style.background = tokens.bg;
                            e.currentTarget.style.borderColor = tokens.border;
                        }}
                    >
                        {copied ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="7" y="6" width="12" height="15" rx="3" ry="3" />
                                <path d="M4 14V7a4 4 0 0 1 4-4h7" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        );
    };

    const renderContent = () => {
        if (topViewMode === 'code') {
            return (
                <div style={{
                    ...s.codeBlock,
                    overflowY: 'auto',
                    padding: '12px',
                    fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                    fontSize: '12px',
                    lineHeight: '1.6'
                }}>
                    {structuralVerilogFull.split('\n').map((line, idx) => {
                        const isCommentOrEmpty = !line.trim() || line.trim().startsWith('//');
                        const isInteractive = !isCommentOrEmpty && (
                            line.includes('wire w_') ||
                            line.includes('assign w_') ||
                            (nodes || []).some(n => n && line.includes(n.data?.instanceName))
                        );

                        return (
                            <div
                                key={`v_line_${idx}`}
                                onClick={() => isInteractive && typeof handleVerilogLineClick === 'function' && handleVerilogLineClick(line)}
                                style={{
                                    padding: '0 6px',
                                    borderRadius: '3px',
                                    cursor: isInteractive ? 'pointer' : 'text',
                                    transition: 'background 0.15s ease',
                                    whiteSpace: 'pre',
                                    minHeight: '18px'
                                }}
                                onMouseEnter={(e) => {
                                    if (isInteractive) {
                                        e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                                dangerouslySetInnerHTML={{ __html: highlightVerilogCode(line, theme) }}
                            />
                        );
                    })}
                </div>
            );
        }
        if (topViewMode === 'testbench') {
            return <pre style={s.codeBlock} dangerouslySetInnerHTML={{ __html: highlightVerilogCode(testbenchCodeFull, theme) }} />;
        }

        return (
            <TopSymbolView
                exposedPorts={exposedPorts}
                nodes={nodes}
                theme={theme}
            />
        );
    };

    if (rightCollapsed) {
        return <div style={s.rightPanel}>{renderCollapsed()}</div>;
    }

    return (
        <div style={s.rightPanel}>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {renderHeader()}
                {renderTabs()}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default RightPanel;
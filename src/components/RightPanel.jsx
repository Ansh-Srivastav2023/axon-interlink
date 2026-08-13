import { highlightVerilogCode } from "../verilog-code/verilogEdits";
import { hasExactIdentifierToken, isNavigableWireLine } from "../utils/verilogNavigation";
import TopSymbolView from "./TopSymbolView";

const VIEW_TABS = [
    {
        id: 'code',
        label: 'Top Module',
        icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        )
    },
    {
        id: 'symbol',
        label: 'Block Diagram',
        icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
        )
    },
    {
        id: 'testbench',
        label: 'Testbench',
        icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
        )
    }
];

const RightActivityBar = ({
    topViewMode,
    setTopViewMode,
    rightCollapsed,
    setRightCollapsed,
    theme,
    t,
    copied,
    handleCopyCode,
    downloadTextFile,
    structuralVerilogFull,
    testbenchCodeFull,
    activeTopModuleName,
    generatedCodeDirty,
    onRefreshGeneratedCode,
}) => {
    const isDark = theme === 'dark';
    const railBg = isDark ? '#18181b' : '#f8fafc';
    const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';
    const activeColor = isDark ? '#ffffff' : '#111827';
    const inactiveColor = isDark ? '#8b949e' : '#64748b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)';
    const canActOnCode = topViewMode === 'code' || topViewMode === 'testbench';

    const itemStyle = (isActive) => ({
        position: 'relative',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 0,
        background: 'transparent',
        color: isActive ? activeColor : inactiveColor,
        cursor: 'pointer',
        transition: 'background 0.12s ease, color 0.12s ease',
        padding: 0,
    });

    const hoverHandlers = {
        onMouseEnter: (e) => {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.color = activeColor;
        },
        onMouseLeave: (e) => {
            const isActive = e.currentTarget.dataset.active === 'true';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = isActive ? activeColor : inactiveColor;
        },
    };

    const getCurrentCode = () => {
        if (topViewMode === 'testbench') return testbenchCodeFull;
        if (generatedCodeDirty && typeof onRefreshGeneratedCode === 'function') return onRefreshGeneratedCode();
        return structuralVerilogFull;
    };
    const safeModuleName = activeTopModuleName || 'top_module';
    const downloadName = topViewMode === 'testbench' ? `${safeModuleName}_tb.v` : `${safeModuleName}.v`;

    return (
        <div
            style={{
                width: '48px',
                minWidth: '48px',
                height: '100%',
                background: railBg,
                borderLeft: `1px solid ${borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
            }}
        >
            {VIEW_TABS.map(({ id, label, icon }) => {
                const isActive = topViewMode === id;
                return (
                    <button
                        key={id}
                        type="button"
                        data-active={isActive}
                        title={label}
                        onClick={() => {
                            if (topViewMode === id && !rightCollapsed) {
                                setRightCollapsed(true);
                            } else {
                                setTopViewMode(id);
                                setRightCollapsed(false);
                            }
                        }}
                        style={itemStyle(isActive)}
                        {...hoverHandlers}
                    >
                        {isActive && (
                            <span
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '8px',
                                    bottom: '8px',
                                    width: '2px',
                                    borderRadius: '0 2px 2px 0',
                                    background: t.primary || '#3b82f6',
                                }}
                            />
                        )}
                        {icon}
                    </button>
                );
            })}

            {canActOnCode && (
                <>
                    <div style={{ height: '1px', margin: '8px 10px', background: borderColor }} />
                    <button
                        type="button"
                        title="Download Verilog"
                        onClick={() => downloadTextFile(downloadName, getCurrentCode())}
                        style={itemStyle(false)}
                        {...hoverHandlers}
                    >
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        title={copied ? 'Copied' : 'Copy Code'}
                        onClick={handleCopyCode}
                        style={{
                            ...itemStyle(false),
                            color: copied ? '#10b981' : inactiveColor,
                        }}
                        {...hoverHandlers}
                    >
                        {copied ? (
                            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="7" y="6" width="12" height="15" rx="3" ry="3" />
                                <path d="M4 14V7a4 4 0 0 1 4-4h7" />
                            </svg>
                        )}
                    </button>
                </>
            )}
        </div>
    );
};

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
    downloadTextFile,
    activeTopModuleName,
    generatedCodeDirty,
    onRefreshGeneratedCode,
    performanceMode,
}) => {
    const isDark = theme === 'dark';
    const codeTheme = {
        bg: isDark ? '#0d1117' : '#ffffff',
        gutterBg: isDark ? '#0b1017' : '#f6f8fa',
        border: isDark ? '#30363d' : '#d0d7de',
        text: isDark ? '#e6edf3' : '#24292f',
        muted: isDark ? '#7d8590' : '#6e7781',
        activeBg: isDark ? 'rgba(56,139,253,0.10)' : 'rgba(9,105,218,0.08)',
        hoverBg: isDark ? 'rgba(56,139,253,0.12)' : 'rgba(9,105,218,0.07)',
    };

    const renderCodePanel = (code, { interactive = false } = {}) => {
        const lines = String(code || '').split('\n');
        return (
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    overflow: 'auto',
                    background: codeTheme.bg,
                    color: codeTheme.text,
                    fontFamily: '"SF Mono", Consolas, Menlo, Monaco, monospace',
                    fontSize: '12px',
                    lineHeight: '20px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: isDark ? '#30363d #0d1117' : '#c8d1dc #f6f8fa',
                }}
            >
                <div
                    style={{
                        minWidth: '52px',
                        padding: '12px 10px 12px 0',
                        background: codeTheme.gutterBg,
                        borderRight: `1px solid ${codeTheme.border}`,
                        color: codeTheme.muted,
                        textAlign: 'right',
                        userSelect: 'none',
                        flexShrink: 0,
                    }}
                >
                    {lines.map((_, idx) => (
                        <div key={`gutter_${idx}`} style={{ height: '20px' }}>
                            {idx + 1}
                        </div>
                    ))}
                </div>
                <div style={{ minWidth: 'max-content', padding: '12px 16px' }}>
                    {lines.map((line, idx) => {
                        const isCommentOrEmpty = !line.trim() || line.trim().startsWith('//');
                        const isInteractive = interactive && !isCommentOrEmpty && (
                            isNavigableWireLine(line) ||
                            (nodes || []).some(n => n && hasExactIdentifierToken(line, n.data?.instanceName))
                        );

                        return (
                            <div
                                key={`code_line_${idx}`}
                                onClick={() => isInteractive && typeof handleVerilogLineClick === 'function' && handleVerilogLineClick(line)}
                                style={{
                                    padding: '0 8px',
                                    borderRadius: '5px',
                                    cursor: isInteractive ? 'pointer' : 'text',
                                    transition: 'background 0.12s ease',
                                    whiteSpace: 'pre',
                                    minHeight: '20px',
                                }}
                                onMouseEnter={(e) => {
                                    if (isInteractive) e.currentTarget.style.background = codeTheme.hoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                                dangerouslySetInnerHTML={{ __html: highlightVerilogCode(line || ' ', theme) }}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (topViewMode === 'code') {
            return (
                <>
                    {performanceMode && generatedCodeDirty && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '8px 12px',
                                borderBottom: `1px solid ${codeTheme.border}`,
                                background: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.12)',
                                color: '#f59e0b',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0,
                            }}
                        >
                            <span>Generated top module is stale. Refresh when needed.</span>
                            <button
                                type="button"
                                onClick={onRefreshGeneratedCode}
                                style={{
                                    border: '1px solid rgba(245,158,11,0.45)',
                                    background: 'transparent',
                                    color: '#f59e0b',
                                    borderRadius: '5px',
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                }}
                            >
                                Refresh
                            </button>
                        </div>
                    )}
                    {renderCodePanel(structuralVerilogFull, { interactive: true })}
                </>
            );
        }

        if (topViewMode === 'testbench') {
            return renderCodePanel(testbenchCodeFull);
        }

        return (
            <TopSymbolView
                exposedPorts={exposedPorts}
                nodes={nodes}
                theme={theme}
            />
        );
    };

    return (
        <div style={s.rightPanel}>
            {!rightCollapsed && (
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {renderContent()}
                </div>
            )}
            <RightActivityBar
                topViewMode={topViewMode}
                setTopViewMode={setTopViewMode}
                rightCollapsed={rightCollapsed}
                setRightCollapsed={setRightCollapsed}
                theme={theme}
                t={t}
                copied={copied}
                handleCopyCode={handleCopyCode}
                downloadTextFile={downloadTextFile}
                structuralVerilogFull={structuralVerilogFull}
                testbenchCodeFull={testbenchCodeFull}
                activeTopModuleName={activeTopModuleName}
                generatedCodeDirty={generatedCodeDirty}
                onRefreshGeneratedCode={onRefreshGeneratedCode}
            />
        </div>
    );
};

export default RightPanel;

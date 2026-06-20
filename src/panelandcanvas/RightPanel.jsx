import { IconChevronLeft, IconChevronRight } from "../styles";
import { highlightVerilogCode } from "../verilog-code/verilogEdits";
import TopSymbolView from "./TopSymbolView";

/**
 * RightPanel – displays the right sidebar of the schematic editor.
 * It shows the structural Verilog code, a block diagram symbol, or a testbench template.
 * The panel can be collapsed to a narrow icon bar.
 */

// ----- Constants (defined outside the component to avoid recreation on each render) -----

/** Configuration for the three view tabs: code, symbol (block diagram), and testbench. */
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

/** Reusable mouse‑enter helper for buttons: scales up and adds a glow. */
const hoverScale = (e, scale = 1.12) => {
    e.currentTarget.style.transform = `scale(${scale})`;
    e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
    e.currentTarget.style.filter = "brightness(1.2)";
};

/** Reusable mouse‑leave helper: resets scale, shadow, and brightness. */
const unhover = (e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.filter = "brightness(1)";
};

const RightPanel = ({
    s,                      // style object (from parent)
    setTopViewMode,         // state setter for active tab ('code'|'symbol'|'testbench')
    setRightCollapsed,      // state setter for collapsing the panel
    rightCollapsed,         // boolean – is the panel collapsed?
    topViewMode,            // current active tab
    t,                      // theme colour object
    theme,                  // 'dark' or 'light'
    exposedPorts,
    nodes,
    handleVerilogLineClick,
    structuralVerilogFull,  // string of full structural Verilog code
    testbenchCodeFull,      // string of testbench code
    copied,                 // boolean – copy success state
    handleCopyCode,         // callback to copy the currently displayed code
    rightWidth              // current width of the panel (for responsive hiding of labels)
}) => {

    // ----- Render helper: collapsed icon bar (when rightCollapsed === true) -----

    const renderCollapsed = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '14px',
            gap: '16px',
            height: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Loop through all view tabs and render an icon button for each */}
            {VIEW_TABS.map(({ id, icon }) => (
                <button
                    key={id}
                    onClick={() => { setTopViewMode(id); setRightCollapsed(false); }}
                    className={`sidebar-expand-btn ${theme === "dark" ? "dark" : "light"}`}
                    onMouseEnter={hoverScale}
                    onMouseLeave={unhover}
                    style={{
                        padding: '10px',
                        top: '20px',
                        marginTop: '30px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        background: "linear-gradient(90deg, #eb2525, #5004c8)",
                        color: '#fff',
                        transition: 'all 0.3s ease'
                    }}
                    title={id === 'code' ? 'Code View' : id === 'symbol' ? 'Block Diagram' : 'Testbench'}
                >
                    {icon}
                </button>
            ))}

            {/* Expand button: appears only when collapsed, to re‑open the panel */}
            <button
                onClick={() => setRightCollapsed(false)}
                className={`sidebar-expand-btn ${theme === "dark" ? "dark" : "light"}`}
                style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: 0,
                    background: "linear-gradient(90deg, #1179f9, #4a10fa)",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    color: "#fff",
                    transition: "all 0.3s ease",
                }}
                title="Expand panel"
            >
                <IconChevronLeft size={20} style={{ transition: "transform 0.3s ease", transform: "translateX(1px)" }} />
            </button>
        </div>
    );

    // ----- Render helper: panel header (title + collapse button) -----

    const renderHeader = () => (
        <div style={s.panelHeader}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '30px', // Adjust spacing here
                }}
            >
                <span style={s.sectionTitle}>
                    Complete Structural System Top Layout
                </span>

                <button
                    onClick={() => setRightCollapsed(true)}
                    className={`sidebar-expand-btn ${theme === 'dark' ? 'dark' : 'light'}`}
                    onMouseEnter={hoverScale}
                    onMouseLeave={unhover}
                    style={{ ...s.iconBtn, marginTop: '45px' }}
                    title="Collapse"
                >
                    <IconChevronRight size={14} />
                </button>
            </div>
        </div>
    );


    // ----- Render helper: the row of tabs (Code, Block Diagram, TB) and the copy button -----

    const renderTabs = () => {
        const isTightSpace = rightWidth < 360;   // hide text labels when panel is narrow
        const hasCode = topViewMode === 'code' || topViewMode === 'testbench';  // show copy button only for code views

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                background: t.bgSecondary,
                borderBottom: `4px solid ${t.border}`,
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}>
                {/* Tab buttons container */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    {VIEW_TABS.map(({ id, label, icon }) => {
                        const active = topViewMode === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setTopViewMode(id)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.05)";
                                    e.currentTarget.style.filter = "brightness(1.2)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.filter = "brightness(1)";
                                }}
                                style={{
                                    ...(active ? s.tabBtnActive : s.tabBtnInactive),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px 8px',
                                    minWidth: isTightSpace ? '36px' : 'auto',
                                    marginRight: id === 'testbench' ? 0 : '10px'   // last tab no extra margin
                                }}
                                title={label}
                            >
                                {icon}
                                {!isTightSpace && <span style={{ marginLeft: '4px', whiteSpace: 'nowrap' }}>{label}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Copy button – only appears when viewing Code or Testbench */}
                {hasCode && (
                    <button
                        onClick={handleCopyCode}
                        className={`sidebar-expand-btn ${theme === 'dark' ? 'dark' : 'light'}`}
                        style={{
                            ...s.smallBtn,
                            background: copied ? '#10b981' : "linear-gradient(90deg, #328eff, #4000ff)",
                            color: '#fff',
                            top: '14px',
                            border: 'none',
                            transition: 'background 0.2s',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 10px',
                            height: '28px',
                            width: '34px',
                            borderRadius: '6px'
                        }}
                        title={copied ? "Copied!" : "Copy Code"}
                    >
                        {copied ? (
                            // Checkmark icon when copied
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            // Copy icon
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="7" y="6" width="12" height="15" rx="3" ry="3" />
                                <path d="M4 14V7a4 4 0 0 1 4-4h7" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        );
    };


    // ----- Render helper: the main content area (code, testbench, or symbol), along with Top-Module interactive element -----
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
                                // Simple text matching parameter call
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
                                        e.currentTarget.style.background = theme === 'dark' ? '#1e293b' : '#e2e8f0';
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

    // ============================
    // Main render
    // ============================

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
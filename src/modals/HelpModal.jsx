import { useState } from 'react';
import {
    IconAlert,
    IconZap,
    IconCircleSlash,
    IconActivity,
    IconHelp,
    IconX,
} from '../styles';

// ---------- SVG Icons for tab buttons ----------
const IconKeyboard = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="6" y1="8" x2="6" y2="8.01" />
        <line x1="10" y1="8" x2="10" y2="8.01" />
        <line x1="14" y1="8" x2="14" y2="8.01" />
        <line x1="18" y1="8" x2="18" y2="8.01" />
        <line x1="8" y1="12" x2="8" y2="12.01" />
        <line x1="12" y1="12" x2="12" y2="12.01" />
        <line x1="16" y1="12" x2="16" y2="12.01" />
        <line x1="4" y1="16" x2="20" y2="16" />
    </svg>
);

const IconRules = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);

const IconFeatures = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const IconLightbulb = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21h6" />
        <path d="M12 17v4" />
        <path d="M12 3a7 7 0 0 0-4.95 11.95A7 7 0 0 0 9 17h6a7 7 0 0 0 1.95-2.05A7 7 0 0 0 12 3z" />
    </svg>
);

// -------------------------------------------------

const HelpModal = ({ showHelp, setShowHelp, theme, t, kbdStyle }) => {
    const [activeTab, setActiveTab] = useState('shortcuts');
    
    if (!showHelp) return null;
    
    const tabStyle = (tabId) => ({
        background: 'transparent',
        border: 'none',
        color: activeTab === tabId ? t.primary : t.textSecondary,
        cursor: 'pointer',
        padding: '6px 12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        transition: 'color 0.15s, border-bottom 0.15s',
        borderBottom: activeTab === tabId ? `2px solid ${t.primary}` : '2px solid transparent',
        borderRadius: 0,
        fontWeight: activeTab === tabId ? 600 : 400,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'shortcuts':
                return (
                    <div style={{ fontFamily: 'monospace' }}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 2fr',
                                gap: '20px',
                                fontSize: '18px',
                            }}
                        >
                            <kbd style={kbdStyle}>F</kbd> <span>Fit view to canvas completely</span>
                            <kbd style={kbdStyle}>Ctrl + F</kbd> <span>Focus Module Search bar</span>
                            <kbd style={kbdStyle}>H</kbd> <span>Open Hierarchy & Net Trace</span>
                            <kbd style={kbdStyle}>Esc</kbd> <span>Clear node/wire selection</span>
                            <kbd style={kbdStyle}>Space</kbd> <span>Center selected block</span>
                            <kbd style={kbdStyle}>Ctrl + A</kbd> <span>Select all modules & nets</span>
                            <kbd style={kbdStyle}>Del</kbd> <span>Delete selected item</span>
                            <kbd style={kbdStyle}>Ctrl + Z / Y</kbd> <span>Undo / Redo</span>
                            <kbd style={kbdStyle}>Ctrl + S</kbd> <span>Save the design</span>
                        </div>
                    </div>
                );

            case 'rules': // Merged DRC Warnings + Architectural Rules
                return (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            fontSize: '14px',
                            fontFamily: '"monospace", system-ui, sans-serif',
                            color: t.textSecondary,
                            lineHeight: '1.5',
                            padding: '4px',
                            overflowY: 'auto',
                            maxHeight: '100%'
                        }}
                    >
                        {/* ---------- WARNINGS SECTION ---------- */}
                        <div>
                            <h3
                                style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '16px',
                                    color: t.textHeading,
                                    fontFamily: '"Ubuntu Sans", system-ui, sans-serif',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase'
                                }}
                            >
                                DRC Status Flags & Indicators
                            </h3>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '18px 1fr',
                                    gap: '8px 10px',
                                    alignItems: 'start',
                                    fontFamily: '"monospace", system-ui, sans-serif',
                                    background: t.bgSecondary,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '14px'
                                }}
                            >
                                <div style={{ marginTop: '2px' }}><IconAlert color="#ef4444" size={13} /></div>
                                <span>
                                    <strong style={{ color: t.textHeading }}>Floating Input:</strong> Input pin is entirely unconnected, un-routed, and lacks a static tie-off state value.
                                </span>

                                <div style={{ marginTop: '2px' }}><IconCircleSlash color="#9ca3af" size={13} /></div>
                                <span>
                                    <strong style={{ color: t.textMuted }}>Unused Output:</strong> Output pin is not driving any internal vector nets and has not been promoted to the top-level interface.
                                </span>

                                <div style={{ marginTop: '2px' }}><IconZap color="#10b981" size={13} /></div>
                                <span>
                                    <strong style={{ color: t.textHeading }}>Multiple Drivers:</strong> <span style={{ color: '#10b981', fontWeight: 600 }}>[RESOLVED]</span> Contention is actively prevented by the canvas gate keeper. Multiple source wires cannot force an input pin connection.
                                </span>

                                <div style={{ marginTop: '2px' }}><IconActivity color="#f59e0b" size={13} /></div>
                                <span>
                                    <strong style={{ color: t.textHeading }}>Width Mismatch:</strong> Bus width conflict detected between source driver vector handles and target load vector configurations.
                                </span>
                            </div>
                        </div>

                        {/* ---------- RULES SECTION ---------- */}
                        <div>
                            <h3
                                style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '16px',
                                    color: t.textHeading,
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Architectural Schematic Rules
                            </h3>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}
                            >
                                {/* Rule 1 */}
                                <div
                                    style={{
                                        background: t.bgSecondary,
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        borderLeft: `3px solid ${t.primary || '#3b82f6'}`,
                                        border: `1px solid ${t.border}`,
                                        borderLeftWidth: '3px'
                                    }}
                                >
                                    <strong style={{ color: t.textHeading, display: 'block', marginBottom: '3px', fontWeight: 700 }}>
                                        1. Valid Interconnect Flow:
                                    </strong>
                                    Structural wiring vectors must strictly originate from an <strong style={{ color: t.textHeading }}>Output Port (Driver)</strong> and terminate at an <strong style={{ color: t.textHeading }}>Input Port (Load)</strong>. Bridging loads to loads or drivers to drivers directly on the grid is physically blocked.
                                </div>

                                {/* Rule 2 (NEWLY ADDED FEATURE SUB-SECTION) */}
                                <div
                                    style={{
                                        background: t.bgSecondary,
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        borderLeft: `3px solid #6366f1`,
                                        border: `1px solid ${t.border}`,
                                        borderLeftWidth: '3px'
                                    }}
                                >
                                    <strong style={{ color: t.textHeading, display: 'block', marginBottom: '3px', fontWeight: 700 }}>
                                        2. Deterministic Sink Topology (Max 1 Load Wire):
                                    </strong>
                                    To guarantee clean synthesis compilation passes, each input port channel accepts a maximum of one incoming driver wire. If multi-source bus steering is required, designers must pass inputs through an explicit structural <code style={{ fontFamily: 'monospace', color: '#6366f1' }}>Bundler</code> or multiplexer grid cell.
                                </div>

                                {/* Rule 3 */}
                                <div
                                    style={{
                                        background: t.bgSecondary,
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        borderLeft: `3px solid #f59e0b`,
                                        border: `1px solid ${t.border}`,
                                        borderLeftWidth: '3px'
                                    }}
                                >
                                    <strong style={{ color: t.textHeading, display: 'block', marginBottom: '3px', fontWeight: 700 }}>
                                        3. Mutual Exclusion (Boundary Promotion Sync):
                                    </strong>
                                    Only floating ports can hold top-level module promotions.
                                    <ul style={{ margin: '6px 0 0 14px', padding: 0, color: t.textSecondary, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <li>Routing a wire connection to an exposed top pin will <em style={{ color: t.textHeading }}>automatically demote</em> it back to an internal layout net structure.</li>
                                        <li>Actively wired pins will have their top-level interface promotion checkboxes locked in the properties sidebar menu.</li>
                                    </ul>
                                </div>

                                {/* Rule 4 */}
                                <div
                                    style={{
                                        background: t.bgSecondary,
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        borderLeft: `3px solid #10b981`,
                                        border: `1px solid ${t.border}`,
                                        borderLeftWidth: '3px'
                                    }}
                                >
                                    <strong style={{ color: t.textHeading, display: 'block', marginBottom: '3px', fontWeight: 700 }}>
                                        4. High-Impedance Fallbacks & Tie-offs:
                                    </strong>
                                    Undriven and unpromoted input pins generate a compilation warning flag and map out to a high-impedance tri-state vector (<code style={{ fontFamily: 'monospace', color: '#10b981' }}>'bz</code>) in the structural flat Verilog output file. Use the properties configuration window to map explicit static constant logic values (<code style={{ fontFamily: 'monospace' }}>1'b0</code>, <code style={{ fontFamily: 'monospace' }}>1'b1</code>).
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'features':
                return (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            fontSize: '18px',
                            color: t.textSecondary,
                            lineHeight: '1.6',
                            fontFamily: 'monospace',
                            padding: '4px',
                            fontWeight: 700,
                            overflowY: 'auto',
                            maxHeight: '100%',
                        }}
                    >
                        <div style={{ color: t.textHeading, fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>
                            Integrated Hardware Development Suite
                        </div>
                        <div style={{ color: t.textMuted, fontSize: '14px', marginTop: '-10px', marginBottom: '6px' }}>
                            A visual workbench bridging structural netlist generation with real‑time RTL verification.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Feature 1 */}
                            <div
                                style={{
                                    background: t.bgSecondary,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px',
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: t.textHeading, fontFamily: 'monospace' }}>
                                        1. Sink‑Driven Net Topology
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: '#10b981',
                                            background: theme === 'dark' ? '#052e1c' : '#d1fae5',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Deterministic
                                    </span>
                                </div>
                                <div style={{ fontSize: '15px', color: t.textSecondary }}>
                                    Enforces a strict <code style={{ color: '#6366f1', fontFamily: 'monospace' }}> Max 1 Connection </code> rule
                                    directly on target input pins to prevent dangerous hardware bus shorts. Automatically compiles clean,
                                    trace‑syncable 1‑to‑1 point‑to‑point structural Verilog.
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div
                                style={{
                                    background: t.bgSecondary,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px',
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: t.textHeading, fontFamily: 'monospace' }}>
                                        2. Code‑to‑Schematic Interactive Sync
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: '#3b82f6',
                                            background: theme === 'dark' ? '#0f172a' : '#dbeafe',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Cross‑Domain
                                    </span>
                                </div>
                                <div style={{ fontSize: '15px', color: t.textSecondary }}>
                                    Click directly on structural instantiations or declared <code style={{ color: '#6366f1', fontFamily: 'monospace' }}>wire w_</code> elements inside the generated RTL code window to instantly center, snap zoom, and flash highlight the corresponding hardware block or interconnect edge on the canvas.
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div
                                style={{
                                    background: t.bgSecondary,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px',
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: t.textHeading, fontFamily: 'monospace' }}>
                                        3. Top Module I/O Port Dashboard
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: '#f59e0b',
                                            background: theme === 'dark' ? '#1c1000' : '#fef3c7',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Live Summary
                                    </span>
                                </div>
                                <div style={{ fontSize: '15px', color: t.textSecondary }}>
                                    Aggregates and tracks all top‑level promoted pin interfaces dynamically. Includes implicit tracking for
                                    global infrastructure handles like system clocks (<code style={{ fontFamily: 'monospace' }}>clk</code>) and
                                    asynchronous resets (<code style={{ fontFamily: 'monospace' }}>rst_n</code>) inside a dedicated,
                                    filterable sidebar menu.
                                </div>
                            </div>

                            {/* Feature 4 */}
                            <div
                                style={{
                                    background: t.bgSecondary,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px',
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: t.textHeading, fontFamily: 'monospace' }}>
                                        4. Persistent Layout Session Engine
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: '#ec4899',
                                            background: theme === 'dark' ? '#2e121f' : '#fce7f3',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Stateful
                                    </span>
                                </div>
                                <div style={{ fontSize: '15px', color: t.textSecondary }}>
                                    Features compiler‑compliant local rehydration. Integrates an isolated frame‑pass architecture via browser
                                    storage hooks to guarantee layout configurations, custom logic codes, and port interfaces remain safe
                                    against sudden browser refreshes or accidental tab loss.
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: '6px',
                                padding: '8px 10px',
                                background: theme === 'dark' ? '#0b0f19' : '#eff6ff',
                                border: `1px solid ${theme === 'dark' ? '#1e3a8a' : '#bfdbfe'}`,
                                borderRadius: '6px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <span style={{ color: theme === 'dark' ? '#93c5fd' : '#1e40af' }}>
                                💡 Pro‑Tip: Press <kbd style={{ padding: '2px 4px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '3px', fontSize: '10px', fontWeight: 'bold' }}>H</kbd> to jump straight into active netlist layout tracing.
                            </span>
                        </div>
                    </div>
                );

            case 'tips':
                return (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            fontWeight: '500',
                            fontFamily: '"Ubuntu Sans", system-ui, sans-serif',
                            fontSize: '17px',
                            color: t.textSecondary,
                            lineHeight: '1.5',
                        }}
                    >
                        {/* Tip A */}
                        <div
                            style={{
                                background: t.bg,
                                padding: '10px 14px',
                                borderRadius: '6px',
                                border: `1px dashed ${t.borderStrong}`,
                            }}
                        >
                            <span
                                style={{
                                    color: t.primary,
                                    fontWeight: 700,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}
                            >
                                ⚘. Pattern A: Monitoring or Promoting an Internal Net
                            </span>
                            Since the engine strictly forbids promoting wired ports and enforces a single-wire rule per input target, you can tap into any internal signal pathway using a structural <strong>Buffer (`buff`)</strong> stage:
                            <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                                <li>Disconnect the wire driving your target load input handle.</li>
                                <li>
                                    Route that source driver net directly into the input (<code>a</code>) of a new <code>buff</code> block.
                                </li>
                                <li>
                                    Connect the buffer output (<code>y</code>) back to your original target load input.
                                </li>
                                <li>
                                    To split or monitor this net without breaking the single-wire restriction, pass the signal through a <strong>Splitter/Bundler</strong> structure to distribute legal parallel point-to-point branches.
                                </li>
                            </ol>
                        </div>

                        {/* Tip B */}
                        <div
                            style={{
                                background: t.bg,
                                padding: '10px 14px',
                                borderRadius: '6px',
                                border: `1px dashed ${t.borderStrong}`,
                            }}
                        >
                            <span
                                style={{
                                    color: '#10b981',
                                    fontWeight: 700,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}
                            >
                                ⚘. Pattern B: Isolating Synchronous Clock Domains
                            </span>
                            When designing complex sequential circuits, avoid manual network daisy‑chaining for your clock tracks. Use the <strong>Global Domain Auto‑Routing</strong> checkboxes in the layout properties sidebar panel to automatically hook standard ports named <code>clk</code> or <code>rst_n</code> directly to the system root boundary, keeping your schematic clear of cross‑canvas routing lines.
                        </div>

                        {/* Tip C */}
                        <div
                            style={{
                                background: t.bg,
                                padding: '10px 14px',
                                borderRadius: '6px',
                                border: `1px dashed ${t.borderStrong}`,
                            }}
                        >
                            <span
                                style={{
                                    color: '#f59e0b',
                                    fontWeight: 700,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}
                            >
                                ⚘. Pattern C: Resolving Bus Width Mismatches
                            </span>
                            If your canvas triggers a yellow <code>Width Mismatch</code> alert on an active net path, it means your source driver and target load vector arrays do not match in size. Use an explicit structural <strong>Splitter</strong> cell to break down wider buses into exact sub-vector slices, or a <strong>Bundler</strong> to combine narrower tracks before connecting them to the destination.
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.6)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(3px)',
            }}
        >
            <div
                style={{
                    border: "4px solid transparent",
                    borderRadius: "30px",
                    padding: "24px",
                    maxWidth: "1000px",
                    width: "90%",
                    height: "70%",
                    display: "flex",
                    flexDirection: "column",
                    color: t.textHeading,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",

                    // Gradient border fix
                    backgroundImage: `linear-gradient(${t.bgSecondary}, ${t.bgSecondary}), linear-gradient(90deg, #c1067d, #4800ff)`,
                    backgroundOrigin: "border-box",
                    backgroundClip: "padding-box, border-box",
                }}
            >

                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        flexShrink: 0,
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <IconHelp size={20} /> HELP
                    </h2>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: t.textSecondary,
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                        }}
                    >
                        <IconX size={20} />
                    </button>
                </div>

                {/* Tab bar – now only 4 tabs */}
                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        paddingBottom: '12px',
                        marginBottom: '16px',
                        borderBottom: `1px solid ${t.border}`,
                        flexShrink: 0,
                    }}
                >
                    <button
                        style={tabStyle('shortcuts')}
                        onClick={() => setActiveTab('shortcuts')}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'shortcuts') e.currentTarget.style.color = t.textHeading;
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'shortcuts') e.currentTarget.style.color = t.textSecondary;
                        }}
                    >
                        <IconKeyboard /> Shortcuts
                    </button>
                    <button
                        style={tabStyle('rules')}
                        onClick={() => setActiveTab('rules')}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'rules') e.currentTarget.style.color = t.textHeading;
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'rules') e.currentTarget.style.color = t.textSecondary;
                        }}
                    >
                        <IconRules /> Warnings & Rules
                    </button>
                    <button
                        style={tabStyle('features')}
                        onClick={() => setActiveTab('features')}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'features') e.currentTarget.style.color = t.textHeading;
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'features') e.currentTarget.style.color = t.textSecondary;
                        }}
                    >
                        <IconFeatures /> Features
                    </button>
                    <button
                        style={tabStyle('tips')}
                        onClick={() => setActiveTab('tips')}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'tips') e.currentTarget.style.color = t.textHeading;
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'tips') e.currentTarget.style.color = t.textSecondary;
                        }}
                    >
                        <IconLightbulb /> Pro Tips
                    </button>
                </div>

                {/* Content area */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '8px',
                        boxSizing: 'border-box',
                        scrollbarColor: theme === 'dark' ? '#555555 #111111' : '#bcbcbc #f1f5f9',
                        scrollbarWidth: 'thin',
                    }}
                >
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
import {
    IconAlert, IconZap, IconCircleSlash, IconActivity, IconHelp,
    IconX
} from '../styles';

const HelpModal = ({ showHelp, setShowHelp, theme, t, kbdStyle }) => {
    if (!showHelp) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
            <div style={{ background: t.bgSecondary, border: `2px solid ${theme === 'dark' ? '#09ff00' : '#ff0000'}`, borderRadius: '12px', padding: '24px', maxWidth: '1000px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', color: t.textHeading, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><IconHelp size={20} /> App Keyboard Shortcuts & Help</h2>
                    <button onClick={() => setShowHelp(false)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', padding: '4px', display: 'flex' }}><IconX size={20} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', boxSizing: 'border-box', scrollbarColor: theme === 'dark' ? '#555555 #111111' : '#bcbcbc #f1f5f9', scrollbarWidth: 'thin' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', fontSize: '13px', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '20px' }}>
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
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Port Status Warnings & Notifications</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '14px', alignItems: 'center', fontSize: '13px', color: t.textSecondary, borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '20px' }}>
                        <IconAlert color="#ef4444" size={16} /> <span><strong>Floating Input:</strong> Input is unconnected and un-tied.</span>
                        <IconCircleSlash color="#9ca3af" size={16} /> <span><strong>Unused Output:</strong> Output is not driving any internal net or exposed.</span>
                        <IconZap color="#ef4444" size={16} /> <span><strong>Multiple Drivers:</strong> Input is driven by more than 1 connected wire.</span>
                        <IconActivity color="#f59e0b" size={16} /> <span><strong>Width Mismatch:</strong> Bus width conflict between source/target routing.</span>
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Architectural Schematic Rules</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: t.textSecondary, lineHeight: '1.5', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '20px' }}>
                        <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', borderLeft: `3px solid ${t.primary}` }}>
                            <strong style={{ color: t.textHeading, display: 'block', marginBottom: '2px' }}>1. Valid Routing Connections:</strong> Standard structural wiring must strictly flow from an <strong>Output Port (Driver)</strong> to an <strong>Input Port (Load)</strong>. Point-to-point bridging between two input ports or two output ports is strictly blocked by the layout canvas engine.
                        </div>
                        <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', borderLeft: `3px solid #f59e0b` }}>
                            <strong style={{ color: t.textHeading, display: 'block', marginBottom: '2px' }}>2. Mutual Exclusion (Wiring vs. Promotion):</strong> To prevent hardware short-circuits and maintain stable boundary contracts, <strong>only floating ports</strong> can be promoted to the top-level module.
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                <li>Connecting a wire to a promoted floating port will <em>automatically demote</em> it back to an internal net.</li>
                                <li>Wired ports will have their top-level promotion checkboxes disabled in the properties sidebar panel.</li>
                            </ul>
                        </div>
                        <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', borderLeft: `3px solid #10b981` }}>
                            <strong style={{ color: t.textHeading, display: 'block', marginBottom: '2px' }}>3. Constant Tie-offs & Floating Inputs:</strong> Any input port left floating (unwired and unpromoted) will generate a synthesis warning flag (<code>Floating input</code>) and map to a high-impedance state (<code>'bz</code>) in the final flat structural Verilog output file. Use the properties panel to assign explicit static logic tie-offs (e.g., <code>1'b0</code>, <code>1'b1</code>).
                        </div>
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Smart Net Tracing</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: t.textSecondary, lineHeight: 1.5, paddingBottom: '4px' }}>
                        Click on any routing wire on the canvas. All wires connected to the same source output driver will <strong>glow</strong> automatically to easily trace multi-fanout data paths!
                    </p>
                    <h3 style={{ margin: '20px 0 12px 0', fontSize: '15px', borderTop: `1px solid ${t.border}`, paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconZap color="#f59e0b" size={16} /> Pro-Tips & Hardware Design Patterns
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: t.textSecondary, lineHeight: '1.5' }}>
                        <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', border: `1px dashed ${t.borderStrong}` }}>
                            <span style={{ color: t.primary, fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚘. Pattern A: Monitoring or Promoting an Internal Net</span>
                            Since the engine strictly forbids promoting an already wired port to prevent driver conflicts, you can easily tap into any internal connection using an inline **Buffer (`buff`)** stage:
                            <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                                <li>Disconnect the wire driving your target load input.</li>
                                <li>Route that driver net into the input (<code>a</code>) of a new <code>buff</code> block.</li>
                                <li>Connect the buffer output (<code>y</code>) back to your original target load input.</li>
                                <li>Because the buffer's output port is now driving a net, you can drop a second parallel branch from it, leave it floating, and safely **Promote** that floating branch to the top-level module as an external monitor pin!</li>
                            </ol>
                        </div>
                        <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', border: `1px dashed ${t.borderStrong}` }}>
                            <span style={{ color: '#10b981', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚘. Pattern B: Isolating Synchronous Clock Domains</span>
                            When designing complex sequential circuits, avoid manual network daisy-chaining for your clock tracks. Use the **Global Domain Auto-Routing** checkboxes in the layout properties sidebar panel to automatically hook standard ports named <code>clk</code> or <code>rst_n</code> directly to the system root boundary, keeping your schematic clear of cross-canvas routing lines.
                        </div>
                        <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', border: `1px dashed ${t.borderStrong}` }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚘. Pattern C: Resolving Bus Width Mismatches</span>
                            If your canvas triggers a yellow <code>Width Mismatch</code> alert on an active net path, it means your source and target vector arrays don't match in size. Select the mismatched edge wire directly on the canvas to open its properties, where you can manually force an explicit override bit-width constraint (up to 128 bits) to resolve compile-time array truncation.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
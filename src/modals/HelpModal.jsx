import { useState } from 'react';
import {
    IconActivity,
    IconAlert,
    IconCircleSlash,
    IconHelp,
    IconX,
    IconZap,
} from '../styles';

const IconKeyboard = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M7 12h.01M11 12h.01M15 12h.01M4 16h16" />
    </svg>
);

const IconRules = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </svg>
);

const IconFeatures = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.1 6.3L22 9.3l-5 4.8 1.2 6.9L12 17.8 5.8 21 7 14.1 2 9.3l6.9-1z" />
    </svg>
);

const IconLightbulb = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21h6M12 17v4" />
        <path d="M12 3a7 7 0 0 0-4 12c.7.7 1 1.2 1 2h6c0-.8.3-1.3 1-2a7 7 0 0 0-4-12z" />
    </svg>
);

const Section = ({ title, children, t }) => (
    <section
        style={{
            background: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: '10px',
            padding: '13px 14px',
        }}
    >
        <h3
            style={{
                margin: '0 0 9px',
                color: t.textHeading,
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.45px',
                textTransform: 'uppercase',
            }}
        >
            {title}
        </h3>
        {children}
    </section>
);

const InfoCard = ({ title, children, accent = '#3b82f6', badge, t }) => (
    <div
        style={{
            border: `1px solid ${t.border}`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: '8px',
            padding: '10px 12px',
            background: t.bgSecondary,
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '5px' }}>
            <strong style={{ color: t.textHeading, fontSize: '13px' }}>{title}</strong>
            {badge && (
                <span
                    style={{
                        color: accent,
                        border: `1px solid ${accent}55`,
                        borderRadius: '999px',
                        padding: '1px 7px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {badge}
                </span>
            )}
        </div>
        <div style={{ color: t.textSecondary, fontSize: '13px', lineHeight: 1.55 }}>
            {children}
        </div>
    </div>
);

const KbdRow = ({ combo, children, kbdStyle }) => (
    <>
        <kbd style={kbdStyle}>{combo}</kbd>
        <span>{children}</span>
    </>
);

const Code = ({ children }) => (
    <code
        style={{
            fontFamily: 'Consolas, Menlo, monospace',
            fontSize: '0.94em',
            padding: '1px 4px',
            borderRadius: '4px',
            background: 'rgba(125,125,125,0.14)',
        }}
    >
        {children}
    </code>
);

const HelpModal = ({ showHelp, setShowHelp, theme, t, kbdStyle }) => {
    const [activeTab, setActiveTab] = useState('workflow');

    if (!showHelp) return null;

    const tabStyle = (tabId) => ({
        background: activeTab === tabId ? (theme === 'dark' ? 'rgba(59,130,246,0.14)' : 'rgba(37,99,235,0.09)') : 'transparent',
        border: `1px solid ${activeTab === tabId ? (theme === 'dark' ? 'rgba(96,165,250,0.45)' : 'rgba(37,99,235,0.28)') : 'transparent'}`,
        color: activeTab === tabId ? t.primary : t.textSecondary,
        cursor: 'pointer',
        padding: '7px 10px',
        fontSize: '12px',
        transition: 'color 0.15s, background 0.15s, border-color 0.15s',
        borderRadius: '8px',
        fontWeight: activeTab === tabId ? 800 : 650,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    });

    const renderWorkflow = () => (
        <div style={{ display: 'grid', gap: '12px' }}>
            <Section title="Recommended RTL workflow" t={t}>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <InfoCard title="1. Import leaf RTL modules" badge="Project" t={t}>
                        Use the Project tab folder icon to upload one or more <Code>.v</Code>/<Code>.sv</Code> files. The engine parses module declarations, creates blocks, stores RTL files under the active canvas, and preserves editable source code.
                    </InfoCard>
                    <InfoCard title="2. Import the top module" badge="Auto-wire" accent="#10b981" t={t}>
                        Upload the top module in the same batch or later. If uploaded later, the engine now reuses the already-loaded module RTL and maps the top-module instance connections onto the existing blocks.
                    </InfoCard>
                    <InfoCard title="3. Edit RTL from the Project explorer" badge="RTL editor" accent="#8b5cf6" t={t}>
                        Expand a canvas, click a Verilog filename, and edit it in the VS Code-style RTL editor. The node configuration window is for block properties and ports; RTL editing lives in the Project panel.
                    </InfoCard>
                    <InfoCard title="4. Generate top/testbench from the right panel" badge="Output" accent="#f59e0b" t={t}>
                        The right panel shows generated structural top-module code and generated testbench code. Manual canvas wiring updates the generated top module automatically.
                    </InfoCard>
                </div>
            </Section>

            <Section title="Project explorer behavior" t={t}>
                <ul style={{ margin: 0, paddingLeft: '18px', color: t.textSecondary, fontSize: '13px', lineHeight: 1.65 }}>
                    <li>Each canvas represents a top-level/hierarchical module.</li>
                    <li>Click a canvas row to expand or collapse its contained module files.</li>
                    <li><Code>OPEN</Code> opens an inactive canvas; the active canvas shows <Code>ACTIVE</Code>.</li>
                    <li><Code>+ Inst</Code> instantiates an inactive canvas as a reusable sub-top module in the current canvas.</li>
                    <li>Deleting a canvas removes its module and removes instances of that canvas from other canvases.</li>
                    <li>Deleted canvas names are reusable; recreating <Code>gpu_dmem_top</Code> should not force <Code>gpu_dmem_top_1</Code>.</li>
                </ul>
            </Section>

            <Section title="Hierarchical design" t={t}>
                <div style={{ color: t.textSecondary, fontSize: '13px', lineHeight: 1.65 }}>
                    You can build several sub-top canvases, for example <Code>uart_top</Code>, <Code>gpu_dmem_top</Code>, or <Code>gpu_cmp_unit_top</Code>, then instantiate them into a parent <Code>top_module</Code>. Shared top inputs such as <Code>clk</Code>, <Code>is_load</Code>, or <Code>is_store</Code> are deduplicated when a sub-top block is instantiated.
                </div>
            </Section>
        </div>
    );

    const renderFeatures = () => (
        <div style={{ display: 'grid', gap: '12px' }}>
            <InfoCard title="RTL-to-canvas import" badge="Parser" t={t}>
                Parses ANSI and non-ANSI module ports, parameterized modules, nested parameter expressions, named instance connections, and incremental top-module uploads. Ordered port connections are detected but not fully converted to canvas edges.
            </InfoCard>
            <InfoCard title="Canvas-to-RTL generation" badge="Netlist" accent="#10b981" t={t}>
                Generates structural Verilog from nodes, edges, exposed ports, tie-offs, auto-routed clock/reset ports, splitter/bundler routing, and hierarchical canvas instances.
            </InfoCard>
            <InfoCard title="VS Code-style RTL editor" badge="Editor" accent="#8b5cf6" t={t}>
                Provides syntax highlighting, minimap, command palette, find/replace, go-to-line, formatting, line operations, autocomplete/snippets, status bar, and disabled font ligatures so operators like <Code>&lt;=</Code> and <Code>&gt;=</Code> render literally.
            </InfoCard>
            <InfoCard title="Auto layout" badge="Canvas" accent="#f59e0b" t={t}>
                The layout engine spaces imported blocks to reduce overlap. Use fit view after import if blocks are outside the current viewport.
            </InfoCard>
            <InfoCard title="Trace and search" badge="Debug" accent="#06b6d4" t={t}>
                Search finds blocks by name. Trace helps inspect fan-in/fan-out, floating inputs, unused outputs, and width mismatches.
            </InfoCard>
        </div>
    );

    const renderRules = () => (
        <div style={{ display: 'grid', gap: '12px' }}>
            <Section title="Warnings and indicators" t={t}>
                <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '9px 10px', color: t.textSecondary, fontSize: '13px', lineHeight: 1.55 }}>
                    <IconAlert color="#ef4444" size={14} />
                    <span><strong style={{ color: t.textHeading }}>Floating input:</strong> input is not connected, exposed, auto-routed, or tied off.</span>
                    <IconCircleSlash color="#9ca3af" size={14} />
                    <span><strong style={{ color: t.textHeading }}>Unused output:</strong> output does not drive an edge and is not exposed as a top output.</span>
                    <IconActivity color="#f59e0b" size={14} />
                    <span><strong style={{ color: t.textHeading }}>Width mismatch:</strong> connected source and target port widths differ.</span>
                    <IconZap color="#10b981" size={14} />
                    <span><strong style={{ color: t.textHeading }}>Single input driver:</strong> each input handle accepts only one incoming wire.</span>
                </div>
            </Section>

            <Section title="Connection rules" t={t}>
                <ul style={{ margin: 0, paddingLeft: '18px', color: t.textSecondary, fontSize: '13px', lineHeight: 1.65 }}>
                    <li>Canvas wires must go from output ports to input ports.</li>
                    <li>One input port can have only one driver.</li>
                    <li>Use a Splitter to break a wide bus into slices.</li>
                    <li>Use a Bundler to combine narrower signals into a wider bus.</li>
                    <li>Expose floating inputs/outputs to make them top-level module ports.</li>
                    <li>Ports named <Code>clk</Code> and <Code>rst_n</Code> may be auto-routed to the generated top-level clock/reset.</li>
                </ul>
            </Section>

            <Section title="Import limitations" t={t}>
                <ul style={{ margin: 0, paddingLeft: '18px', color: t.textSecondary, fontSize: '13px', lineHeight: 1.65 }}>
                    <li>Named instance mappings like <Code>.addr_bus(addr_bus)</Code> import best.</li>
                    <li>Expressions and constants such as <Code>{`{27'b0, rs1}`}</Code> are preserved in RTL but are not converted into canvas edges.</li>
                    <li>Parameterized port ranges may import as 1-bit if the width cannot be resolved numerically.</li>
                    <li><Code>signed</Code> is preserved in stored RTL code, but canvas port metadata currently tracks width and direction, not signedness.</li>
                    <li>External files referenced by <Code>$readmemh</Code> are not loaded or validated by the canvas.</li>
                </ul>
            </Section>
        </div>
    );

    const renderShortcuts = () => (
        <div style={{ display: 'grid', gap: '14px' }}>
            <Section title="Canvas shortcuts" t={t}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '9px 14px', color: t.textSecondary, fontSize: '13px', alignItems: 'center' }}>
                    <KbdRow combo="F" kbdStyle={kbdStyle}>Fit view to the canvas.</KbdRow>
                    <KbdRow combo="Ctrl + F" kbdStyle={kbdStyle}>Open/focus the Search tab.</KbdRow>
                    <KbdRow combo="H" kbdStyle={kbdStyle}>Open the Trace tab.</KbdRow>
                    <KbdRow combo="Space" kbdStyle={kbdStyle}>Center the selected block.</KbdRow>
                    <KbdRow combo="Ctrl + A" kbdStyle={kbdStyle}>Select all nodes and edges.</KbdRow>
                    <KbdRow combo="Del" kbdStyle={kbdStyle}>Delete selected node or edge.</KbdRow>
                    <KbdRow combo="Esc" kbdStyle={kbdStyle}>Clear selection and close transient UI.</KbdRow>
                    <KbdRow combo="Ctrl + Z/Y" kbdStyle={kbdStyle}>Undo / redo.</KbdRow>
                    <KbdRow combo="Ctrl + S" kbdStyle={kbdStyle}>Save/download the workspace.</KbdRow>
                </div>
            </Section>

            <Section title="RTL editor shortcuts" t={t}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '9px 14px', color: t.textSecondary, fontSize: '13px', alignItems: 'center' }}>
                    <KbdRow combo="Ctrl + S" kbdStyle={kbdStyle}>Save the active RTL file.</KbdRow>
                    <KbdRow combo="Ctrl + F" kbdStyle={kbdStyle}>Find text.</KbdRow>
                    <KbdRow combo="Ctrl + H" kbdStyle={kbdStyle}>Find and replace.</KbdRow>
                    <KbdRow combo="Ctrl + G" kbdStyle={kbdStyle}>Go to line.</KbdRow>
                    <KbdRow combo="Ctrl + Shift + P" kbdStyle={kbdStyle}>Open command palette.</KbdRow>
                    <KbdRow combo="F1" kbdStyle={kbdStyle}>Open command palette.</KbdRow>
                    <KbdRow combo="Alt + Shift + F" kbdStyle={kbdStyle}>Format Verilog.</KbdRow>
                    <KbdRow combo="Alt + Z" kbdStyle={kbdStyle}>Toggle word wrap.</KbdRow>
                    <KbdRow combo="Ctrl + /" kbdStyle={kbdStyle}>Toggle line comment.</KbdRow>
                    <KbdRow combo="Alt + Up/Down" kbdStyle={kbdStyle}>Move current line.</KbdRow>
                    <KbdRow combo="Shift + Alt + Down" kbdStyle={kbdStyle}>Duplicate current line.</KbdRow>
                    <KbdRow combo="Ctrl + Shift + K" kbdStyle={kbdStyle}>Delete current line.</KbdRow>
                    <KbdRow combo="Ctrl + L" kbdStyle={kbdStyle}>Select current line.</KbdRow>
                </div>
            </Section>
        </div>
    );

    const renderTips = () => (
        <div style={{ display: 'grid', gap: '12px' }}>
            <InfoCard title="Best import order" accent="#10b981" t={t}>
                You can import everything in one batch, or import leaf modules first and the top module later. If you upload the top later, keep the previously imported leaf RTL files in the project so the engine can use their real port directions.
            </InfoCard>
            <InfoCard title="Shared top inputs" accent="#8b5cf6" t={t}>
                If two child modules both connect to the same top-level signal, expose both using the same external name. The generated top module and hierarchical block will show one deduplicated top port.
            </InfoCard>
            <InfoCard title="Expressions need explicit blocks" accent="#f59e0b" t={t}>
                The importer does not convert complex expressions into canvas logic. For visual wiring, model expressions using explicit modules, splitters, bundlers, muxes, or tie-offs.
            </InfoCard>
            <InfoCard title="Use canvases as sub-top modules" accent="#06b6d4" t={t}>
                Build one canvas per subsystem, save/promote it as a module, then instantiate it into a parent canvas. This keeps large designs easier to inspect and reuse.
            </InfoCard>
        </div>
    );

    const renderContent = () => {
        if (activeTab === 'workflow') return renderWorkflow();
        if (activeTab === 'features') return renderFeatures();
        if (activeTab === 'rules') return renderRules();
        if (activeTab === 'shortcuts') return renderShortcuts();
        return renderTips();
    };

    const tabs = [
        ['workflow', IconHelp, 'Workflow'],
        ['features', IconFeatures, 'Features'],
        ['rules', IconRules, 'Rules'],
        ['shortcuts', IconKeyboard, 'Shortcuts'],
        ['tips', IconLightbulb, 'Tips'],
    ];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
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
                    borderRadius: '18px',
                    padding: '20px',
                    maxWidth: '1040px',
                    width: '90%',
                    height: '76%',
                    display: 'flex',
                    flexDirection: 'column',
                    color: t.textHeading,
                    boxShadow: '0 16px 42px rgba(0,0,0,0.52)',
                    border: `1px solid ${t.borderStrong || t.border}`,
                    background: t.bgSecondary,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                        flexShrink: 0,
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconHelp size={20} /> Axon Interlink Help
                    </h2>
                    <button
                        type="button"
                        onClick={() => setShowHelp(false)}
                        style={{
                            background: 'transparent',
                            border: `1px solid ${t.border}`,
                            borderRadius: '8px',
                            color: t.textSecondary,
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                        }}
                    >
                        <IconX size={20} />
                    </button>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        paddingBottom: '12px',
                        marginBottom: '14px',
                        borderBottom: `1px solid ${t.border}`,
                        flexShrink: 0,
                    }}
                >
                    {tabs.map(([id, Icon, label]) => (
                        <button
                            key={id}
                            type="button"
                            style={tabStyle(id)}
                            onClick={() => setActiveTab(id)}
                        >
                            <Icon /> {label}
                        </button>
                    ))}
                </div>

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

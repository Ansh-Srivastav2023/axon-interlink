import ExposureChecklist from './ExposureChecklist';

const PropertiesPanel = ({
    node,
    t,
    s,
    updateSelectedNode,
    instantiationQuantity,
    setInstantiationQuantity,
    getPortLabel,
    togglePortSwap,
    edges,
    exposedPorts,
    toggleExposePort
}) => {
    const hoverEnter = (e) => {
        e.currentTarget.style.background = t.bgTertiary;
        e.currentTarget.style.borderColor = t.borderStrong || t.border;
        e.currentTarget.style.transform = "translateY(-1px)";
    };

    const hoverLeave = (e) => {
        e.currentTarget.style.background = s.smallBtn.background;
        e.currentTarget.style.color = t.textHeading;
        e.currentTarget.style.borderColor = t.border;
        e.currentTarget.style.transform = "translateY(0)";
    };

    const actionBtnStyle = {
        ...s.smallBtn,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "8px 12px",
        color: t.textHeading,
    };

    const sectionStyle = {
        border: `1px solid ${t.border}`,
        borderRadius: '12px',
        background: t.bg,
        padding: '13px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    };

    const sectionTitleStyle = {
        margin: 0,
        color: t.textHeading,
        fontSize: '12px',
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
    };

    const helperStyle = {
        marginTop: '-6px',
        color: t.textMuted,
        fontSize: '11px',
        lineHeight: 1.45,
    };

    const inputStyle = {
        ...s.input,
        borderRadius: '9px',
        minHeight: '36px',
        fontFamily: '"SF Mono", Consolas, Menlo, monospace',
    };

    return (
        <>
            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Identity</h4>
                <div style={s.formGroup}>
                    <label style={s.label}>Module type name</label>
                    <input
                        style={inputStyle}
                        value={node.data.moduleName}
                        onChange={(e) => updateSelectedNode('moduleName', e.target.value)}
                    />
                </div>
            </div>

            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Instantiation</h4>
                <div style={s.formGroup}>
                    <label style={s.label}>Batch quantity</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="number"
                            min="1"
                            max="32"
                            value={instantiationQuantity}
                            onChange={(e) => setInstantiationQuantity(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                            style={{ ...inputStyle, width: '86px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '12px', color: t.textSecondary }}>
                            {instantiationQuantity > 1
                                ? `Creates ${node.data.moduleName}_0 through ${node.data.moduleName}_${instantiationQuantity - 1}`
                                : 'Single block instance'}
                        </span>
                    </div>
                </div>
            </div>

            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Port definition</h4>
                <div style={helperStyle}>Use comma-separated ports, for example: <code>data[31:0], valid, ready</code>.</div>
                <div style={s.formGroup}>
                    <label style={s.label}>Inputs</label>
                    <input
                        style={inputStyle}
                        defaultValue={(node.data.inputs || []).map(p => getPortLabel(p)).join(', ')}
                        onBlur={(e) => updateSelectedNode('inputs', e.target.value)}
                    />
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Outputs</label>
                    <input
                        style={inputStyle}
                        defaultValue={(node.data.outputs || []).map(p => getPortLabel(p)).join(', ')}
                        onBlur={(e) => updateSelectedNode('outputs', e.target.value)}
                    />
                </div>
            </div>

            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Canvas layout</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            togglePortSwap();
                            e.currentTarget.style.transform = "scale(0.95)";
                            setTimeout(() => { e.currentTarget.style.transform = "scale(1)"; }, 90);
                        }}
                        onMouseEnter={hoverEnter}
                        onMouseLeave={hoverLeave}
                        style={actionBtnStyle}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3l4 4-4 4" />
                            <path d="M3 7h18" />
                            <path d="M7 21l-4-4 4-4" />
                            <path d="M21 17H3" />
                        </svg>
                        Flip Ports
                    </button>
                </div>
            </div>

            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Top-level I/O exposure</h4>
                <div style={helperStyle}>Only unconnected, non-auto-routed ports can be promoted to the active top module.</div>
                <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inputs</div>
                <ExposureChecklist
                    ports={node.data.inputs || []}
                    isInput={true}
                    nodeId={node.id}
                    disabledCheck={(p) => node.data.autoRoute?.[p.name] || false}
                    edges={edges}
                    exposedPorts={exposedPorts}
                    toggleExposePort={toggleExposePort}
                    t={t}
                />
                <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outputs</div>
                <ExposureChecklist
                    ports={node.data.outputs || []}
                    isInput={false}
                    nodeId={node.id}
                    disabledCheck={() => false}
                    edges={edges}
                    exposedPorts={exposedPorts}
                    toggleExposePort={toggleExposePort}
                    t={t}
                />
            </div>
        </>
    );
};

export default PropertiesPanel;

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
    setFullCodeModalOpen,
    edges,
    exposedPorts,
    toggleExposePort
}) => {
    const hoverEnter = (e) => {
        e.currentTarget.style.background = t.primary;
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,.25)";
        e.currentTarget.style.transform = "translateY(-1px)";
    };

    const hoverLeave = (e) => {
        e.currentTarget.style.background = t.bgTertiary;
        e.currentTarget.style.color = t.textHeading;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
    };

    const actionBtnStyle = {
        ...s.smallBtn,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "8px 12px",
        borderRadius: "8px",
        border: `1px solid ${t.border}`,
        background: t.bgTertiary,
        color: t.textHeading,
        fontWeight: 600,
        transition: "all .18s ease",
        cursor: "pointer",
    };

    return (
        <>
            <div style={s.formGroup}>
                <label style={s.label}>Module Type Name</label>
                <input
                    style={s.input}
                    value={node.data.moduleName}
                    onChange={(e) => updateSelectedNode('moduleName', e.target.value)}
                />
            </div>

            <div style={s.formGroup}>
                <label style={s.label}>Batch Instantiation Factor (Quantity)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="number"
                        min="1"
                        max="32"
                        value={instantiationQuantity}
                        onChange={(e) => setInstantiationQuantity(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                        style={{ ...s.input, width: '80px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '12px', color: t.textSecondary }}>
                        {instantiationQuantity > 1
                            ? `Generates ${node.data.moduleName}_0 through ${node.data.moduleName}_${instantiationQuantity - 1}`
                            : 'Single instance compilation footprint'}
                    </span>
                </div>
            </div>

            <div style={s.formGroup}>
                <label style={s.label}>Ports Input Vector String</label>
                <input
                    style={s.input}
                    defaultValue={(node.data.inputs || []).map(p => getPortLabel(p)).join(', ')}
                    onBlur={(e) => updateSelectedNode('inputs', e.target.value)}
                />
            </div>
            <div style={s.formGroup}>
                <label style={s.label}>Ports Output Vector String</label>
                <input
                    style={s.input}
                    defaultValue={(node.data.outputs || []).map(p => getPortLabel(p)).join(', ')}
                    onBlur={(e) => updateSelectedNode('outputs', e.target.value)}
                />
            </div>
            <div style={s.formGroup}>
                <label style={s.label}>Layout Symmetry Placement</label>
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

                    <button
                        type="button"
                        onClick={() => setFullCodeModalOpen(true)}
                        onMouseEnter={hoverEnter}
                        onMouseLeave={hoverLeave}
                        style={actionBtnStyle}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16" />
                            <path d="M4 12h12" />
                            <path d="M4 17h8" />
                        </svg>
                        Full Editor
                    </button>
                </div>
            </div>
            <div style={s.formGroup}>
                <label style={s.label}>Top-Level I/O Exposure</label>
                <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600 }}>Inputs</div>
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
                <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600, marginTop: '4px' }}>Outputs</div>
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
import { IconBox, IconX, IconTrace } from '../styles/icons'; // adjust paths

// ============================
// Constants
// ============================
const EDGE_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'];

// ============================
// Sub‑components (defined inside ContextualModal to access props/state)
// ============================
const ContextualModal = ({
    activeModal,
    modalPos,
    nodes,
    edges,
    theme,
    t,
    s,
    modalTab,
    setModalTab,
    exposedPorts,
    currentModuleCode,
    handleModalDragStart,
    setActiveModal,
    updateSelectedNode,
    togglePortSwap,
    toggleExposePort,
    handleCodeChange,
    getPortLabel,
    parsePorts,
    recordHistory,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setGlowingNet,
    highlightVerilogCode
}) => {
    if (!activeModal.type) return null;

    const isNode = activeModal.type === 'node';
    const targetId = activeModal.id;

    // ---------- Helpers ----------
    const closeModal = () => setActiveModal({ type: null, id: null });

    // ---------- Sub‑components ----------
    // This is both for Wire(edge) and Module Configure Window...
    const ModalHeader = ({ title, icon, onClose }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            userSelect: 'none'
        }}>
            <h3 style={{
                margin: 0,
                fontSize: '17px',
                fontFamily: 'monospace',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme === 'dark' ? '#fff' : '#4400ff'
            }}>
                {icon} {title}
            </h3>
            <button onClick={onClose} style={{
                background: 'transparent',
                border: 'none',
                color: t.textSecondary,
                cursor: 'pointer'
            }}>
                <IconX size={16} />
            </button>
        </div>
    );

    // To switch between Properties and RTL Code Editor
    const Tabs = () => (
        <div style={{
            display: 'flex',
            gap: '4px',
            background: t.bgTertiary,
            padding: '4px',
            borderRadius: '8px',
            marginBottom: '14px',
            userSelect: 'none'
        }}>
            {['properties', 'code'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    style={{
                        flex: 1,
                        padding: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: modalTab === tab ? t.bgSecondary : 'transparent',
                        color: modalTab === tab ? t.textHeading : t.textSecondary,
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    {tab === 'properties' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                            <circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="20" cy="14" r="2" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
                        </svg>
                    )}
                    {tab === 'properties' ? 'Properties' : 'RTL Code Editor'}
                </button>
            ))}
        </div>
    );

    // Promote To Top
    const ExposureChecklist = ({ ports, isInput, nodeId, disabledCheck }) => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: t.bg,
            padding: '8px',
            borderRadius: '6px',
            border: `1px solid ${t.borderStrong}`
        }}>
            {ports.map(p => {
                const key = `${nodeId}__${p.name}`;
                const isWired = isInput
                    ? edges.some(e => e.target === nodeId && e.targetHandle === p.name)
                    : edges.some(e => e.source === nodeId && e.sourceHandle === p.name);
                const isAutoRouted = disabledCheck?.(p) || false;
                const disabled = isWired || isAutoRouted;
                return (
                    <label key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1
                    }}>
                        <input
                            type="checkbox"
                            checked={!!exposedPorts[key]}
                            onChange={() => toggleExposePort(nodeId, p.name, p, isInput)}
                            disabled={disabled}
                        />
                        Promote <code>{p.name}</code> to top {isWired && '(Wired)'}
                    </label>
                );
            })}
        </div>
    );

    // ---- Node content ----
    const renderNodeContent = () => {
        const node = nodes.find(n => n.id === targetId);
        if (!node) return null;
        const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);
        const currentPorts = node.data.isSplitter ? (node.data.outputs || []) : (node.data.inputs || []);

        // Splitter / Bundler panel
        const renderSplitterPanel = () => (
            <>
                <div style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: t.primary,
                    fontFamily: 'monospace',
                    background: t.bg,
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${t.border}`,
                    alignSelf: 'flex-start'
                }}>
                    Type: {node.data.isSplitter ? 'Bus Fracture Splitter' : 'Vector Merger Bundler'}
                </div>

                <div style={s.formGroup}>
                    <label style={s.label}>Number of Bit Slices (N)</label>
                    <input
                        type="number"
                        min="1"
                        max="16"
                        value={currentPorts.length}
                        style={{ ...s.input, width: '70px' }}
                        onChange={(e) => {
                            const count = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                            recordHistory();
                            const newPorts = Array.from({ length: count }, (_, i) => ({
                                name: node.data.isSplitter ? `out${i}` : `in${i}`,
                                width: 2,
                                msb: 1,
                                lsb: 0
                            }));
                            setNodes(nds => nds.map(n => n.id === targetId ? {
                                ...n,
                                data: {
                                    ...n.data,
                                    inputs: node.data.isSplitter ? [{ name: 'in', width: 8, msb: 7, lsb: 0 }] : newPorts,
                                    outputs: node.data.isSplitter ? newPorts : [{ name: 'out', width: 8, msb: 7, lsb: 0 }]
                                }
                            } : n));
                        }}
                    />
                </div>

                <div style={s.formGroup}>
                    <div style={{ fontSize: '15px', color: '#ffffff', marginBottom: '6px', fontFamily: 'monospace' }}>
                        {node.data.isSplitter ? 'Atmost 16 Outputs...' : 'Atmost 16 Inputs...'}
                    </div>
                    <div style={{ fontSize: '15px', color: '#06ffb4', marginBottom: '6px', fontFamily: 'monospace' }}>
                        {node.data.isSplitter ? 'Note:- outN...out0 -> [MSB...LSB]' : 'Note:- inN...in0 -> [MSB...LSB]'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {currentPorts.map((port, idx) => {
                            const portLabel = getPortLabel(port);
                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        color: t.textSecondary,
                                        minWidth: '70px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {node.data.isSplitter ? `out${idx}` : `in${idx}`} {portLabel}
                                    </span>
                                    <input
                                        style={{ ...s.input, flex: 1, padding: '4px 8px', fontSize: '12px' }}
                                        defaultValue={portLabel}
                                        placeholder="e.g. in[3:0]"
                                        onBlur={(e) => {
                                            const parsed = parsePorts(e.target.value);
                                            if (parsed && parsed.length > 0) {
                                                recordHistory();
                                                setNodes(nds => nds.map(n => {
                                                    if (n.id !== targetId) return n;
                                                    const updated = [...currentPorts];
                                                    updated[idx] = {
                                                        name: parsed[0].name,
                                                        width: parsed[0].width,
                                                        msb: parsed[0].msb,
                                                        lsb: parsed[0].lsb
                                                    };
                                                    return {
                                                        ...n,
                                                        data: {
                                                            ...n.data,
                                                            inputs: n.data.isSplitter ? n.data.inputs : updated,
                                                            outputs: n.data.isSplitter ? updated : n.data.outputs
                                                        }
                                                    };
                                                }));
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ ...s.formGroup, marginTop: '4px' }}>
                    <label style={s.label}>Top-Level I/O Exposure</label>
                    <ExposureChecklist
                        ports={currentPorts}
                        isInput={!node.data.isSplitter}
                        nodeId={node.id}
                        disabledCheck={() => false}
                    />
                </div>
            </>
        );

        // Properties panel in Module Configuration
        const renderPropertiesPanel = () => (
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
                    <button
                        type="button"
                        onClick={(e) => {
                            togglePortSwap();

                            e.currentTarget.style.transform = "scale(0.95)";

                            setTimeout(() => {
                                e.currentTarget.style.transform = "scale(1)";
                            }, 90);
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = t.primary;
                            e.currentTarget.style.color = "#fff";
                            e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,.25)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = t.bgTertiary;
                            e.currentTarget.style.color = t.textHeading;
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                        style={{
                            ...s.smallBtn,
                            width: "115px",
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
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M17 3l4 4-4 4" />
                            <path d="M3 7h18" />
                            <path d="M7 21l-4-4 4-4" />
                            <path d="M21 17H3" />
                        </svg>

                        Flip Ports
                    </button>
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Top-Level I/O Exposure</label>
                    <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600 }}>Inputs</div>
                    <ExposureChecklist
                        ports={node.data.inputs || []}
                        isInput={true}
                        nodeId={node.id}
                        disabledCheck={(p) => node.data.autoRoute?.[p.name] || false}
                    />
                    <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600, marginTop: '4px' }}>Outputs</div>
                    <ExposureChecklist
                        ports={node.data.outputs || []}
                        isInput={false}
                        nodeId={node.id}
                        disabledCheck={() => false}
                    />
                </div>
            </>
        );

        // Code editor panel in Module Configuration
        const renderCodePanel = () => (
            <div style={{ ...s.formGroup, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                <label style={s.label}>Behavioral RTL Code Implementation</label>
                <div style={{
                    flex: 1,
                    marginTop: '4px',
                    minHeight: '220px',
                    borderRadius: '6px',
                    overflow: 'auto',
                    background: t.codeBg,
                    border: `1px solid ${t.borderStrong}`
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gridTemplateRows: 'auto'
                    }}>
                        <pre
                            style={{
                                gridArea: '1/1',
                                margin: 0,
                                padding: '12px',
                                fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                fontSize: '12px',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                background: 'transparent',
                                color: 'inherit',
                                pointerEvents: 'none',
                                overflow: 'visible'
                            }}
                            dangerouslySetInnerHTML={{ __html: highlightVerilogCode(currentModuleCode + '\n', theme) }}
                        />
                        <textarea
                            value={currentModuleCode}
                            onChange={handleCodeChange}
                            spellCheck="false"
                            style={{
                                gridArea: '1/1',
                                margin: 0,
                                padding: '12px',
                                fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                fontSize: '12px',
                                lineHeight: '1.5',
                                background: 'transparent',
                                color: 'transparent',
                                caretColor: theme === 'dark' ? '#ffffff' : '#111827',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                resize: 'none',
                                border: 'none',
                                outline: 'none',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                width: '100%',
                                height: 'auto'
                            }}
                        />
                    </div>
                </div>
            </div>
        );

        const renderFooter = () => (
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: `1px solid ${t.border}`,
                userSelect: 'none'
            }}>
                <button
                    onClick={(e) => {
                        e.currentTarget.style.transform = 'scale(0.94)';
                        setTimeout(() => {
                            recordHistory();
                            setNodes(n => n.filter(x => x.id !== targetId));
                            closeModal();
                            setSelectedNodeId(null);
                        }, 80);
                    }}
                    style={{
                        ...s.dangerBtn,
                        transition: 'transform 0.1s ease, background-color 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.danger}
                >
                    Purge Block
                </button>
                <button
                    onClick={(e) => {
                        e.currentTarget.style.transform = 'scale(0.94)';
                        setTimeout(closeModal, 80);
                    }}
                    style={{
                        ...s.primaryBtn,
                        margin: 0,
                        padding: '6px 16px',
                        transition: 'transform 0.1s ease, background-color 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.primaryHover || '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.primary}
                >
                    Apply Changes
                </button>
            </div>
        );

        // Main node return
        return (
            <>
                <ModalHeader
                    title={`Configure: ${node.data.moduleName}`}
                    icon={<IconBox size={20} />}
                    onClose={closeModal}
                />
                {!isSplitterOrBundler && <Tabs />}
                <div style={{
                    height: '320px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    scrollbarWidth: 'thin',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    scrollbarColor: theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6'
                }}>
                    {isSplitterOrBundler ? renderSplitterPanel() : (modalTab === 'properties' ? renderPropertiesPanel() : renderCodePanel())}
                </div>
                {renderFooter()}
            </>
        );
    };

    // ---- Edge content ----
    // To render wires and access its properties...
    const renderEdgeContent = () => {
        const edge = edges.find(e => e.id === targetId);
        if (!edge) return null;

        return (
            <>
                <ModalHeader
                    title="Net Trace Metrics"
                    icon={<IconTrace size={20} />}
                    onClose={closeModal}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={s.formGroup}>
                        <label style={s.label}>Explicit Bus Width Constraint</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                style={{ ...s.input, width: '70px', padding: '6px', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: '12px', color: t.textSecondary }}>bits width array</span>
                        </div>
                            <span style={{ fontSize: '14px', color: theme === "dark" ? "#4b69ff" : "#174dff" }}> Note: Max <strong>Width</strong> possible is <strong>128</strong>. </span>
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Net Highlighter Schematic Tint</label>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
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
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: color,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        border: edge.data?.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)'
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
                    marginTop: '20px',
                    paddingTop: '10px',
                    borderTop: `1px solid ${t.border}`,
                    userSelect: 'none'
                }}>
                    <button
                        onClick={() => {
                            setEdges(eds => eds.filter(e => e.id !== targetId));
                            closeModal();
                            setGlowingNet(null);
                        }}
                        style={s.dangerBtn}
                    >
                        Purge Route
                    </button>
                    <button onClick={closeModal} style={{ ...s.primaryBtn, margin: 0, padding: '6px 16px' }}>
                        Confirm
                    </button>
                </div>
            </>
        );
    };

    // ============================
    // Main modal wrapper
    // ============================
    const modalStyle = {
        position: 'fixed',
        top: `${modalPos.y}px`,
        left: `${modalPos.x}px`,
        zIndex: 99999,
        background: t.bgSecondary,
        color: t.textHeading,
        cursor: 'grab',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '520px'
    };

    if (isNode) {
        const node = nodes.find(n => n.id === targetId);
        if (!node) return null;
        return (
            <div
                onMouseDown={handleModalDragStart}
                style={{
                    ...modalStyle,
                    width: '480px',
                    border: `4px solid ${theme === 'dark' ? "rgba(0, 27, 233, 0.87)": "rgba(255, 1, 1, 0.87)"}`,
                    boxShadow: theme === 'dark' ? `0 20px 40px rgba(0,0,0,0.6)` : '0 20px 40px rgba(0,0,0,0.15)'
                }}
            >
                {renderNodeContent()}
            </div>
        );
    } else {
        const edge = edges.find(e => e.id === targetId);
        if (!edge) return null;
        return (
            <div
                onMouseDown={handleModalDragStart}
                style={{
                    ...modalStyle,
                    width: '360px',
                    border: `4px solid ${theme === 'dark' ? "rgba(0, 27, 233, 0.87)": "rgba(255, 1, 1, 0.87)"}`,
                    boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.15)'
                }}
            >
                {renderEdgeContent()}
            </div>
        );
    }
};

export default ContextualModal;
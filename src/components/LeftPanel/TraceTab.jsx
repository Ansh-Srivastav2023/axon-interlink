// src/components/LeftPanel/TraceTab.jsx
const TraceTab = ({
    t, s,
    nodes, exposedPorts,
    hierarchyInputRef,
    hierarchySearchQuery, setHierarchySearchQuery,
    hierarchyResults, setHierarchyResults,
    hierarchyExpanded, setHierarchyExpanded,
    buildHierarchyResult,
    highlightNetPath,
    jumpToNode,
    setNodes,
}) => {
    const validExposedList = Object.keys(exposedPorts || {})
        .filter((key) => {
            const portData = exposedPorts[key];
            return (nodes || []).some((node) => node && node.id === portData?.nodeId);
        })
        .map((key) => exposedPorts[key]);

    const topInputs = validExposedList.filter(p => p && p.isInput);
    const topOutputs = validExposedList.filter(p => p && !p.isInput);
    const usesClk = (nodes || []).some(n => n && n.data?.autoRoute?.['clk']);
    const usesRst = (nodes || []).some(n => n && n.data?.autoRoute?.['rst_n']);

    return (
        <div
            style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Hierarchy Input */}
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Hierarchy / Net Trace
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        ref={hierarchyInputRef}
                        value={hierarchySearchQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setHierarchySearchQuery(val);
                            buildHierarchyResult(val);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setHierarchySearchQuery('');
                                setHierarchyResults(null);
                            }
                        }}
                        placeholder="Trace by module or instance…"
                        style={{
                            ...s.input,
                            width: '100%',
                            boxSizing: 'border-box',
                            paddingRight: hierarchySearchQuery ? '28px' : '10px',
                        }}
                    />
                    {hierarchySearchQuery && (
                        <button
                            onClick={() => {
                                setHierarchySearchQuery('');
                                setHierarchyResults(null);
                            }}
                            style={{
                                ...s.iconBtn,
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '24px',
                                height: '24px',
                                minHeight: '24px',
                                borderRadius: '6px',
                                background: 'transparent',
                                borderColor: 'transparent',
                                color: t.textMuted,
                                fontSize: '14px',
                                lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {hierarchyResults === null && (
                <div style={{ ...s.emptyState, margin: '0 14px', lineHeight: 1.7 }}>
                    Enter a module name above to live trace.
                    <br />
                    <span style={{ fontSize: '11px', color: t.textMuted }}>
                        Click any driver/fanout row to jump and highlight that net on canvas.
                    </span>
                </div>
            )}

            {hierarchyResults !== null && hierarchyResults.length === 0 && (
                <div style={{ ...s.emptyState, margin: '0 14px' }}>
                    No modules found for <code>"{hierarchySearchQuery}"</code>
                </div>
            )}

            {hierarchyResults !== null && hierarchyResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 14px 14px' }}>
                    {hierarchyResults.map(({ node, drivers, fanoutByPort, unconnectedInputs }) => {
                        const key = node.id;
                        const isOpen = !!hierarchyExpanded[key];

                        return (
                            <div key={key} style={{ border: `1px solid rgba(255, 255, 255, 0.15)`, borderRadius: '7px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                                <div onClick={() => setHierarchyExpanded(p => ({ ...p, [key]: !p[key] }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.05)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '12px', color: t.textHeading, fontFamily: 'monospace' }}>{node.data.moduleName}</div>
                                        <div style={{ fontSize: '10px', color: t.textSecondary, fontFamily: 'monospace' }}>{node.data.instanceName}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 5px', borderRadius: '3px' }}>{drivers.length}▲</span>
                                        <span style={{ fontSize: '10px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 5px', borderRadius: '3px' }}>{Object.values(fanoutByPort).flat().length}▼</span>
                                        {unconnectedInputs.length > 0 && <span style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 5px', borderRadius: '3px' }}>⚠{unconnectedInputs.length}</span>}
                                        <span style={{ color: t.textMuted, fontSize: '12px' }}>{isOpen ? '▾' : '▸'}</span>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {drivers.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>▲ Drivers (inputs)</div>
                                                {drivers.map(d => (
                                                    <div key={d.edgeId} onClick={() => highlightNetPath(d.edgeId, d.sourceNodeId)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', marginBottom: '3px', borderRadius: '4px', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.02)', border: `1px solid rgba(255, 255, 255, 0.1)`, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}>
                                                        <div><div style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textHeading }}>{d.srcInstanceName}<span style={{ color: t.textMuted }}>.{d.sourceHandle}</span></div><div style={{ fontSize: '10px', color: t.textMuted }}>→ .{d.targetHandle}</div></div>
                                                        <div style={{ fontSize: '10px', color: d.bitWidth > 1 ? '#6366f1' : t.textMuted, fontFamily: 'monospace' }}>{d.bitWidth > 1 ? `[${d.bitWidth - 1}:0]` : '1b'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {Object.keys(fanoutByPort).length > 0 && (
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>▼ Fanout (outputs)</div>
                                                {Object.entries(fanoutByPort).map(([port, fans]) => (
                                                    <div key={port} style={{ marginBottom: '6px' }}>
                                                        <div style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600, padding: '2px 0 4px 6px' }}>.{port} <span style={{ color: t.textMuted }}>({fans.length} load{fans.length !== 1 ? 's' : ''})</span></div>
                                                        {fans.map(f => (
                                                            <div key={f.edgeId} onClick={() => highlightNetPath(f.edgeId, f.targetNodeId)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', marginBottom: '3px', borderRadius: '4px', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.02)', border: `1px solid rgba(255, 255, 255, 0.1)`, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}>
                                                                <div><div style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textHeading }}>{f.tgtInstanceName}<span style={{ color: t.textMuted }}>.{f.targetHandle}</span></div></div>
                                                                <div style={{ fontSize: '10px', color: f.bitWidth > 1 ? '#6366f1' : t.textMuted, fontFamily: 'monospace' }}>{f.bitWidth > 1 ? `[${f.bitWidth - 1}:0]` : '1b'}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {unconnectedInputs.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠ Floating Inputs</div>
                                                {unconnectedInputs.map(p => (
                                                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: '2px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.05)', border: `1px solid rgba(239, 68, 68, 0.2)` }}>
                                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ef4444' }}>.{p.name}</span>
                                                        <span style={{ fontSize: '10px', color: t.textMuted, fontFamily: 'monospace' }}>{p.width > 1 ? `${p.width}b` : '1b'} undriven</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {drivers.length === 0 && Object.keys(fanoutByPort).length === 0 && unconnectedInputs.length === 0 && <div style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic' }}>No connectivity data — module has no wired ports.</div>}
                                        <button onClick={() => { const targetNodeId = node.id; jumpToNode(node); setNodes(nds => nds.map(n => n.id === targetNodeId ? { ...n, data: { ...n.data, isDrcFlashing: true } } : n)); setTimeout(() => { setNodes(nds => nds.map(n => n.id === targetNodeId ? { ...n, data: { ...n.data, isDrcFlashing: false } } : n)); }, 1600); }} style={{ ...s.smallBtn, alignSelf: 'flex-start', fontSize: '11px', marginTop: '2px' }}>⊞ Jump to block</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={s.divider} />

            {/* Top Module Interface */}
            <div style={{ ...s.panelSection, paddingTop: '4px' }}>
                <div style={{ ...s.sectionTitle, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Top Module Interface ({topInputs.length + topOutputs.length + (usesClk ? 1 : 0) + (usesRst ? 1 : 0)})
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid rgba(255, 255, 255, 0.1)`,
                    borderRadius: '8px',
                    padding: '10px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                }}>
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Inputs
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {usesClk && (
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textSecondary, padding: '3px 6px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                                    clk <span style={{ color: t.textMuted, fontSize: '10px' }}>(Global System Clock)</span>
                                </div>
                            )}
                            {usesRst && (
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textSecondary, padding: '3px 6px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                                    rst_n <span style={{ color: t.textMuted, fontSize: '10px' }}>(Global Async Reset)</span>
                                </div>
                            )}
                            {topInputs.map((port) => {
                                const matchingNode = (nodes || []).find(n => n && n.id === port.nodeId);
                                const prefix = matchingNode ? matchingNode.data.instanceName : 'u';
                                const bitWidthString = port.width > 1 ? `[${port.msb}:${port.lsb}]` : '';

                                return (
                                    <div
                                        key={`${port.nodeId}__${port.portName}`}
                                        onClick={() => matchingNode && jumpToNode(matchingNode)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '11px',
                                            fontFamily: 'monospace',
                                            color: t.textHeading,
                                            padding: '4px 6px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: `1px solid rgba(255, 255, 255, 0.1)`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                    >
                                        <span>{prefix}_{port.portName}{bitWidthString}</span>
                                        <span style={{ fontSize: '9px', color: t.textMuted }}>↳ {prefix}</span>
                                    </div>
                                );
                            })}
                            {topInputs.length === 0 && !usesClk && !usesRst && (
                                <div style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic', paddingLeft: '4px' }}>No top input nets promoted</div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Outputs
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {topOutputs.map((port) => {
                                const matchingNode = (nodes || []).find(n => n && n.id === port.nodeId);
                                const prefix = matchingNode ? matchingNode.data.instanceName : 'u';
                                const bitWidthString = port.width > 1 ? `[${port.msb}:${port.lsb}]` : '';

                                return (
                                    <div
                                        key={`${port.nodeId}__${port.portName}`}
                                        onClick={() => matchingNode && jumpToNode(matchingNode)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '11px',
                                            fontFamily: 'monospace',
                                            color: t.textHeading,
                                            padding: '4px 6px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: `1px solid rgba(255, 255, 255, 0.1)`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                    >
                                        <span>{prefix}_{port.portName}{bitWidthString}</span>
                                        <span style={{ fontSize: '9px', color: t.textMuted }}>✍ {prefix}</span>
                                    </div>
                                );
                            })}
                            {topOutputs.length === 0 && (
                                <div style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic', paddingLeft: '4px' }}>No top output nets promoted</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraceTab;

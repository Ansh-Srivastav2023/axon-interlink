import ExposureChecklist from './ExposureChecklist';

const SplitterPanel = ({
    node,
    targetId,
    t,
    s,
    getPortLabel,
    parsePorts,
    recordHistory,
    setNodes,
    edges,
    exposedPorts,
    toggleExposePort
}) => {
    const currentPorts = node.data.isSplitter ? (node.data.outputs || []) : (node.data.inputs || []);

    return (
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
                    edges={edges}
                    exposedPorts={exposedPorts}
                    toggleExposePort={toggleExposePort}
                    t={t}
                />
            </div>
        </>
    );
};

export default SplitterPanel;
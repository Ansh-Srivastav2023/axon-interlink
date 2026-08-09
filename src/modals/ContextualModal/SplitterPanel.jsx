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
    setEdges,
    setExposedPorts,
    edges,
    exposedPorts,
    toggleExposePort
}) => {
    const currentPorts = node.data.isSplitter ? (node.data.outputs || []) : (node.data.inputs || []);
    const buildSequentialPorts = (prefix, count, totalWidth) => {
        let remainingWidth = Math.max(count, totalWidth || count);
        let nextLsb = 0;
        return Array.from({ length: count }, (_, i) => {
            const remainingPorts = count - i;
            const width = Math.max(1, Math.ceil(remainingWidth / remainingPorts));
            const port = {
                name: `${prefix}${i}`,
                width,
                msb: nextLsb + width - 1,
                lsb: nextLsb
            };
            nextLsb += width;
            remainingWidth -= width;
            return port;
        });
    };

    const keepOnlyLiveHandles = (inputNames, outputNames) => {
        setEdges(eds => eds.filter(edge => {
            if (edge.source === targetId) return outputNames.has(edge.sourceHandle);
            if (edge.target === targetId) return inputNames.has(edge.targetHandle);
            return true;
        }));
        setExposedPorts(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                const entry = next[key];
                if (entry?.nodeId !== targetId) return;
                const liveNames = entry.isInput ? inputNames : outputNames;
                if (!liveNames.has(entry.portName)) delete next[key];
            });
            return next;
        });
    };

    const syncExposedPort = (previousName, nextPort, isInput) => {
        setExposedPorts(prev => {
            const previousKey = `${targetId}__${previousName}`;
            if (!prev[previousKey]) return prev;
            const next = { ...prev };
            delete next[previousKey];
            next[`${targetId}__${nextPort.name}`] = {
                nodeId: targetId,
                portName: nextPort.name,
                width: nextPort.width,
                msb: nextPort.msb,
                lsb: nextPort.lsb,
                isInput
            };
            return next;
        });
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

    const inputStyle = {
        ...s.input,
        borderRadius: '9px',
        minHeight: '36px',
        fontFamily: '"SF Mono", Consolas, Menlo, monospace',
    };

    return (
        <>
            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>{node.data.isSplitter ? 'Bus splitter' : 'Bus bundler'}</h4>
                <div style={{ color: t.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
                    {node.data.isSplitter
                        ? 'Splits one input bus into ordered output slices.'
                        : 'Combines ordered input slices into one output bus.'}
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Number of slices</label>
                    <input
                        type="number"
                        min="1"
                        max="16"
                        value={currentPorts.length}
                        style={{ ...inputStyle, width: '88px', textAlign: 'center' }}
                        onChange={(e) => {
                            const count = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                            recordHistory();
                            const existingTotalWidth = node.data.isSplitter
                                ? (node.data.inputs?.[0]?.width || currentPorts.reduce((sum, port) => sum + (port.width || 1), 0) || count)
                                : (node.data.outputs?.[0]?.width || currentPorts.reduce((sum, port) => sum + (port.width || 1), 0) || count);
                            const totalWidth = Math.max(count, existingTotalWidth);
                            const newPorts = buildSequentialPorts(node.data.isSplitter ? 'out' : 'in', count, totalWidth);
                            const inputPorts = node.data.isSplitter
                                ? [{ name: 'bus_in', width: totalWidth, msb: totalWidth - 1, lsb: 0 }]
                                : newPorts;
                            const outputPorts = node.data.isSplitter
                                ? newPorts
                                : [{ name: 'bus_out', width: totalWidth, msb: totalWidth - 1, lsb: 0 }];
                            setNodes(nds => nds.map(n => n.id === targetId ? {
                                ...n,
                                data: {
                                    ...n.data,
                                    inputs: inputPorts,
                                    outputs: outputPorts,
                                    _manualOverride: true
                                }
                            } : n));
                            keepOnlyLiveHandles(new Set(inputPorts.map(p => p.name)), new Set(outputPorts.map(p => p.name)));
                        }}
                    />
                </div>
            </div>

            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Slice ports</h4>
                <div style={{ fontSize: '11px', color: t.textMuted, lineHeight: 1.45 }}>
                    {node.data.isSplitter ? 'Order: outN...out0 maps to [MSB...LSB].' : 'Order: inN...in0 maps to [MSB...LSB].'}
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
                                    style={{ ...inputStyle, flex: 1, padding: '6px 9px', fontSize: '12px', minHeight: '32px' }}
                                    defaultValue={portLabel}
                                    placeholder="e.g. in[3:0]"
                                    onBlur={(e) => {
                                        const parsed = parsePorts(e.target.value);
                                        if (parsed && parsed.length > 0) {
                                            recordHistory();
                                            const previousName = currentPorts[idx]?.name;
                                            const nextName = parsed[0].name;
                                            const nextPort = {
                                                name: parsed[0].name,
                                                width: parsed[0].width,
                                                msb: parsed[0].msb,
                                                lsb: parsed[0].lsb
                                            };
                                            setNodes(nds => nds.map(n => {
                                                if (n.id !== targetId) return n;
                                                const updated = [...currentPorts];
                                                updated[idx] = nextPort;
                                                const splitterBusWidth = n.data.isSplitter
                                                    ? Math.max(
                                                        1,
                                                        updated.reduce((max, port) => (
                                                            Math.max(max, Number.isInteger(port.msb) ? port.msb + 1 : 0)
                                                        ), 0) || updated.reduce((sum, port) => sum + (port.width || 1), 0)
                                                    )
                                                    : 1;
                                                return {
                                                    ...n,
                                                    data: {
                                                        ...n.data,
                                                        inputs: n.data.isSplitter
                                                            ? [{ name: 'bus_in', width: splitterBusWidth, msb: splitterBusWidth - 1, lsb: 0 }]
                                                            : updated,
                                                        outputs: n.data.isSplitter ? updated : n.data.outputs,
                                                        _manualOverride: true
                                                    }
                                                };
                                            }));
                                            if (previousName && nextName && previousName !== nextName) {
                                                setEdges(eds => eds.map(edge => {
                                                    if (node.data.isSplitter && edge.source === targetId && edge.sourceHandle === previousName) {
                                                        return { ...edge, sourceHandle: nextName };
                                                    }
                                                    if (node.data.isBundler && edge.target === targetId && edge.targetHandle === previousName) {
                                                        return { ...edge, targetHandle: nextName };
                                                    }
                                                    return edge;
                                                }));
                                            }
                                            syncExposedPort(previousName, nextPort, !node.data.isSplitter);
                                        }
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>Top-level I/O exposure</h4>
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

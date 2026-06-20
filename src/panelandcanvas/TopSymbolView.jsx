import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useMemo } from 'react';

const TopSymbolView = ({
    exposedPorts,
    nodes,
    theme = 'light'
}) => {
    const { inputs, outputs  } = useMemo(() => {
        const getPortName = (p) => {
            const node = nodes.find(n => n.id === p.nodeId);
            return `${node ? node.data.instanceName : 'u'}_${p.portName}`;
        };

        const allPorts = Object.values(exposedPorts);

        const inputs = allPorts
            .filter(p => p.isInput)
            .map(p => ({
                name: getPortName(p),
                width: p.width,
                msb: p.msb,
                lsb: p.lsb
            }));

        const outputs = allPorts
            .filter(p => !p.isInput)
            .map(p => ({
                name: getPortName(p),
                width: p.width,
                msb: p.msb,
                lsb: p.lsb
            }));

        const usesClk = nodes.some(n => (n.data.autoRoute || {})['clk']);
        const usesRst = nodes.some(n => (n.data.autoRoute || {})['rst_n']);

        if (usesClk) inputs.unshift({ name: 'clk', width: 1 });
        if (usesRst) inputs.unshift({ name: 'rst_n', width: 1 });

        return { inputs, outputs, usesClk, usesRst };
    }, [exposedPorts, nodes]);

    const isDark = theme === 'dark';

    const colors = useMemo(() => ({
        panelBg: isDark ? '#000000' : '#f9fafb',
        cardBg: isDark ? '#050505' : '#ffffff',
        cardBorder: isDark ? '#333333' : '#cbd5e1',
        textPrimary: isDark ? '#ffffff' : '#111827',
        textSecondary: isDark ? '#888888' : '#6b7280',
        textPort: isDark ? '#e2e8f0' : '#374151',
    }), [isDark]);

    const buttonStyle = {
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        color: colors.textPrimary,
        cursor: 'pointer',
        borderRadius: '4px',
        padding: '4px 10px',
        fontSize: '14px',
        fontFamily: 'monospace',
        lineHeight: 1
    };

    const renderPort = (p, idx, color) => (
        <div key={`port_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', background: color, borderRadius: '50%' }} />
            <span style={{ fontSize: '11px', color: colors.textPort, whiteSpace: 'nowrap' }}>
                {p.width > 1 ? `${p.name}[${p.msb ?? p.width - 1}:${p.lsb ?? 0}]` : p.name}
            </span>
        </div>
    );

    return (
        <div style={{ height: '100%', width: '100%', background: colors.panelBg, position: 'relative' }}>
            <TransformWrapper
                initialScale={1}
                minScale={0.2}
                maxScale={4}
                wheel={{ step: 0.009, smoothStep: 0.001 }}
                centerOnInit
                limitToBounds={false}
            >
                {({ zoomIn, zoomOut, resetTransform, state }) => (
                    <>
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            zIndex: 10,
                            display: 'flex',
                            gap: '6px',
                            background: colors.cardBg,
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: '6px',
                            padding: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                            <button onClick={() => zoomIn()} style={buttonStyle}>+</button>
                            <button onClick={() => zoomOut()} style={buttonStyle}>-</button>
                            <button onClick={() => resetTransform()} style={buttonStyle}>⟲</button>
                            <div style={{
                                color: colors.textSecondary,
                                fontSize: '11px',
                                alignSelf: 'center',
                                fontFamily: 'monospace',
                                minWidth: '45px',
                                textAlign: 'center'
                            }}>
                                {Math.round(state.scale * 100)}%
                            </div>
                        </div>

                        <TransformComponent
                            wrapperStyle={{ width: "100%", height: "100%" }}
                            contentStyle={{
                                width: "100%",
                                height: "100%",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <div style={{
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: '8px',
                                minWidth: '220px',
                                padding: '14px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                fontFamily: 'monospace',
                                userSelect: 'none'
                            }}>
                                <div style={{
                                    borderBottom: `1px solid ${colors.cardBorder}`,
                                    paddingBottom: '8px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: colors.textPrimary }}>
                                        top_module
                                    </div>
                                    <div style={{ fontSize: '11px', color: colors.textSecondary }}>system_top</div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginBottom: '2px' }}>
                                            INPUTS
                                        </div>
                                        {inputs.length > 0
                                            ? inputs.map((p, idx) => renderPort(p, idx, '#10b981'))
                                            : <span style={{ fontSize: '11px', color: colors.textSecondary, fontStyle: 'italic' }}>None</span>
                                        }
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                        <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '2px' }}>
                                            OUTPUTS
                                        </div>
                                        {outputs.length > 0
                                            ? outputs.map((p, idx) => (
                                                <div key={`out_${idx}`} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    flexDirection: 'row-reverse'
                                                }}>
                                                    <div style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '11px', color: colors.textPort, whiteSpace: 'nowrap' }}>
                                                        {p.width > 1 ? `${p.name}[${p.msb ?? p.width - 1}:${p.lsb ?? 0}]` : p.name}
                                                    </span>
                                                </div>
                                            ))
                                            : <span style={{ fontSize: '11px', color: colors.textSecondary, fontStyle: 'italic' }}>None</span>
                                        }
                                    </div>
                                </div>
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};

export default TopSymbolView;
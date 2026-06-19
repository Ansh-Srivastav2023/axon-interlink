import { useMemo, useEffect } from 'react';
import {
    useReactFlow, Handle, Position,
    useUpdateNodeInternals, useEdges
} from '@xyflow/react';

import { 
    lightNodeStyles, 
    darkNodeStyles,
    IconAlert,
    IconZap,
    IconCircleSlash,
    IconActivity,
    // renderInfoIcon,
    InfoIcon,
    renderDecorations
} from '../styles';

import { getPortLabel } from '../utils/hardwareutils'


export default function HardwareNode({ id, data, selected }) {
    const { setNodes } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();

    if (!data) return null;

    useEffect(() => {
        updateNodeInternals(id);
    }, [data.portsSwapped, id, updateNodeInternals]);

    const isDark = data.theme === 'dark';
    const t = isDark ? darkNodeStyles : lightNodeStyles;

    const isSwapped = !!data.portsSwapped;
    const inputsPosition = isSwapped ? Position.Right : Position.Left;
    const outputsPosition = isSwapped ? Position.Left : Position.Right;

    // ─── PERFORMANCE FIX: MEMOIZE LOCAL EDGES FOR THIS NODE ONLY ───
    const localIncomingEdges = useMemo(() => edges.filter(e => e.target === id), [edges, id]);
    const localOutgoingEdges = useMemo(() => edges.filter(e => e.source === id), [edges, id]);

    const getWarnings = (port, isInput) => {
        // Look up from pre-filtered sub-arrays instead of the entire global edges array
        const connected = isInput
            ? localIncomingEdges.filter(e => e.targetHandle === port.name)
            : localOutgoingEdges.filter(e => e.sourceHandle === port.name);

        const tieoff = data.tieoffs?.[port.name];
        const autoRoute = data.autoRoute?.[port.name];
        const isExposed = data.exposedPorts?.[port.name];
        let w = [];
        if (isInput) {
            if (connected.length === 0 && !tieoff && !autoRoute && !isExposed) w.push({ msg: 'Floating input', icon: <IconAlert color="#ef4444" size={12} /> });
            if (connected.length > 1) w.push({ msg: 'Multiple drivers', icon: <IconZap color="#ef4444" size={12} /> });
            if (connected.some(e => e.data?.bitWidth !== port.width)) w.push({ msg: 'Width mismatch', icon: <IconActivity color="#f59e0b" size={12} /> });
        } else {
            if (connected.length === 0 && !isExposed) w.push({ msg: 'Unused output', icon: <IconCircleSlash color="#9ca3af" size={12} /> });
        }
        return w;
    };

    const containerStyle = {
        ...t.node,
        ...(selected ? t.nodeSelected : {}),
        ...(data?.isDrcFlashing ? {
            animation: 'drcDoublePulse 0.8s ease-in-out 2',
            border: '2px solid #ef4444',
            boxShadow: '0 0 20px #ef4444'
        } : {})
    };

    const renderPortColumn = (ports, columnPosition) => (
        <div style={t.portColumn}>
            {ports.map((port) => {
                const isInput = (data.inputs || []).some(p => p.name === port.name);
                const handleType = isInput ? 'target' : 'source';
                const baseHandleStyle = columnPosition === Position.Left ? t.handleLeft : t.handleRight;

                const handleStyle = {
                    ...baseHandleStyle,
                    background: isInput ? '#10b981' : '#f59e0b',
                    left: columnPosition === Position.Left ? '-5px' : 'auto',
                    right: columnPosition === Position.Right ? '-5px' : 'auto',
                };

                const warnings = getWarnings(port, isInput);

                return (
                    <div key={port.name} style={{ ...t.portRow, flexDirection: columnPosition === Position.Right ? 'row-reverse' : 'row' }}>
                        <Handle type={handleType} position={columnPosition} id={port.name} style={handleStyle}>
                            {renderDecorations(port, isInput, columnPosition, data, t, edges, id)}
                        </Handle>
                        <span style={t.portLabel}>{getPortLabel(port)}</span>
                        {warnings.length > 0 && (
                            <div style={{ display: 'flex', gap: '2px', marginLeft: columnPosition === Position.Left ? '4px' : '0', marginRight: columnPosition === Position.Right ? '4px' : '0' }}>
                                {warnings.map((w, i) => <span key={i} title={w.msg} style={{ cursor: 'help' }}>{w.icon}</span>)}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div style={containerStyle}>
            <InfoIcon id={id} data={data} t={t} setNodes={setNodes} />
            <div style={t.header}>
                <div style={t.moduleName}>{data.moduleName}</div>
                <div style={t.instanceName}>{data.instanceName}</div>
            </div>
            <div style={{ ...t.body, flexDirection: isSwapped ? 'row-reverse' : 'row' }}>
                {renderPortColumn(data.inputs || [], inputsPosition)}
                <div style={{ flex: 1, minWidth: '20px' }} />
                {renderPortColumn(data.outputs || [], outputsPosition)}
            </div>
        </div>
    );
}

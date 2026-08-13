import React, { useMemo, useEffect } from 'react';
import { useReactFlow, Handle, Position, useUpdateNodeInternals, useEdges } from '@xyflow/react';

import {
    lightNodeStyles,
    darkNodeStyles,
    IconAlert,
    IconZap,
    IconCircleSlash,
    IconActivity,
    InfoIcon,
    renderDecorations
} from '../styles';
import { useCanvasTheme } from '../utils/CanvasThemeContext';
import { getEdgeEffectiveWidths, getTargetSlice, rangesOverlap } from '../utils/edgeSlices';

export default function GateNode({ id, data, selected }) {
    // ─── ALL HOOKS CALLED UNCONDITIONALLY ─────────────────────────────
    const { setNodes, getNodes } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();

    useEffect(() => {
        if (data) updateNodeInternals(id);
    }, [data, data?.portsSwapped, id, updateNodeInternals]);

    const canvasTheme = useCanvasTheme(data?.theme || 'dark');
    const isDark = canvasTheme === 'dark';
    const t = isDark ? darkNodeStyles : lightNodeStyles;
    const isSwapped = !!data?.portsSwapped;
    const inputsPosition = isSwapped ? Position.Right : Position.Left;
    const outputsPosition = isSwapped ? Position.Left : Position.Right;

    const localIncomingEdges = useMemo(() => edges.filter(e => e.target === id), [edges, id]);
    const localOutgoingEdges = useMemo(() => edges.filter(e => e.source === id), [edges, id]);

    // ─── EARLY RETURN AFTER HOOKS ─────────────────────────────────────
    if (!data) return null;

    // ─── getWarnings ────────────────────────────────────────────────────
    const getWarnings = (port, isInput) => {
        const allNodes = getNodes();
        const connected = isInput
            ? localIncomingEdges.filter(e => e.targetHandle === port.name)
            : localOutgoingEdges.filter(e => e.sourceHandle === port.name);

        const tieoff = data.tieoffs?.[port.name];
        const autoRoute = data.autoRoute?.[port.name];
        const isExposed = data.exposedPorts?.[port.name];
        let w = [];

        if (isInput) {
            if (connected.length === 0 && !tieoff && !autoRoute && !isExposed) {
                w.push({ msg: 'Floating input', icon: <IconAlert color="#ef4444" size={10} /> });
            }
            if (connected.length > 1) {
                const slices = connected.map((edge) => getTargetSlice(edge, port));
                const hasFullPortDriver = slices.some((slice) => !slice);
                const hasOverlap = slices.some((slice, sliceIndex) =>
                    slices.some((otherSlice, otherIndex) => sliceIndex !== otherIndex && rangesOverlap(slice, otherSlice))
                );
                if (hasFullPortDriver || hasOverlap) {
                    w.push({ msg: 'Overlapping input drivers', icon: <IconZap color="#ef4444" size={10} /> });
                }
            }
            const hasMismatch = connected.some(e => {
                const srcNode = allNodes.find(n => n.id === e.source);
                if (!srcNode) return false;
                const srcPort = (srcNode.data.outputs || []).find(p => p.name === e.sourceHandle);
                if (!srcPort) return false;
                const { sourceWidth, targetWidth } = getEdgeEffectiveWidths(e, srcPort, port);
                return sourceWidth !== targetWidth;
            });
            if (hasMismatch) {
                w.push({ msg: 'Width mismatch', icon: <IconActivity color="#f59e0b" size={10} /> });
            }
        } else {
            if (connected.length === 0 && !isExposed) {
                w.push({ msg: 'Unused output', icon: <IconCircleSlash color="#9ca3af" size={10} /> });
            }
        }
        return w;
    };

    const stroke = selected ? (isDark ? '#3b82f6' : '#2563eb') : (isDark ? '#a3a3a3' : '#4b5563');
    const fill = isDark ? '#050505' : '#ffffff';

    const containerStyle = {
        width: '60px',
        height: '60px',
        position: 'relative',
        filter: selected ? `drop-shadow(0 0 6px ${isDark ? 'rgba(59,130,246,0.5)' : 'rgba(37,99,235,0.4)'})` : 'none',
        ...(data?.isDrcFlashing ? {
            animation: 'drcDoublePulse 0.8s ease-in-out 2',
            filter: 'drop-shadow(0 0 15px #ef4444)'
        } : {})
    };

    const renderSVG = () => {
        const shape = data.gateShape || 'AND';
        const inCount = (data.inputs || []).length;

        const getOutX = (s) => {
            switch (s) {
                case 'AND': return 50; case 'NAND': return 56;
                case 'OR': return 48; case 'NOR': return 54;
                case 'XOR': return 48; case 'XNOR': return 54;
                case 'NOT': return 41;
                case 'BUF': return 45;
                default: return 50;
            }
        };

        const drawPins = () => {
            const pins = [];
            if (inCount === 1) {
                pins.push(<line key="i1" x1="0" y1="30" x2="15" y2="30" stroke={stroke} strokeWidth="2" />);
            } else if (inCount >= 2) {
                pins.push(<line key="i1" x1="0" y1="20" x2="12" y2="20" stroke={stroke} strokeWidth="2" />);
                pins.push(<line key="i2" x1="0" y1="40" x2="12" y2="40" stroke={stroke} strokeWidth="2" />);
            }
            pins.push(<line key="o1" x1={getOutX(shape)} y1="30" x2="60" y2="30" stroke={stroke} strokeWidth="2" />);
            return pins;
        };

        const renderShape = () => {
            switch (shape) {
                case 'AND': return <path d="M 12 10 L 30 10 A 20 20 0 0 1 30 50 L 12 50 Z" fill={fill} stroke={stroke} strokeWidth="2" />;
                case 'NAND':
                    return (
                        <g>
                            <path d="M 12 10 L 30 10 A 20 20 0 0 1 30 50 L 12 50 Z"
                                fill={fill}
                                stroke={stroke}
                                strokeWidth="2"
                            />
                            <circle cx="52" cy="30" r="2"
                                fill={fill}
                                stroke={stroke}
                                strokeWidth="2"
                            />
                        </g>
                    );

                case 'OR': return <path d="M 10 10 Q 25 30 10 50 Q 35 50 48 30 Q 35 10 10 10 Z" fill={fill} stroke={stroke} strokeWidth="2" />;
                case 'NOR': return <g><path d="M 10 10 Q 25 30 10 50 Q 35 50 48 30 Q 35 10 10 10 Z" fill={fill} stroke={stroke} strokeWidth="2" /><circle cx="51" cy="30" r="3" fill={fill} stroke={stroke} strokeWidth="2" /></g>;
                case 'XOR': return <g><path d="M 5 10 Q 20 30 5 50" fill="none" stroke={stroke} strokeWidth="2" /><path d="M 12 10 Q 27 30 12 50 Q 37 50 48 30 Q 37 10 12 10 Z" fill={fill} stroke={stroke} strokeWidth="2" /></g>;
                case 'XNOR': return <g><path d="M 5 10 Q 20 30 5 50" fill="none" stroke={stroke} strokeWidth="2" /><path d="M 12 10 Q 27 30 12 50 Q 37 50 48 30 Q 37 10 12 10 Z" fill={fill} stroke={stroke} strokeWidth="2" /><circle cx="51" cy="30" r="3" fill={fill} stroke={stroke} strokeWidth="2" /></g>;
                case 'NOT': return <g><path d="M 15 15 L 35 30 L 15 45 Z" fill={fill} stroke={stroke} strokeWidth="2" /><circle cx="38" cy="30" r="3" fill={fill} stroke={stroke} strokeWidth="2" /></g>;
                case 'BUF': return <path d="M 15 15 L 45 30 L 15 45 Z" fill={fill} stroke={stroke} strokeWidth="2" />;
                default: return <rect x="10" y="10" width="40" height="40" fill={fill} stroke={stroke} strokeWidth="2" />;
            }
        };

        return (
            <svg viewBox="0 0 60 60" style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none',
                transform: isSwapped ? 'scaleX(-1)' : 'none'
            }}>
                {drawPins()}
                {renderShape()}
            </svg>
        );
    };

    const renderFlatHandle = (port, columnPosition, totalPorts, index) => {
        const isInput = (data.inputs || []).some(p => p.name === port.name);
        const handleType = isInput ? 'target' : 'source';

        const segment = 60 / (totalPorts + 1);
        const topPosition = segment * (index + 1);

        const handleStyle = {
            position: 'absolute',
            top: `${topPosition}px`,
            transform: 'translateY(-50%)',
            left: columnPosition === Position.Left ? '-5px' : 'auto',
            right: columnPosition === Position.Right ? '-5px' : 'auto',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isInput ? '#10b981' : '#f59e0b',
            border: isDark ? '2px solid #000000' : '2px solid #ffffff',
            zIndex: 50,
            margin: 0,
            cursor: 'crosshair'
        };

        const warnings = getWarnings(port, isInput);

        return (
            <React.Fragment key={port.name}>
                <Handle
                    type={handleType}
                    position={columnPosition}
                    id={port.name}
                    style={handleStyle}
                    className="nodrag"
                >
                    {renderDecorations(port, isInput, columnPosition, data, t, edges, id)}
                </Handle>

                {warnings.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: `${topPosition - 20}px`,
                        [columnPosition === Position.Left ? 'left' : 'right']: '-14px',
                        display: 'flex',
                        gap: 2,
                        background: t.bgSecondary,
                        borderRadius: 4,
                        padding: 1,
                        border: `1px solid ${t.border}`,
                        zIndex: 100
                    }}>
                        {warnings.map((w, i) => <span key={i} title={w.msg}>{w.icon}</span>)}
                    </div>
                )}
            </React.Fragment>
        );
    };

    return (
        <div style={containerStyle}>
            <InfoIcon id={id} data={data} t={t} setNodes={setNodes} />
            {renderSVG()}

            {(data.inputs || []).map((port, idx) =>
                renderFlatHandle(port, inputsPosition, (data.inputs || []).length, idx)
            )}

            {(data.outputs || []).map((port, idx) =>
                renderFlatHandle(port, outputsPosition, (data.outputs || []).length, idx)
            )}

            <div style={{ position: 'absolute', bottom: -20, width: '100%', textAlign: 'center', fontSize: '10px', color: t.instanceName.color, fontFamily: 'monospace' }}>
                {data.instanceName}
            </div>
        </div>
    );
}

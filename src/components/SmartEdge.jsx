import { useMemo, useState } from 'react';
import { EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from '@xyflow/react';

import { IconAlert } from '../styles';
import {
    formatSlice,
    makeCompactSlice,
    normalizeSlice,
    sliceWidth,
} from '../utils/edgeSlices';

const sliceButtonStyle = (active) => ({
    fontSize: '10px',
    background: active ? '#dbeafe' : '#f8fafc',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    padding: '1px 5px',
    cursor: 'pointer',
    fontFamily: 'monospace',
});

export default function SmartEdge({
    id,
    source,
    sourceHandle,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style,
    selected,
}) {
    const { setEdges } = useReactFlow();
    const [editingSliceSide, setEditingSliceSide] = useState(null);
    const [sourceMsb, setSourceMsb] = useState('');
    const [sourceLsb, setSourceLsb] = useState('');
    const [targetMsb, setTargetMsb] = useState('');
    const [targetLsb, setTargetLsb] = useState('');

    const isGlowing = data?.isGlowing || false;
    const isFlashing = data?.isFlashing || false;
    const isDimmed = data?.isDimmed || false;
    const isFlowAnimated = !!data?.animateFlow;

    const hasWarning = data?.warning;
    const edgeWidth = data?.bitWidth || 1;
    const isBus = edgeWidth > 1;
    const sourcePortWidth = data?.sourcePortWidth || edgeWidth;
    const targetPortWidth = data?.targetPortWidth || edgeWidth;
    const sourcePortName = data?.sourcePortName || 'source';
    const targetPortName = data?.targetPortName || 'target';
    const sourceSlice = normalizeSlice(data?.sourceSlice, sourcePortWidth);
    const targetSlice = normalizeSlice(data?.targetSlice, targetPortWidth);

    const sourceText = sourceSlice ? `${sourcePortName}${formatSlice(sourceSlice, sourcePortWidth)}` : sourcePortName;
    const targetText = targetSlice ? `${targetPortName}${formatSlice(targetSlice, targetPortWidth)}` : targetPortName;
    const widthText = sourceSlice || targetSlice
        ? `${sourceText} -> ${targetText} (${edgeWidth}b)`
        : isBus
            ? `[${edgeWidth - 1}:0]`
            : '1b';

    const edgeColor = isFlashing
        ? '#ef4444'
        : selected || isGlowing
            ? '#3b82f6'
            : hasWarning
                ? '#f59e0b'
                : data?.sourceModuleColor || data?.color || (isBus ? '#6366f1' : '#64748b');

    const activeThickness = selected || isGlowing
        ? (isBus ? Math.min(4.5, 1.5 + edgeWidth * 0.25) + 2 : 3)
        : (isBus ? Math.min(4.5, 1.5 + edgeWidth * 0.25) : 1.5);

    const edgeStyle = {
        ...style,
        strokeWidth: activeThickness,
        stroke: edgeColor,
        opacity: isDimmed && !selected && !isGlowing && !isFlashing ? 0.16 : 1,
        strokeDasharray: hasWarning ? '5,3' : isFlowAnimated ? '10,8' : undefined,
        strokeDashoffset: isFlowAnimated ? 18 : undefined,
        transition: isFlashing ? 'none' : 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
        animation: isFlashing
            ? 'drcWirePulse 0.8s ease-in-out 2'
            : isFlowAnimated
                ? 'axonWireFlow 0.85s linear infinite'
                : 'none',
    };

    const [edgePath, labelX, labelY] = useMemo(
        () => getSmoothStepPath({
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
            borderRadius: 14,
            offset: data?.routeOffset ?? 28,
        }),
        [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data?.routeOffset]
    );

    const openSliceEditor = (event, side) => {
        event.stopPropagation();
        const sourceInitial = sourceSlice || { msb: sourcePortWidth - 1, lsb: 0 };
        const targetInitial = targetSlice || { msb: targetPortWidth - 1, lsb: 0 };
        setSourceMsb(String(sourceInitial.msb));
        setSourceLsb(String(sourceInitial.lsb));
        setTargetMsb(String(targetInitial.msb));
        setTargetLsb(String(targetInitial.lsb));
        setEditingSliceSide((current) => (current === side ? null : side));
    };

    const applySliceEdit = (event) => {
        event.stopPropagation();
        const nextSourceSlice = makeCompactSlice(sourceMsb, sourceLsb, sourcePortWidth);
        const nextTargetSlice = makeCompactSlice(targetMsb, targetLsb, targetPortWidth);
        const nextSourceWidth = nextSourceSlice ? sliceWidth(nextSourceSlice) : sourcePortWidth;
        const nextTargetWidth = nextTargetSlice ? sliceWidth(nextTargetSlice) : targetPortWidth;

        setEdges((eds) =>
            eds.map((ed) =>
                ed.id === id
                    ? {
                        ...ed,
                        data: {
                            ...ed.data,
                            sourceSlice: nextSourceSlice,
                            targetSlice: nextTargetSlice,
                            bitWidth: Math.min(nextSourceWidth, nextTargetWidth),
                            manualBitWidth: false,
                        },
                    }
                    : ed
            )
        );
        setEditingSliceSide(null);
    };

    const renderSliceEditor = () => {
        if (!editingSliceSide) return null;
        const isSource = editingSliceSide === 'source';
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                }}
            >
                <span style={{ fontSize: '10px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {isSource ? 'src' : 'dst'}
                </span>
                <input
                    value={isSource ? sourceMsb : targetMsb}
                    onChange={(event) => (isSource ? setSourceMsb(event.target.value) : setTargetMsb(event.target.value))}
                    onClick={(event) => event.stopPropagation()}
                    style={{ width: '36px', fontSize: '10px', fontFamily: 'monospace' }}
                    aria-label={isSource ? 'Source slice MSB' : 'Target slice MSB'}
                />
                <span style={{ fontSize: '10px', color: '#cbd5e1' }}>:</span>
                <input
                    value={isSource ? sourceLsb : targetLsb}
                    onChange={(event) => (isSource ? setSourceLsb(event.target.value) : setTargetLsb(event.target.value))}
                    onClick={(event) => event.stopPropagation()}
                    style={{ width: '36px', fontSize: '10px', fontFamily: 'monospace' }}
                    aria-label={isSource ? 'Source slice LSB' : 'Target slice LSB'}
                />
                <button
                    type="button"
                    onClick={applySliceEdit}
                    style={{
                        fontSize: '10px',
                        borderRadius: '4px',
                        border: '1px solid #60a5fa',
                        background: '#2563eb',
                        color: '#ffffff',
                        cursor: 'pointer',
                    }}
                >
                    Apply
                </button>
            </div>
        );
    };

    return (
        <g className={`react-flow__edge-custom src-port-${source}__${sourceHandle}`}>
            <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer' }} />

            <path
                d={edgePath}
                fill="none"
                stroke={edgeColor}
                className="net-glow-layer"
                style={{
                    opacity: (selected || isGlowing || isFlashing) ? (isFlashing ? 0.6 : 0.3) : 0,
                    strokeWidth: activeThickness + 10,
                    strokeLinecap: 'round',
                    transition: 'opacity 0.15s, stroke-width 0.15s',
                    animation: isFlashing ? 'drcWireGlowPulse 0.8s ease-in-out 2' : 'none',
                    pointerEvents: 'none',
                }}
            />

            <path d={edgePath} fill="none" className="net-core-line" style={edgeStyle} markerEnd={markerEnd} />

            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan"
                    onClick={(event) => event.stopPropagation()}
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        opacity: (selected || isGlowing) ? 1 : 0,
                        transition: 'opacity 0.15s ease-in-out',
                        zIndex: selected ? 1000 : 20,
                    }}
                >
                    <div
                        style={{
                            fontSize: '10px',
                            background: hasWarning ? '#fef3c7' : isBus ? '#eef2ff' : '#f1f5f9',
                            color: hasWarning ? '#92400e' : isBus ? '#4338ca' : '#475569',
                            border: `1px solid ${hasWarning ? '#fcd34d' : isBus ? '#c7d2fe' : '#cbd5e1'}`,
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontFamily: 'monospace',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {widthText}
                    </div>

                    {selected && sourcePortWidth > 1 && (
                        <button
                            type="button"
                            onClick={(event) => openSliceEditor(event, 'source')}
                            title="Edit source bit slice"
                            style={sliceButtonStyle(editingSliceSide === 'source')}
                        >
                            Src
                        </button>
                    )}

                    {selected && targetPortWidth > 1 && (
                        <button
                            type="button"
                            onClick={(event) => openSliceEditor(event, 'target')}
                            title="Edit target bit slice"
                            style={sliceButtonStyle(editingSliceSide === 'target')}
                        >
                            Dst
                        </button>
                    )}

                    {hasWarning && (
                        <div
                            title={data.warning}
                            style={{
                                fontSize: '11px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                                borderRadius: '4px',
                                padding: '1px 4px',
                                cursor: 'help',
                            }}
                        >
                            <IconAlert size={10} color="#92400e" />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setEdges((eds) => eds.filter((ed) => ed.id !== id));
                        }}
                        style={{
                            fontSize: '10px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            cursor: 'pointer',
                        }}
                    >
                        x
                    </button>

                    {renderSliceEditor()}
                </div>
            </EdgeLabelRenderer>
        </g>
    );
}

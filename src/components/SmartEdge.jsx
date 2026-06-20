import { useState, useMemo } from 'react';
import { getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';


import { IconAlert } from '../styles';


export default function SmartEdge({ id, source, sourceHandle, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style, selected }) {
    const { setEdges } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);

    const isGlowing = data?.isGlowing || false;
    const isFlashing = data?.isFlashing || false;

    const hasWarning = data?.warning;
    const edgeWidth = data?.bitWidth || 1;
    const isBus = edgeWidth > 1;

    const edgeColor = isFlashing
        ? '#ef4444'
        : (data?.color || (selected ? '#3b82f6' : isGlowing ? '#3b82f6' : hasWarning ? '#f59e0b' : isBus ? '#6366f1' : '#64748b'));

    const activeThickness = (selected || isGlowing) ? (isBus ? Math.min(4.5, 1.5 + edgeWidth * 0.25) + 2 : 3) : (isBus ? Math.min(4.5, 1.5 + edgeWidth * 0.25) : 1.5);

    const edgeStyle = {
        ...style,
        strokeWidth: activeThickness,
        stroke: edgeColor,
        strokeDasharray: hasWarning ? '5,3' : undefined,
        transition: isFlashing ? 'none' : 'stroke 0.2s, stroke-width 0.2s',
        animation: isFlashing ? 'drcWirePulse 0.8s ease-in-out 2' : 'none'
    };

    const [edgePath, labelX, labelY] = useMemo(
        () => getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }),
        [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]
    );
    return (
        <g
            className={`react-flow__edge-custom src-port-${source}__${sourceHandle}`}
        >
            {/* Wide invisible path layer for easy click capture */}
            <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer' }} />

            {/* Ambient Trace Glow Layer (Now tracks both state selection and global CSS hovers) */}
            <path
                d={edgePath}
                fill="none"
                stroke={edgeColor}
                className="net-glow-layer" // ◄ Class token allows the style sheet rules to grab it
                style={{
                    opacity: (selected || isGlowing || isFlashing) ? (isFlashing ? 0.6 : 0.3) : 0,
                    strokeWidth: activeThickness + 10,
                    strokeLinecap: 'round',
                    transition: 'opacity 0.15s, stroke-width 0.15s',
                    animation: isFlashing ? 'drcWireGlowPulse 0.8s ease-in-out 2' : 'none',
                    pointerEvents: 'none'
                }}
            />

            {/* Core Datapath Signal Wire Vector */}
            <path d={edgePath} fill="none" className="net-core-line" style={edgeStyle} markerEnd={markerEnd} />

            <EdgeLabelRenderer>
                <div style={{
                    position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all',
                    display: 'flex', alignItems: 'center', gap: '3px', opacity: (isHovered || selected || isGlowing) ? 1 : 0, transition: 'opacity 0.15s ease-in-out',
                }} className="nodrag nopan">
                    <div style={{ fontSize: '10px', background: hasWarning ? '#fef3c7' : isBus ? '#eef2ff' : '#f1f5f9', color: hasWarning ? '#92400e' : isBus ? '#4338ca' : '#475569', border: `1px solid ${hasWarning ? '#fcd34d' : isBus ? '#c7d2fe' : '#cbd5e1'}`, borderRadius: '4px', padding: '1px 5px', fontFamily: 'monospace', userSelect: 'none' }}>
                        {isBus ? `[${edgeWidth - 1}:0]` : '1b'}
                    </div>
                    {hasWarning && <div title={data.warning} style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '4px', padding: '1px 4px', cursor: 'help' }}><IconAlert size={10} color="#92400e" /></div>}
                    <div onClick={(e) => { e.stopPropagation(); setEdges(eds => eds.filter(ed => ed.id !== id)); }} style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', padding: '1px 5px', cursor: 'pointer' }}>✕</div>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
}
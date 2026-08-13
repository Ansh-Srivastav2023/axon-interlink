import { useEffect } from 'react';
import {
    Handle, Position, useUpdateNodeInternals, useEdges
} from '@xyflow/react';

import {
    lightNodeStyles,
    darkNodeStyles,
    InfoIcon,
    renderDecorations
} from '../styles';
import { useCanvasTheme } from '../utils/CanvasThemeContext';

export default function SplitterNode({ id, data, selected }) {
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();

    useEffect(() => {
        updateNodeInternals(id);
    }, [data.inputs, data.outputs, id, updateNodeInternals]);

    const canvasTheme = useCanvasTheme(data?.theme || 'dark');
    const isDark = canvasTheme === 'dark';
    const t = isDark ? darkNodeStyles : lightNodeStyles;

    // 1. Calculate dynamic height based on your port count so it stretches nicely
    const maxPorts = Math.max((data.inputs || []).length, (data.outputs || []).length, 2);
    const nodeHeight = maxPorts * 26 + 24;

    const containerStyle = {
        position: 'relative',
        width: '45px', // Very narrow vertical body exactly like your drawing
        height: `${nodeHeight}px`,
        background: isDark ? '#050505' : '#ffffff',
        border: selected
            ? `2px solid ${isDark ? '#3b82f6' : '#2563eb'}`
            : `1.5px solid ${isDark ? '#626262' : '#4b5563'}`,

        // 2. This creates the smooth pill/capsule shape from your drawing
        borderRadius: '24px',

        boxShadow: selected
            ? `0 0 10px ${isDark ? 'rgba(59,130,246,0.4)' : 'rgba(37,99,235,0.3)'}`
            : '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        transition: 'border-color 0.15s, box-shadow 0.15s'
    };

    const renderPortColumn = (ports, isInput, side) => {
        const total = ports.length;
        return ports.map((port, index) => {
            const handleType = isInput ? 'target' : 'source';

            // Distribute handles evenly along the custom dynamic height
            const segment = nodeHeight / (total + 1);
            const topPosition = segment * (index + 1);

            const handleStyle = {
                position: 'absolute',
                top: `${topPosition}px`,
                transform: 'translateY(-50%)',
                left: side === Position.Left ? '-4px' : 'auto',
                right: side === Position.Right ? '-4px' : 'auto',
                width: '8px',
                height: '8px',
                background: isInput ? '#10b981' : '#f59e0b',
                border: isDark ? '2px solid #000000' : '2px solid #ffffff',
                borderRadius: '50%',
                zIndex: 50,
                cursor: 'crosshair'
            };

            return (
                <Handle 
                    key={`${port.name}_idx${index}_w${port.width || 1}_t${total}`} 
                    type={handleType} 
                    position={side} 
                    id={port.name} 
                    style={handleStyle}
                >
                    {renderDecorations(port, isInput, side, data, t, edges, id)}
                </Handle>
            );
        });
    };

    return (
        <div style={containerStyle}>
            <InfoIcon id={id} data={data} t={t} />
            {/* 3. VERTICAL SIDE-LABEL TEXT EXACTLY LIKE YOUR DRAWING */}
            <div style={{
                transform: 'rotate(-90deg)',
                whiteSpace: 'nowrap',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                color: data.isSplitter ? '#3b82f6' : '#a855f7',
                textTransform: 'lowercase',
                userSelect: 'none',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {data.isSplitter ? 'split' : 'bundle'}
            </div>

            {/* Hidden layout containers just to manage your input/output nodes logic */}
            {renderPortColumn(data.inputs || [], true, Position.Left)}
            {renderPortColumn(data.outputs || [], false, Position.Right)}

            {/* Instance subtitle tag hanging right under the capsule boundary */}
            <div style={{ position: 'absolute', bottom: -18, width: '100px', left: '-27px', textAlign: 'center', fontSize: '9px', color: t.instanceName.color, fontFamily: 'monospace' }}>
                {data.instanceName}
            </div>
        </div>
    );
}

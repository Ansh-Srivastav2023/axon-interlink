import { Position } from '@xyflow/react';

export const renderDecorations = (port, isInput, position, data, t, edges, nodeId) => {
    const compoundKey = `${nodeId}__${port.name}`;
    const isExposed = !!(data.exposedPorts?.[port.name] || data.exposedPorts?.[compoundKey]);
    const tieoff = data.tieoffs?.[port.name];
    const autoRoute = data.autoRoute?.[port.name];

    const isConnected = edges && edges.some(e =>
        (e.target === nodeId && e.targetHandle === port.name) ||
        (e.source === nodeId && e.sourceHandle === port.name)
    );

    if (isInput && isConnected && !isExposed) return null;

    if (!isExposed && !tieoff && !autoRoute) return null;

    const base = { position: 'absolute', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 100 };

    if (position === Position.Left) { base.right = '14px'; base.top = '50%'; base.transform = 'translateY(-50%)'; }
    if (position === Position.Right) { base.left = '14px'; base.top = '50%'; base.transform = 'translateY(-50%)'; }

    if (isExposed) {
        const tagColor = isInput ? '#10b981' : '#f59e0b';
        return (
            <div style={{ ...base, color: '#fff', fontSize: '9px', fontFamily: 'sans-serif', fontWeight: 'bold', background: tagColor, padding: '1px 4px', borderRadius: '3px', boxShadow: `0 1px 3px rgba(0,0,0,0.3)` }}>
                {isInput ? 'IN' : 'OUT'}
            </div>
        );
    }

    if (autoRoute) {
        return (
            <div style={{ ...base, color: '#fff', fontSize: '8px', fontWeight: 'bold', background: t.primaryHover || '#1d4ed8', padding: '1px 4px', borderRadius: '2px' }}>
                AUTO
            </div>
        );
    }

    if (tieoff) {
        return (
            <div style={{ ...base, background: t.bgTertiary, border: `1px solid ${t.borderStrong}`, color: t.textHeading, fontSize: '9px', fontFamily: 'monospace', padding: '1px 3px', borderRadius: '3px' }}>
                {tieoff}
            </div>
        );
    }

    return null;
};


import React, { useState, useEffect } from 'react';
import { Position } from '@xyflow/react';
import { IconInfo, IconX } from './icons'; // adjust path if needed

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

// 🔧 Convert to a proper component
export const InfoIcon = ({ id, data, t, setNodes }) => {
    const [showInfo, setShowInfo] = useState(false);
    const toggleInfo = (e) => { e.stopPropagation(); setShowInfo(!showInfo); };

    // Listen for global escape to close info
    useEffect(() => {
        if (data._closeInfoTrigger) {
            setShowInfo(false);
        }
    }, [data._closeInfoTrigger]);

    const updateDesc = (e) => {
        const val = e.target.value;
        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, description: val } } : n));
    };

    const defaultDesc = `Inputs:\n${(data.inputs || []).map(p => `  ${p.name}[${p.width - 1 === 0 ? 0 : p.width - 1}:0]`).join('\n')}\n\nOutputs:\n${(data.outputs || []).map(p => `  ${p.name}[${p.width - 1 === 0 ? 0 : p.width - 1}:0]`).join('\n')}\n\nRole:\n  Performs module logic.`;
    const currentDesc = data.description !== undefined ? data.description : defaultDesc;

    return (
        <div style={{ position: 'absolute', top: -10, right: -10, zIndex: 20 }}>
            <button onClick={toggleInfo} className="nodrag nopan" title="Module Description" style={{ background: t.bgSecondary, border: `1px solid ${data.theme === 'dark' ? '#727171' : '#000000'}`, borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.primary, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                <IconInfo size={14} />
            </button>
            {showInfo && (
                <div className="nodrag nopan" style={{ position: 'absolute', top: 28, right: 0, width: 220, background: t.bg, border: `1px solid ${t.borderStrong}`, background: data.theme === 'dark' ? '#0f4559' : '#826bbc', borderRadius: 6, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 30 }}>
                    <div style={{ fontSize: 11, fontFamily:'monospace', fontWeight: 600, color: t.textHeading, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color:'#fff' }}>
                        Add Module Description
                        <div onClick={toggleInfo} style={{ cursor: 'pointer', padding: '2px', display: 'flex' }}><IconX size={12} /></div>
                    </div>
                    <textarea value={currentDesc} onChange={updateDesc} style={{ width: '100%', height: 120, background: t.bgSecondary, color: t.text, border: `1px solid ${t.border}`, borderRadius: 4, fontSize: 11, padding: 6, resize: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                </div>
            )}
        </div>
    );
};
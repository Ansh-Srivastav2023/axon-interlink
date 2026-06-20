import { useState, useRef, useEffect } from "react";
import { IconInfo, IconX } from "./icons";

export const InfoIcon = ({ id, data, t, setNodes }) => {
    const [showInfo, setShowInfo] = useState(false);
    const toggleInfo = (e) => {
        e.stopPropagation();
        setShowInfo(!showInfo);
    };

    const lastTriggerRef = useRef(data._closeInfoTrigger);

    useEffect(() => {
        if (
            data._closeInfoTrigger !== lastTriggerRef.current &&
            showInfo
        ) {
            lastTriggerRef.current = data._closeInfoTrigger;
            setShowInfo(false);
        } else {
            lastTriggerRef.current = data._closeInfoTrigger;
        }
    }, [data._closeInfoTrigger, showInfo]);

    const updateDesc = (e) => {
        const val = e.target.value;
        setNodes(nds =>
            nds.map(n =>
                n.id === id
                    ? { ...n, data: { ...n.data, description: val } }
                    : n
            )
        );
    };

    const defaultDesc = `Inputs:\n${(data.inputs || [])
        .map(p => `  ${p.name}[${p.width - 1 === 0 ? 0 : p.width - 1}:0]`)
        .join('\n')}\n\nOutputs:\n${(data.outputs || [])
            .map(p => `  ${p.name}[${p.width - 1 === 0 ? 0 : p.width - 1}:0]`)
            .join('\n')}\n\nRole:\n  Performs module logic.`;
    const currentDesc = data.description !== undefined ? data.description : defaultDesc;

    return (
        <div style={{ position: 'absolute', top: -10, right: -10, zIndex: 20 }}>
            <button
                onClick={toggleInfo}
                className="nodrag nopan"
                title="Module Description"
                style={{
                    background: t.bgSecondary,
                    border: `1px solid ${data.theme === 'dark' ? '#727171' : '#000000'}`,
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: t.primary,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                <IconInfo size={14} />
            </button>
            {showInfo && (
                <div
                    className="nodrag nopan"
                    style={{
                        position: 'absolute',
                        top: 28,
                        right: 0,
                        width: 220,
                        background: data.theme === 'dark' ? '#0f4559' : '#826bbc',
                        borderRadius: 6,
                        padding: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        zIndex: 30
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            marginBottom: 6,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#fff'
                        }}
                    >
                        Add Module Description
                        <div
                            onClick={toggleInfo}
                            style={{ cursor: 'pointer', padding: '2px', display: 'flex' }}
                        >
                            <IconX size={12} />
                        </div>
                    </div>
                    <textarea
                        value={currentDesc}
                        onChange={updateDesc}
                        style={{
                            width: '100%',
                            height: 120,
                            background: t.bgSecondary,
                            color: t.text,
                            border: `1px solid ${t.border}`,
                            borderRadius: 4,
                            fontSize: 11,
                            padding: 6,
                            resize: 'none',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            )}
        </div>
    );
};
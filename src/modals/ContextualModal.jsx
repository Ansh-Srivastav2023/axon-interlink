import { IconBox, IconX, IconTrace } from '../styles/icons';
import { useState, useEffect } from 'react';

// ============================
// Constants
// ============================
const EDGE_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'];

// ============================
// ContextualModal Component
// ============================
const ContextualModal = ({
    activeModal,
    modalPos,
    nodes,
    edges,
    theme,
    t,
    s,
    exposedPorts,
    currentModuleCode,
    handleModalDragStart,
    setActiveModal,
    updateSelectedNode,
    togglePortSwap,
    toggleExposePort,
    handleCodeChange,       // kept for compatibility but no longer used for the main code editor
    getPortLabel,
    parsePorts,
    recordHistory,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setGlowingNet,
    highlightVerilogCode,
    onSaveCode              // NEW: callback to save code changes on Apply
}) => {
    const [fullCodeModalOpen, setFullCodeModalOpen] = useState(false);
    const [localCode, setLocalCode] = useState('');        // local copy of the code being edited

    // Reset local code when a new node modal is opened
    useEffect(() => {
        if (activeModal.type === 'node') {
            setLocalCode(currentModuleCode);
        }
    }, [activeModal, currentModuleCode]);

    if (!activeModal.type) return null;

    const isNode = activeModal.type === 'node';
    const targetId = activeModal.id;

    // ---------- Helpers ----------
    const closeModal = () => setActiveModal({ type: null, id: null });

    // ---------- KeyDown handler for code editors (uses localCode) ----------
    const handleKeyDown = (e) => {
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = localCode;  // use local state

        // Initialize historical stacks on the textarea DOM object if they don't exist yet
        if (!textarea._undoStack) textarea._undoStack = [];
        if (!textarea._redoStack) textarea._redoStack = [];

        // Helper function to update local state and preserve code text-history frames
        const updateLocalValueWithHistory = (oldVal, newVal, selectionPos) => {
            textarea._undoStack.push({ value: oldVal, start: start, end: end });
            textarea._redoStack = []; // Clear redo stack on new typing actions

            setLocalCode(newVal);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = selectionPos;
            }, 0);
        };

        // 1. HANDLE TAB KEY (Insert 2 spaces)
        if (e.key === 'Tab') {
            e.preventDefault();
            const tabSpaces = "  ";
            const newValue = currentValue.substring(0, start) + tabSpaces + currentValue.substring(end);
            updateLocalValueWithHistory(currentValue, newValue, start + tabSpaces.length);
            return;
        }

        // 2. HANDLE ENTER KEY (Smart Auto-Indentation)
        if (e.key === 'Enter') {
            e.preventDefault();
            const textBeforeCursor = currentValue.substring(0, start);
            const lineStartIndex = textBeforeCursor.lastIndexOf('\n') + 1;
            const currentLine = textBeforeCursor.substring(lineStartIndex);
            const whitespaceMatch = currentLine.match(/^([ \t]*)/);
            let indent = whitespaceMatch ? whitespaceMatch[1] : "";
            const cleanLine = currentLine.trim().toLowerCase();
            if (cleanLine.endsWith('(') || cleanLine.endsWith('begin') || cleanLine.endsWith('generate')) {
                indent += "  ";
            }
            const insertText = "\n" + indent;
            const newValue = currentValue.substring(0, start) + insertText + currentValue.substring(end);
            updateLocalValueWithHistory(currentValue, newValue, start + insertText.length);
            return;
        }

        // 3. CAPTURE CUSTOM HANDLED CTRL+Z / CTRL+Y INSIDE TEXTAREA
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            if (textarea._undoStack && textarea._undoStack.length > 0) {
                e.preventDefault();
                e.stopPropagation(); // Stops global schematic undo trigger interference

                const previousFrame = textarea._undoStack.pop();
                textarea._redoStack.push({ value: currentValue, start: start, end: end });

                setLocalCode(previousFrame.value);
                setTimeout(() => {
                    textarea.selectionStart = previousFrame.start;
                    textarea.selectionEnd = previousFrame.end;
                }, 0);
                return;
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            if (textarea._redoStack && textarea._redoStack.length > 0) {
                e.preventDefault();
                e.stopPropagation(); // Stops global schematic redo trigger interference

                const nextFrame = textarea._redoStack.pop();
                textarea._undoStack.push({ value: currentValue, start: start, end: end });

                setLocalCode(nextFrame.value);
                setTimeout(() => {
                    textarea.selectionStart = nextFrame.start;
                    textarea.selectionEnd = nextFrame.end;
                }, 0);
                return;
            }
        }
    };

    // ---------- Sub‑components ----------
    const ModalHeader = ({ title, icon, onClose }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            userSelect: 'none'
        }}>
            <h3 style={{
                margin: 0,
                fontSize: '17px',
                fontFamily: 'monospace',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme === 'dark' ? '#fff' : '#4400ff'
            }}>
                {icon} {title}
            </h3>
            <button onClick={onClose} style={{
                background: 'transparent',
                border: 'none',
                color: t.textSecondary,
                cursor: 'pointer'
            }}>
                <IconX size={16} />
            </button>
        </div>
    );

    // ---- Exposure Checklist (unchanged) ----
    const ExposureChecklist = ({ ports, isInput, nodeId, disabledCheck }) => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: t.bg,
            padding: '8px',
            borderRadius: '6px',
            border: `1px solid ${t.borderStrong}`
        }}>
            {ports.map(p => {
                const key = `${nodeId}__${p.name}`;
                const isWired = isInput
                    ? edges.some(e => e.target === nodeId && e.targetHandle === p.name)
                    : edges.some(e => e.source === nodeId && e.sourceHandle === p.name);
                const isAutoRouted = disabledCheck?.(p) || false;
                const disabled = isWired || isAutoRouted;
                return (
                    <label key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1
                    }}>
                        <input
                            type="checkbox"
                            checked={!!exposedPorts[key]}
                            onChange={() => toggleExposePort(nodeId, p.name, p, isInput)}
                            disabled={disabled}
                        />
                        Promote <code>{p.name}</code> to top {isWired && '(Wired)'}
                    </label>
                );
            })}
        </div>
    );

    // ---- Node content ----
    const renderNodeContent = () => {
        const node = nodes.find(n => n.id === targetId);
        if (!node) return null;
        const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);
        const currentPorts = node.data.isSplitter ? (node.data.outputs || []) : (node.data.inputs || []);

        const renderSplitterPanel = () => (
            <>
                <div style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: t.primary,
                    fontFamily: 'monospace',
                    background: t.bg,
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${t.border}`,
                    alignSelf: 'flex-start'
                }}>
                    Type: {node.data.isSplitter ? 'Bus Fracture Splitter' : 'Vector Merger Bundler'}
                </div>

                <div style={s.formGroup}>
                    <label style={s.label}>Number of Bit Slices (N)</label>
                    <input
                        type="number"
                        min="1"
                        max="16"
                        value={currentPorts.length}
                        style={{ ...s.input, width: '70px' }}
                        onChange={(e) => {
                            const count = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                            recordHistory();
                            const newPorts = Array.from({ length: count }, (_, i) => ({
                                name: node.data.isSplitter ? `out${i}` : `in${i}`,
                                width: 2,
                                msb: 1,
                                lsb: 0
                            }));
                            setNodes(nds => nds.map(n => n.id === targetId ? {
                                ...n,
                                data: {
                                    ...n.data,
                                    inputs: node.data.isSplitter ? [{ name: 'in', width: 8, msb: 7, lsb: 0 }] : newPorts,
                                    outputs: node.data.isSplitter ? newPorts : [{ name: 'out', width: 8, msb: 7, lsb: 0 }]
                                }
                            } : n));
                        }}
                    />
                </div>

                <div style={s.formGroup}>
                    <div style={{ fontSize: '15px', color: '#ffffff', marginBottom: '6px', fontFamily: 'monospace' }}>
                        {node.data.isSplitter ? 'Atmost 16 Outputs...' : 'Atmost 16 Inputs...'}
                    </div>
                    <div style={{ fontSize: '15px', color: '#06ffb4', marginBottom: '6px', fontFamily: 'monospace' }}>
                        {node.data.isSplitter ? 'Note:- outN...out0 -> [MSB...LSB]' : 'Note:- inN...in0 -> [MSB...LSB]'}
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
                                        style={{ ...s.input, flex: 1, padding: '4px 8px', fontSize: '12px' }}
                                        defaultValue={portLabel}
                                        placeholder="e.g. in[3:0]"
                                        onBlur={(e) => {
                                            const parsed = parsePorts(e.target.value);
                                            if (parsed && parsed.length > 0) {
                                                recordHistory();
                                                setNodes(nds => nds.map(n => {
                                                    if (n.id !== targetId) return n;
                                                    const updated = [...currentPorts];
                                                    updated[idx] = {
                                                        name: parsed[0].name,
                                                        width: parsed[0].width,
                                                        msb: parsed[0].msb,
                                                        lsb: parsed[0].lsb
                                                    };
                                                    return {
                                                        ...n,
                                                        data: {
                                                            ...n.data,
                                                            inputs: n.data.isSplitter ? n.data.inputs : updated,
                                                            outputs: n.data.isSplitter ? updated : n.data.outputs
                                                        }
                                                    };
                                                }));
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ ...s.formGroup, marginTop: '4px' }}>
                    <label style={s.label}>Top-Level I/O Exposure</label>
                    <ExposureChecklist
                        ports={currentPorts}
                        isInput={!node.data.isSplitter}
                        nodeId={node.id}
                        disabledCheck={() => false}
                    />
                </div>
            </>
        );

        const renderPropertiesPanel = () => (
            <>
                <div style={s.formGroup}>
                    <label style={s.label}>Module Type Name</label>
                    <input
                        style={s.input}
                        value={node.data.moduleName}
                        onChange={(e) => updateSelectedNode('moduleName', e.target.value)}
                    />
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Ports Input Vector String</label>
                    <input
                        style={s.input}
                        defaultValue={(node.data.inputs || []).map(p => getPortLabel(p)).join(', ')}
                        onBlur={(e) => updateSelectedNode('inputs', e.target.value)}
                    />
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Ports Output Vector String</label>
                    <input
                        style={s.input}
                        defaultValue={(node.data.outputs || []).map(p => getPortLabel(p)).join(', ')}
                        onBlur={(e) => updateSelectedNode('outputs', e.target.value)}
                    />
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Layout Symmetry Placement</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                togglePortSwap();
                                e.currentTarget.style.transform = "scale(0.95)";
                                setTimeout(() => {
                                    e.currentTarget.style.transform = "scale(1)";
                                }, 90);
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.primary;
                                e.currentTarget.style.color = "#fff";
                                e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,.25)";
                                e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = t.bgTertiary;
                                e.currentTarget.style.color = t.textHeading;
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                            style={{
                                ...s.smallBtn,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: `1px solid ${t.border}`,
                                background: t.bgTertiary,
                                color: t.textHeading,
                                fontWeight: 600,
                                transition: "all .18s ease",
                                cursor: "pointer",
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3l4 4-4 4" />
                                <path d="M3 7h18" />
                                <path d="M7 21l-4-4 4-4" />
                                <path d="M21 17H3" />
                            </svg>
                            Flip Ports
                        </button>

                        <button
                            type="button"
                            onClick={() => setFullCodeModalOpen(true)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.primary;
                                e.currentTarget.style.color = "#fff";
                                e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,.25)";
                                e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = t.bgTertiary;
                                e.currentTarget.style.color = t.textHeading;
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                            style={{
                                ...s.smallBtn,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: `1px solid ${t.border}`,
                                background: t.bgTertiary,
                                color: t.textHeading,
                                fontWeight: 600,
                                transition: "all .18s ease",
                                cursor: "pointer",
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 7h16" />
                                <path d="M4 12h12" />
                                <path d="M4 17h8" />
                            </svg>
                            Full Editor
                        </button>
                    </div>
                </div>
                <div style={s.formGroup}>
                    <label style={s.label}>Top-Level I/O Exposure</label>
                    <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600 }}>Inputs</div>
                    <ExposureChecklist
                        ports={node.data.inputs || []}
                        isInput={true}
                        nodeId={node.id}
                        disabledCheck={(p) => node.data.autoRoute?.[p.name] || false}
                    />
                    <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600, marginTop: '4px' }}>Outputs</div>
                    <ExposureChecklist
                        ports={node.data.outputs || []}
                        isInput={false}
                        nodeId={node.id}
                        disabledCheck={() => false}
                    />
                </div>
            </>
        );

        const renderFooter = () => (
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: `1px solid ${t.border}`,
                userSelect: 'none'
            }}>
                <button
                    onClick={(e) => {
                        e.currentTarget.style.transform = 'scale(0.94)';
                        setTimeout(() => {
                            recordHistory();
                            setNodes(n => n.filter(x => x.id !== targetId));
                            closeModal();
                            setSelectedNodeId(null);
                        }, 80);
                    }}
                    style={{
                        ...s.dangerBtn,
                        transition: 'transform 0.1s ease, background-color 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.danger}
                >
                    Purge Block
                </button>
                <button
                    onClick={(e) => {
                        e.currentTarget.style.transform = 'scale(0.94)';
                        // Apply code changes if this is a hardware node (not splitter/bundler)
                        const node = nodes.find(n => n.id === targetId);
                        if (node && !node.data.isSplitter && !node.data.isBundler) {
                            // Only save if code has changed (optional)
                            if (localCode !== currentModuleCode) {
                                onSaveCode(node.data.moduleName, localCode);
                            }
                        }
                        setTimeout(closeModal, 80);
                    }}
                    style={{
                        ...s.primaryBtn,
                        margin: 0,
                        padding: '6px 16px',
                        transition: 'transform 0.1s ease, background-color 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.primaryHover || '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.primary}
                >
                    Apply Changes
                </button>
            </div>
        );

        return (
            <>
                <ModalHeader
                    title={`Configure: ${node.data.moduleName}`}
                    icon={<IconBox size={20} />}
                    onClose={closeModal}
                />
                <div style={{
                    height: '320px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    scrollbarWidth: 'thin',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    scrollbarColor: theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6'
                }}>
                    {isSplitterOrBundler ? renderSplitterPanel() : renderPropertiesPanel()}
                </div>
                {renderFooter()}
            </>
        );
    };

    // ---- Edge content ----
    const renderEdgeContent = () => {
        const edge = edges.find(e => e.id === targetId);
        if (!edge) return null;

        return (
            <>
                <ModalHeader
                    title="Net Trace Metrics"
                    icon={<IconTrace size={20} />}
                    onClose={closeModal}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={s.formGroup}>
                        <label style={s.label}>Explicit Bus Width Constraint</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="number"
                                min="1"
                                max="128"
                                value={edge.data?.bitWidth || 1}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val > 0 && val <= 128) {
                                        recordHistory();
                                        setEdges(eds => eds.map(ed =>
                                            ed.id === targetId
                                                ? { ...ed, data: { ...ed.data, bitWidth: val } }
                                                : ed
                                        ));
                                    }
                                }}
                                style={{ ...s.input, width: '70px', padding: '6px', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: '12px', color: t.textSecondary }}>bits width array</span>
                        </div>
                        <span style={{ fontSize: '14px', color: theme === "dark" ? "#4b69ff" : "#174dff" }}> Note: Max <strong>Width</strong> possible is <strong>128</strong>. </span>
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Net Highlighter Schematic Tint</label>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            {EDGE_COLORS.map(color => (
                                <div
                                    key={color}
                                    onClick={() => {
                                        recordHistory();
                                        setEdges(eds => eds.map(e =>
                                            e.id === targetId
                                                ? { ...e, data: { ...e.data, color } }
                                                : e
                                        ));
                                    }}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: color,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        border: edge.data?.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '20px',
                    paddingTop: '10px',
                    borderTop: `1px solid ${t.border}`,
                    userSelect: 'none'
                }}>
                    <button
                        onClick={() => {
                            setEdges(eds => eds.filter(e => e.id !== targetId));
                            closeModal();
                            setGlowingNet(null);
                        }}
                        style={s.dangerBtn}
                    >
                        Purge Route
                    </button>
                    <button onClick={closeModal} style={{ ...s.primaryBtn, margin: 0, padding: '6px 16px' }}>
                        Confirm
                    </button>
                </div>
            </>
        );
    };

    // ============================
    // Full‑size Code Editor Modal (uses localCode)
    // ============================
    const renderFullCodeModal = () => {
        if (!fullCodeModalOpen) return null;

        const handleBackdropClick = (e) => {
            if (e.target === e.currentTarget) {
                setFullCodeModalOpen(false);
            }
        };

        const handleKeyDownOnModal = (e) => {
            if (e.key === 'Escape') {
                setFullCodeModalOpen(false);
            }
        };

        return (
            <div
                onClick={handleBackdropClick}
                onKeyDown={handleKeyDownOnModal}
                tabIndex={-1}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                }}
            >
                <div
                    style={{
                        width: '70vw',
                        height: '70vh',
                        background: t.bgSecondary,
                        borderRadius: '30px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                        border: "4px solid transparent",
                        backgroundImage: `linear-gradient(${t.bgSecondary}, ${t.bgSecondary}), linear-gradient(90deg, #c1067d, #4800ff)`,
                        backgroundOrigin: "border-box",
                        backgroundClip: "padding-box, border-box",
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: theme === 'dark' ? '#fff' : '#4400ff',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
                                </svg>
                                RTL Code Editor – Full View
                            </span>
                        </h3>
                        <button
                            onClick={() => setFullCodeModalOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: t.textSecondary,
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <IconX size={20} />
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        borderRadius: '8px',
                        overflow: 'auto',
                        background: t.codeBg,
                        border: `1px solid ${t.borderStrong}`,
                        width: '100%',
                        scrollbarWidth: 'thin',
                        scrollbarColor: theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6',
                        boxSizing: 'border-box',
                        minHeight: 0,
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gridTemplateRows: 'auto',
                            width: 'max-content',
                            minWidth: '100%',
                            height: '100%',
                        }}>
                            <pre
                                style={{
                                    gridArea: '1/1',
                                    margin: 0,
                                    padding: '16px',
                                    fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre',
                                    wordBreak: 'normal',
                                    background: 'transparent',
                                    color: 'inherit',
                                    pointerEvents: 'none',
                                    width: 'max-content',
                                    minWidth: '100%',
                                }}
                                dangerouslySetInnerHTML={{ __html: highlightVerilogCode(localCode + '\n', theme) }}
                            />
                            <textarea
                                value={localCode}
                                onChange={(e) => setLocalCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck="false"
                                wrap="off"
                                style={{
                                    gridArea: '1/1',
                                    margin: 0,
                                    padding: '16px',
                                    fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    background: 'transparent',
                                    color: 'transparent',
                                    caretColor: theme === 'dark' ? '#ffffff' : '#111827',
                                    whiteSpace: 'pre',
                                    wordBreak: 'normal',
                                    resize: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    width: 'max-content',
                                    minWidth: '100%',
                                    height: '100%',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${t.border}`,
                    }}>
                        <button
                            onClick={() => setFullCodeModalOpen(false)}
                            style={{
                                ...s.smallBtn,
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: `1px solid ${t.border}`,
                                background: t.bgTertiary,
                                color: t.text,
                                fontWeight: 600,
                            }}
                        >
                            Close
                        </button>
                        <button
                            onClick={() => setFullCodeModalOpen(false)}
                            style={{
                                ...s.primaryBtn,
                                padding: '8px 24px',
                                borderRadius: '8px',
                                background: t.primary,
                                color: '#fff',
                                border: 'none',
                                fontWeight: 600,
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ============================
    // Main render
    // ============================
    const modalStyle = {
        position: 'fixed',
        top: `${modalPos.y}px`,
        left: `${modalPos.x}px`,
        zIndex: 99999,
        background: t.bgSecondary,
        color: t.textHeading,
        cursor: 'grab',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '520px'
    };

    if (isNode) {
        const node = nodes.find(n => n.id === targetId);
        if (!node) return null;
        return (
            <>
                <div
                    onMouseDown={handleModalDragStart}
                    style={{
                        ...modalStyle,
                        width: '480px',
                        border: `4px solid ${theme === 'dark' ? "rgba(0, 27, 233, 0.87)" : "rgba(255, 1, 1, 0.87)"}`,
                        boxShadow: theme === 'dark' ? `0 20px 40px rgba(0,0,0,0.6)` : '0 20px 40px rgba(0,0,0,0.15)'
                    }}
                >
                    {renderNodeContent()}
                </div>
                {renderFullCodeModal()}
            </>
        );
    } else {
        const edge = edges.find(e => e.id === targetId);
        if (!edge) return null;
        return (
            <div
                onMouseDown={handleModalDragStart}
                style={{
                    ...modalStyle,
                    width: '360px',
                    border: `4px solid ${theme === 'dark' ? "rgba(0, 27, 233, 0.87)" : "rgba(255, 1, 1, 0.87)"}`,
                    boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.15)'
                }}
            >
                {renderEdgeContent()}
            </div>
        );
    }
};

export default ContextualModal;
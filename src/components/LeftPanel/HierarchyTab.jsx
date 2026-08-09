import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCodeModal from '../../modals/ContextualModal/FullCodeModal';
import { highlightVerilogCode } from '../../verilog-code/verilogEdits';
import { IconBox, IconCode, IconFolder, IconSave, IconTrash } from '../../styles';
import { getCanvasSummaries } from '../../utils/projectModel';

const toolbarButtonStyle = (t) => ({
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '5px',
    background: 'transparent',
    color: t.textSecondary,
    cursor: 'pointer',
    padding: 0,
});

const ToolbarIconButton = ({ title, onClick, disabled = false, children, t, wide = false }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        style={{
            ...toolbarButtonStyle(t),
            width: wide ? 'auto' : '28px',
            padding: wide ? '0 7px' : 0,
            gap: wide ? '4px' : 0,
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? 'default' : 'pointer',
        }}
        onMouseEnter={(event) => {
            if (disabled) return;
            event.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            event.currentTarget.style.color = t.textHeading;
        }}
        onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
            event.currentTarget.style.color = t.textSecondary;
        }}
    >
        {children}
    </button>
);

const IconPlus = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
);

const getCanvasNodes = (projectModel, canvas, liveNodes) => {
    if (canvas?.isActive) return liveNodes || [];
    return projectModel?.canvases?.[canvas?.id]?.nodes || [];
};

const buildModuleFiles = (canvasNodes = []) => {
    const seen = new Map();
    canvasNodes.forEach((node) => {
        if (!node?.data?.moduleName) return;
        if (node.data.isSplitter || node.data.isBundler) return;

        const moduleName = node.data.moduleName;
        if (!seen.has(moduleName)) {
            seen.set(moduleName, {
                moduleName,
                nodeId: node.id,
                node,
                instances: 1,
            });
        } else {
            seen.get(moduleName).instances += 1;
        }
    });
    return Array.from(seen.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
};

const HierarchyTab = ({
    theme,
    t,
    s,
    projectModel,
    nodes,
    edges,
    customCodes,
    getModuleCode,
    onSaveCode,
    jumpToNode,
    onImportVerilogFiles,
    importStatus,
    onDeleteModuleFile,
    onCreateCanvas,
    onOpenCanvas,
    onInstantiateCanvas,
    onPromoteCurrentCanvas,
    onDeleteCanvas,
}) => {
    const importInputRef = useRef(null);
    const didAutoExpandRef = useRef(false);
    const [expandedCanvasId, setExpandedCanvasId] = useState(null);
    const [activeFile, setActiveFile] = useState(null);
    const [editorCode, setEditorCode] = useState('');
    const [dirty, setDirty] = useState(false);
    const activeCanvasId = activeFile?.canvasId || null;
    const activeModuleName = activeFile?.moduleName || null;

    const canvasSummaries = useMemo(() => getCanvasSummaries(projectModel), [projectModel]);
    const activeSummary = canvasSummaries.find((canvas) => canvas.isActive);
    const inactiveCanvases = canvasSummaries.filter((canvas) => !canvas.isActive);

    const moduleFilesByCanvas = useMemo(() => {
        const next = {};
        canvasSummaries.forEach((canvas) => {
            next[canvas.id] = buildModuleFiles(getCanvasNodes(projectModel, canvas, nodes));
        });
        return next;
    }, [canvasSummaries, nodes, projectModel]);

    const activeFileDetails = useMemo(() => {
        if (!activeCanvasId || !activeModuleName) return null;
        return moduleFilesByCanvas[activeCanvasId]?.find((file) => file.moduleName === activeModuleName) || null;
    }, [activeCanvasId, activeModuleName, moduleFilesByCanvas]);

    const getFileCode = useCallback((file) => {
        if (!file?.moduleName) return '';
        if (customCodes?.[file.moduleName] !== undefined) return customCodes[file.moduleName];
        return getModuleCode(file.node);
    }, [customCodes, getModuleCode]);

    useEffect(() => {
        if (canvasSummaries.length === 0) {
            didAutoExpandRef.current = false;
            if (expandedCanvasId === null) return undefined;
            let cancelled = false;
            queueMicrotask(() => {
                if (!cancelled) setExpandedCanvasId(null);
            });
            return () => {
                cancelled = true;
            };
        }

        if (expandedCanvasId && canvasSummaries.some((canvas) => canvas.id === expandedCanvasId)) return undefined;
        if (expandedCanvasId === null && didAutoExpandRef.current) return undefined;

        didAutoExpandRef.current = true;
        let cancelled = false;
        const nextCanvasId = activeSummary?.id || canvasSummaries[0]?.id || null;
        queueMicrotask(() => {
            if (!cancelled) setExpandedCanvasId(nextCanvasId);
        });
        return () => {
            cancelled = true;
        };
    }, [activeSummary?.id, canvasSummaries, expandedCanvasId]);

    useEffect(() => {
        if (!activeFile) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            if (!activeFileDetails) {
                setActiveFile(null);
                setEditorCode('');
                setDirty(false);
                return;
            }
            if (!dirty) setEditorCode(getFileCode(activeFileDetails));
        });
        return () => {
            cancelled = true;
        };
    }, [activeFile, activeFileDetails, dirty, getFileCode]);

    const createCanvas = () => {
        const canvasName = window.prompt('New canvas/module name', 'uart_top');
        if (canvasName === null) return;
        onCreateCanvas(canvasName);
    };

    const promoteCurrent = () => {
        const moduleName = window.prompt('Save current canvas as module', activeSummary?.moduleName || 'top_module');
        if (moduleName === null) return;
        onPromoteCurrentCanvas(moduleName);
    };

    const handleImportChange = (event) => {
        const files = event.target.files;
        if (files?.length) onImportVerilogFiles(files);
        event.target.value = '';
    };

    const openFile = (file, canvas) => {
        setActiveFile({
            canvasId: canvas.id,
            canvasIsActive: canvas.isActive,
            moduleName: file.moduleName,
            nodeId: file.nodeId,
        });
        setEditorCode(getFileCode(file));
        setDirty(false);
    };

    const closeEditor = (isOpen) => {
        if (!isOpen) setActiveFile(null);
    };

    const saveActiveFile = () => {
        const file = activeFileDetails || activeFile;
        if (!file) return;
        onSaveCode(file.nodeId, file.moduleName, editorCode);
        setDirty(false);
    };

    const deleteCanvas = (canvas) => {
        if (canvasSummaries.length <= 1) return;
        const confirmed = window.confirm(
            `Delete canvas ${canvas.moduleName}? Instances of this canvas module will also be removed from other canvases.`
        );
        if (!confirmed) return;
        onDeleteCanvas(canvas.id);
    };

    const deleteFile = (file, canvas) => {
        if (!canvas.isActive) return;
        const confirmed = window.confirm(
            `Delete ${file.moduleName}.v and remove ${file.instances} canvas instance${file.instances === 1 ? '' : 's'}?`
        );
        if (!confirmed) return;
        if (activeFile?.moduleName === file.moduleName) {
            setActiveFile(null);
            setEditorCode('');
            setDirty(false);
        }
        onDeleteModuleFile(file.moduleName);
    };

    return (
        <div style={{ overflowY: 'auto', flex: 1 }}>
            <div
                style={{
                    height: '36px',
                    padding: '0 8px 0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${t.border}`,
                    background: t.bgSecondary,
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        minWidth: 0,
                        color: t.textHeading,
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase',
                    }}
                >
                    <IconBox size={14} />
                    Project
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <ToolbarIconButton title="Import RTL Files" onClick={() => importInputRef.current?.click()} t={t}>
                        <IconFolder size={14} />
                    </ToolbarIconButton>
                    <ToolbarIconButton title="New Canvas" onClick={createCanvas} t={t}>
                        <IconPlus size={14} />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                        title="Save Current Canvas as Module"
                        onClick={promoteCurrent}
                        disabled={nodes.length === 0 && edges.length === 0}
                        t={t}
                    >
                        <IconSave size={14} />
                    </ToolbarIconButton>
                </div>
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".v,.sv,.vh"
                    multiple
                    onChange={handleImportChange}
                    style={{ display: 'none' }}
                />
            </div>

            {importStatus && (
                <div
                    style={{
                        margin: '10px 12px 0',
                        padding: '7px 9px',
                        borderRadius: '6px',
                        border: `1px solid ${importStatus.type === 'warning' ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.28)'}`,
                        background: importStatus.type === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                        color: importStatus.type === 'warning' ? '#f59e0b' : '#10b981',
                        fontSize: '11px',
                        lineHeight: 1.45,
                    }}
                >
                    {importStatus.message}
                </div>
            )}

            <div style={{ padding: '10px 8px 14px' }}>
                <div
                    style={{
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 6px',
                        color: t.textSecondary,
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase',
                    }}
                >
                    Explorer
                </div>
                {canvasSummaries.length === 0 ? (
                    <div style={s.emptyState}>No project canvases yet.</div>
                ) : (
                    <div style={{ display: 'grid', gap: '7px' }}>
                        {canvasSummaries.map((canvas) => {
                            const isActive = canvas.isActive;
                            const isExpanded = expandedCanvasId === canvas.id;
                            const moduleFiles = moduleFilesByCanvas[canvas.id] || [];

                            return (
                                <div
                                    key={canvas.id}
                                    onClick={(event) => {
                                        if (event.target.closest('button')) return;
                                        setExpandedCanvasId(isExpanded ? null : canvas.id);
                                    }}
                                    style={{
                                        border: `1px solid ${isActive ? 'rgba(59,130,246,0.45)' : t.border}`,
                                        background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ color: t.textHeading, fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {isExpanded ? 'v' : '>'} {canvas.moduleName}
                                            </div>
                                            <div style={{ color: t.textMuted, fontSize: '10px', marginTop: '3px' }}>
                                                {canvas.nodeCount} blocks - {canvas.edgeCount} links - {canvas.exposedPortCount} ports
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <ToolbarIconButton
                                                title={isActive ? 'Canvas already open' : 'Open Canvas'}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onOpenCanvas(canvas.id);
                                                }}
                                                disabled={isActive}
                                                t={t}
                                                wide
                                            >
                                                <span style={{ fontSize: '10px', fontWeight: 900, color: isActive ? '#3b82f6' : '#10b981' }}>
                                                    {isActive ? 'ACTIVE' : 'OPEN'}
                                                </span>
                                            </ToolbarIconButton>
                                            <ToolbarIconButton
                                                title={isActive ? 'Cannot instantiate active canvas here' : 'Instantiate Canvas Here'}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onInstantiateCanvas(canvas.id);
                                                }}
                                                disabled={isActive || inactiveCanvases.length === 0}
                                                t={t}
                                                wide={!isActive}
                                            >
                                                <IconPlus size={13} />
                                                {!isActive && (
                                                    <span style={{ fontSize: '10px', fontWeight: 800 }}>
                                                        Inst
                                                    </span>
                                                )}
                                            </ToolbarIconButton>
                                            <ToolbarIconButton
                                                title={canvasSummaries.length <= 1 ? 'At least one canvas must remain' : `Delete ${canvas.moduleName}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    deleteCanvas(canvas);
                                                }}
                                                disabled={canvasSummaries.length <= 1}
                                                t={t}
                                            >
                                                <IconTrash size={13} />
                                            </ToolbarIconButton>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
                                            {moduleFiles.length === 0 ? (
                                                <div style={{ ...s.emptyState, padding: '14px 10px' }}>
                                                    No module blocks in this canvas.
                                                </div>
                                            ) : (
                                                moduleFiles.map((file) => {
                                                    const code = customCodes?.[file.moduleName] ?? getModuleCode(file.node);
                                                    const lineCount = code ? code.split('\n').length : 0;
                                                    const isOpen = activeFile?.canvasId === canvas.id && activeFile?.moduleName === file.moduleName;

                                                    return (
                                                        <button
                                                            key={`${canvas.id}_${file.moduleName}`}
                                                            type="button"
                                                            onClick={() => openFile(file, canvas)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: '8px',
                                                                width: '100%',
                                                                textAlign: 'left',
                                                                padding: '9px 10px',
                                                                borderRadius: '7px',
                                                                cursor: 'pointer',
                                                                background: isOpen ? 'rgba(59,130,246,0.16)' : 'rgba(0,0,0,0.10)',
                                                                border: `1px solid ${isOpen ? 'rgba(59,130,246,0.42)' : t.border}`,
                                                                color: t.textHeading,
                                                            }}
                                                        >
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                <IconCode size={14} />
                                                                <span style={{ minWidth: 0 }}>
                                                                    <span style={{ display: 'block', fontFamily: '"SF Mono", Menlo, Monaco, monospace', fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {file.moduleName}.v
                                                                    </span>
                                                                    <span style={{ display: 'block', marginTop: '2px', fontSize: '10px', color: t.textMuted }}>
                                                                        {file.instances} instance{file.instances !== 1 ? 's' : ''} - {lineCount} lines
                                                                    </span>
                                                                </span>
                                                            </span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                <span
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        if (canvas.isActive) jumpToNode(file.node);
                                                                        else onOpenCanvas(canvas.id);
                                                                    }}
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        color: canvas.isActive ? '#10b981' : '#3b82f6',
                                                                        border: `1px solid ${canvas.isActive ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.28)'}`,
                                                                        borderRadius: '4px',
                                                                        padding: '2px 6px',
                                                                        background: canvas.isActive ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.10)',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    {canvas.isActive ? 'Jump' : 'Open'}
                                                                </span>
                                                                <span
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        deleteFile(file, canvas);
                                                                    }}
                                                                    title={canvas.isActive ? `Delete ${file.moduleName}.v` : 'Open this canvas before deleting a module file'}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '22px',
                                                                        height: '22px',
                                                                        color: canvas.isActive ? '#ef4444' : t.textMuted,
                                                                        border: `1px solid ${canvas.isActive ? 'rgba(239,68,68,0.28)' : t.border}`,
                                                                        borderRadius: '5px',
                                                                        background: canvas.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                                                                        cursor: canvas.isActive ? 'pointer' : 'default',
                                                                    }}
                                                                >
                                                                    <IconTrash size={12} />
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ padding: '0 14px 14px', color: t.textMuted, fontSize: '10px', lineHeight: 1.5 }}>
                Tip: click a canvas row to show its blocks and RTL files. Open a file to edit its module code.
            </div>

            <FullCodeModal
                fullCodeModalOpen={!!activeFile}
                setFullCodeModalOpen={closeEditor}
                localCode={editorCode}
                setLocalCode={(nextCode) => {
                    setEditorCode(nextCode);
                    setDirty(true);
                }}
                t={t}
                theme={theme}
                highlightVerilogCode={highlightVerilogCode}
                editorTitle={activeFile ? `${activeFile.moduleName}.v` : 'Verilog IDE'}
                onSave={saveActiveFile}
                saveLabel={dirty ? 'Save RTL' : 'Saved'}
                saveDisabled={!dirty}
                hasUnsavedChanges={dirty}
            />
        </div>
    );
};

export default HierarchyTab;

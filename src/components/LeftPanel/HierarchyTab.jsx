import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCodeModal from '../../modals/ContextualModal/FullCodeModal';
import { highlightVerilogCode } from '../../verilog-code/verilogEdits';
import { IconBox, IconCode, IconFolder, IconSearch, IconTrash } from '../../styles';
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

const IconPencil = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
);

const IconDotsVertical = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
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
    customCodes,
    getModuleCode,
    onSaveCode,
    jumpToNode,
    onImportVerilogFiles,
    importStatus,
    onDeleteModuleFile,
    onCreateCanvas,
    onCreateChildCanvas,
    onOpenCanvas,
    onInstantiateCanvas,
    onDeleteCanvas,
    onRenameCanvas,
}) => {
    const importInputRef = useRef(null);
    const pendingImportCanvasIdRef = useRef(null);
    const nameInputRef = useRef(null);
    const canvasSearchInputRef = useRef(null);
    const didAutoExpandRef = useRef(false);
    const [expandedCanvasId, setExpandedCanvasId] = useState(null);
    const [activeFile, setActiveFile] = useState(null);
    const [editorCode, setEditorCode] = useState('');
    const [dirty, setDirty] = useState(false);
    const [inlineNameAction, setInlineNameAction] = useState(null);
    const [inlineNameValue, setInlineNameValue] = useState('');
    const [canvasSearchOpen, setCanvasSearchOpen] = useState(false);
    const [canvasSearchQuery, setCanvasSearchQuery] = useState('');
    const [rowMenuCanvasId, setRowMenuCanvasId] = useState(null);
    const activeCanvasId = activeFile?.canvasId || null;
    const activeModuleName = activeFile?.moduleName || null;

    const canvasSummaries = useMemo(() => getCanvasSummaries(projectModel), [projectModel]);
    const activeSummary = canvasSummaries.find((canvas) => canvas.isActive);
    const filteredCanvasSummaries = useMemo(() => {
        const query = canvasSearchQuery.trim().toLowerCase();
        if (!query) return canvasSummaries;
        return canvasSummaries.filter((canvas) =>
            [canvas.moduleName, canvas.name, canvas.id]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [canvasSearchQuery, canvasSummaries]);

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

    useEffect(() => {
        if (!inlineNameAction) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        });
        return () => {
            cancelled = true;
        };
    }, [inlineNameAction]);

    useEffect(() => {
        if (!canvasSearchOpen) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) canvasSearchInputRef.current?.focus();
        });
        return () => {
            cancelled = true;
        };
    }, [canvasSearchOpen]);

    useEffect(() => {
        if (!rowMenuCanvasId) return undefined;
        const closeMenu = () => setRowMenuCanvasId(null);
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') closeMenu();
        };
        window.addEventListener('click', closeMenu);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [rowMenuCanvasId]);

    const cancelInlineNameEdit = () => {
        setInlineNameAction(null);
        setInlineNameValue('');
    };

    const beginInlineNameEdit = (actionConfig) => {
        setInlineNameValue(actionConfig.initialValue || '');
        setInlineNameAction(actionConfig);
        if (actionConfig.canvasId) setExpandedCanvasId(actionConfig.canvasId);
    };

    const submitInlineNameEdit = () => {
        const nextName = inlineNameValue.trim();
        if (!inlineNameAction || !nextName) {
            cancelInlineNameEdit();
            return;
        }
        inlineNameAction.onSubmit(nextName);
        cancelInlineNameEdit();
    };

    const createCanvas = () => {
        beginInlineNameEdit({
            mode: 'create',
            initialValue: 'uart_top',
            placeholder: 'uart_top',
            onSubmit: onCreateCanvas,
        });
    };

    const createChildCanvas = (canvas) => {
        beginInlineNameEdit({
            mode: 'create-child',
            canvasId: canvas.id,
            initialValue: `${canvas.moduleName}_sub`,
            placeholder: `${canvas.moduleName}_sub`,
            onSubmit: (nextName) => onCreateChildCanvas(canvas.id, nextName),
        });
    };

    const handleImportChange = (event) => {
        const files = event.target.files;
        const targetCanvasId = pendingImportCanvasIdRef.current;
        pendingImportCanvasIdRef.current = null;
        if (files?.length) onImportVerilogFiles(files, targetCanvasId);
        event.target.value = '';
    };

    const importRtlIntoCanvas = (canvas) => {
        pendingImportCanvasIdRef.current = canvas.id;
        importInputRef.current?.click();
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

    const renameCanvas = (canvas) => {
        beginInlineNameEdit({
            mode: 'rename',
            canvasId: canvas.id,
            initialValue: canvas.moduleName,
            placeholder: canvas.moduleName,
            onSubmit: (nextName) => onRenameCanvas(canvas.id, nextName),
        });
    };

    const handleInlineNameKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitInlineNameEdit();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelInlineNameEdit();
        }
    };

    const inlineInput = (placeholder = 'module_name') => (
        <input
            ref={nameInputRef}
            value={inlineNameValue}
            onChange={(event) => setInlineNameValue(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleInlineNameKeyDown}
            onBlur={cancelInlineNameEdit}
            placeholder={placeholder}
            spellCheck={false}
            title="Enter to confirm, Escape to cancel"
            style={{
                width: '100%',
                boxSizing: 'border-box',
                height: '24px',
                border: `1px solid ${t.primary || '#3b82f6'}`,
                borderRadius: '4px',
                outline: 'none',
                background: theme === 'dark' ? '#050505' : '#ffffff',
                color: t.textHeading,
                padding: '0 7px',
                fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
                fontSize: '12px',
                fontWeight: 800,
            }}
        />
    );

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

    const menuItemStyle = ({ danger = false, disabled = false } = {}) => ({
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: 'none',
        background: 'transparent',
        color: disabled ? t.textMuted : danger ? '#ef4444' : t.textHeading,
        cursor: disabled ? 'default' : 'pointer',
        padding: '8px 10px',
        fontSize: '12px',
        fontWeight: 650,
        textAlign: 'left',
        opacity: disabled ? 0.48 : 1,
    });

    const menuIconStyle = {
        width: '16px',
        display: 'inline-flex',
        justifyContent: 'center',
        flexShrink: 0,
    };

    const runMenuAction = (event, action) => {
        event.stopPropagation();
        setRowMenuCanvasId(null);
        action();
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
                    <ToolbarIconButton
                        title={canvasSearchOpen ? 'Close Canvas Search' : 'Search Canvases'}
                        onClick={() => {
                            setCanvasSearchOpen((current) => {
                                const next = !current;
                                if (!next) setCanvasSearchQuery('');
                                return next;
                            });
                        }}
                        t={t}
                    >
                        <IconSearch size={14} />
                    </ToolbarIconButton>
                    <ToolbarIconButton title="New Canvas" onClick={createCanvas} t={t}>
                        <IconPlus size={14} />
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

            {canvasSearchOpen && (
                <div style={{ padding: '9px 12px 0' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            ref={canvasSearchInputRef}
                            value={canvasSearchQuery}
                            onChange={(event) => setCanvasSearchQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setCanvasSearchQuery('');
                                    setCanvasSearchOpen(false);
                                }
                            }}
                            placeholder="Search canvas..."
                            spellCheck={false}
                            style={{
                                ...s.input,
                                width: '100%',
                                height: '28px',
                                boxSizing: 'border-box',
                                padding: '0 28px 0 28px',
                                borderRadius: '5px',
                                border: `1px solid ${t.borderStrong || t.border}`,
                                background: theme === 'dark' ? '#050505' : '#ffffff',
                                color: t.textHeading,
                                fontSize: '12px',
                            }}
                        />
                        <span style={{ position: 'absolute', left: '9px', display: 'inline-flex', color: t.textMuted, pointerEvents: 'none' }}>
                            <IconSearch size={13} />
                        </span>
                        {canvasSearchQuery && (
                            <button
                                type="button"
                                title="Clear search"
                                onClick={() => setCanvasSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '4px',
                                    width: '22px',
                                    height: '22px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    color: t.textMuted,
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    lineHeight: '20px',
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '10px', color: t.textMuted }}>
                        {canvasSearchQuery.trim()
                            ? `${filteredCanvasSummaries.length}/${canvasSummaries.length} canvases`
                            : `${canvasSummaries.length} canvases`}
                    </div>
                </div>
            )}

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
                {canvasSummaries.length === 0 && inlineNameAction?.mode !== 'create' ? (
                    <div style={s.emptyState}>No project canvases yet.</div>
                ) : (
                    <div style={{ display: 'grid', gap: '7px' }}>
                        {inlineNameAction?.mode === 'create' && (
                            <div
                                style={{
                                    border: `1px dashed ${t.primary || '#3b82f6'}`,
                                    background: 'rgba(59,130,246,0.08)',
                                    borderRadius: '8px',
                                    padding: '9px 10px',
                                    cursor: 'default',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <span style={{ color: t.textMuted, fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                                        &gt;
                                    </span>
                                    {inlineInput(inlineNameAction.placeholder)}
                                </div>
                                <div style={{ color: t.textMuted, fontSize: '10px', marginTop: '5px', paddingLeft: '18px' }}>
                                    Enter to create. Escape or click away to cancel.
                                </div>
                            </div>
                        )}
                        {filteredCanvasSummaries.length === 0 && inlineNameAction?.mode !== 'create' && (
                            <div style={{ ...s.emptyState, padding: '18px 10px' }}>
                                No canvases match “{canvasSearchQuery.trim()}”.
                            </div>
                        )}
                        {filteredCanvasSummaries.map((canvas) => {
                            const isActive = canvas.isActive;
                            const isExpanded = expandedCanvasId === canvas.id;
                            const moduleFiles = moduleFilesByCanvas[canvas.id] || [];
                            const isInlineEditingThisCanvas =
                                inlineNameAction?.canvasId === canvas.id &&
                                (inlineNameAction.mode === 'rename' || inlineNameAction.mode === 'promote');
                            const isCreatingChildHere =
                                inlineNameAction?.canvasId === canvas.id &&
                                inlineNameAction.mode === 'create-child';

                            return (
                                <div
                                    key={canvas.id}
                                    onClick={(event) => {
                                        if (event.target.closest('button, input')) return;
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
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            {isInlineEditingThisCanvas ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <span style={{ color: t.textMuted, fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                                                        {isExpanded ? 'v' : '>'}
                                                    </span>
                                                    {inlineInput(inlineNameAction.placeholder)}
                                                </div>
                                            ) : (
                                                <div style={{ color: t.textHeading, fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {isExpanded ? 'v' : '>'} {canvas.moduleName}
                                                </div>
                                            )}
                                            <div style={{ color: t.textMuted, fontSize: '10px', marginTop: '3px' }}>
                                                {isInlineEditingThisCanvas
                                                    ? 'Enter to confirm. Escape or click away to cancel.'
                                                    : `${canvas.nodeCount} blocks - ${canvas.edgeCount} links - ${canvas.exposedPortCount} ports`}
                                            </div>
                                        </div>
                                        <div
                                            onClick={(event) => event.stopPropagation()}
                                            style={{ display: isInlineEditingThisCanvas ? 'none' : 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, position: 'relative' }}
                                        >
                                            {isActive && (
                                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6' }}>
                                                    ACTIVE
                                                </span>
                                            )}
                                            <ToolbarIconButton
                                                title={`Canvas actions for ${canvas.moduleName}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setRowMenuCanvasId((current) => (current === canvas.id ? null : canvas.id));
                                                }}
                                                t={t}
                                            >
                                                <IconDotsVertical size={15} />
                                            </ToolbarIconButton>
                                            {rowMenuCanvasId === canvas.id && (
                                                <div
                                                    onClick={(event) => event.stopPropagation()}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '30px',
                                                        right: 0,
                                                        minWidth: '170px',
                                                        padding: '5px 0',
                                                        border: `1px solid ${t.borderStrong || t.border}`,
                                                        borderRadius: '8px',
                                                        background: t.bgSecondary,
                                                        boxShadow: theme === 'dark'
                                                            ? '0 14px 32px rgba(0,0,0,0.45)'
                                                            : '0 14px 32px rgba(15,23,42,0.16)',
                                                        zIndex: 80,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={isActive}
                                                        onClick={(event) => runMenuAction(event, () => onOpenCanvas(canvas.id))}
                                                        style={menuItemStyle({ disabled: isActive })}
                                                        onMouseEnter={(event) => {
                                                            if (!isActive) event.currentTarget.style.background = 'rgba(148,163,184,0.12)';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            event.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={menuIconStyle}>↗</span>
                                                        {isActive ? 'Already Active' : 'Open Canvas'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => runMenuAction(event, () => importRtlIntoCanvas(canvas))}
                                                        style={menuItemStyle()}
                                                        onMouseEnter={(event) => {
                                                            event.currentTarget.style.background = 'rgba(148,163,184,0.12)';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            event.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={menuIconStyle}><IconFolder size={13} /></span>
                                                        Add RTL Files
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!onCreateChildCanvas}
                                                        onClick={(event) => runMenuAction(event, () => createChildCanvas(canvas))}
                                                        style={menuItemStyle({ disabled: !onCreateChildCanvas })}
                                                        onMouseEnter={(event) => {
                                                            if (onCreateChildCanvas) event.currentTarget.style.background = 'rgba(148,163,184,0.12)';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            event.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={menuIconStyle}><IconPlus size={13} /></span>
                                                        New Child Sub-module
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!onRenameCanvas}
                                                        onClick={(event) => runMenuAction(event, () => renameCanvas(canvas))}
                                                        style={menuItemStyle({ disabled: !onRenameCanvas })}
                                                        onMouseEnter={(event) => {
                                                            if (onRenameCanvas) event.currentTarget.style.background = 'rgba(148,163,184,0.12)';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            event.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={menuIconStyle}><IconPencil size={13} /></span>
                                                        Rename
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isActive}
                                                        onClick={(event) => runMenuAction(event, () => onInstantiateCanvas(canvas.id))}
                                                        style={menuItemStyle({ disabled: isActive })}
                                                        onMouseEnter={(event) => {
                                                            if (!isActive) event.currentTarget.style.background = 'rgba(148,163,184,0.12)';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            event.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={menuIconStyle}><IconPlus size={13} /></span>
                                                        Instantiate Here
                                                    </button>
                                                    <div style={{ height: '1px', margin: '4px 0', background: t.border }} />
                                                    <button
                                                        type="button"
                                                        disabled={canvasSummaries.length <= 1}
                                                        onClick={(event) => runMenuAction(event, () => deleteCanvas(canvas))}
                                                        style={menuItemStyle({ danger: true, disabled: canvasSummaries.length <= 1 })}
                                                        onMouseEnter={(event) => {
                                                            if (canvasSummaries.length > 1) event.currentTarget.style.background = 'rgba(239,68,68,0.10)';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            event.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={menuIconStyle}><IconTrash size={13} /></span>
                                                        Delete Canvas
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
                                            {isCreatingChildHere && (
                                                <div
                                                    style={{
                                                        border: `1px dashed ${t.primary || '#3b82f6'}`,
                                                        background: 'rgba(59,130,246,0.08)',
                                                        borderRadius: '7px',
                                                        padding: '8px 9px',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                        <span style={{ color: t.textMuted, fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                                                            └
                                                        </span>
                                                        {inlineInput(inlineNameAction.placeholder)}
                                                    </div>
                                                    <div style={{ color: t.textMuted, fontSize: '10px', marginTop: '5px', paddingLeft: '18px' }}>
                                                        Enter to create child sub-module under {canvas.moduleName}. Escape or click away to cancel.
                                                    </div>
                                                </div>
                                            )}
                                            {moduleFiles.length === 0 ? (
                                                <div style={{ ...s.emptyState, padding: '14px 10px' }}>
                                                    {isCreatingChildHere ? 'No module blocks in this canvas yet.' : 'No module blocks in this canvas.'}
                                                </div>
                                            ) : (
                                                moduleFiles.map((file) => {
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
                                                                padding: '7px 9px',
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

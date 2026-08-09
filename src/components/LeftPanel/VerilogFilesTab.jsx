import { useEffect, useMemo, useRef, useState } from 'react';
import FullCodeModal from '../../modals/ContextualModal/FullCodeModal';
import { highlightVerilogCode } from '../../verilog-code/verilogEdits';
import { IconCode, IconFolder, IconSave, IconTrash } from '../../styles';

const VerilogFilesTab = ({
    nodes,
    theme,
    t,
    s,
    getModuleCode,
    onSaveCode,
    jumpToNode,
    onImportVerilogFiles,
    importStatus,
    onDeleteModuleFile,
}) => {
    const importInputRef = useRef(null);
    const [activeFile, setActiveFile] = useState(null);
    const [editorCode, setEditorCode] = useState('');
    const [dirty, setDirty] = useState(false);

    const moduleFiles = useMemo(() => {
        const seen = new Map();
        (nodes || []).forEach((node) => {
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
                const file = seen.get(moduleName);
                file.instances += 1;
            }
        });
        return Array.from(seen.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
    }, [nodes]);

    const openFile = (file) => {
        setActiveFile(file);
        setEditorCode(getModuleCode(file.node));
        setDirty(false);
    };

    useEffect(() => {
        if (!activeFile) return;
        const latest = moduleFiles.find((file) => file.moduleName === activeFile.moduleName);
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            if (!latest) {
                setActiveFile(null);
                setEditorCode('');
                setDirty(false);
                return;
            }
            setActiveFile(latest);
            if (!dirty) setEditorCode(getModuleCode(latest.node));
        });
        return () => {
            cancelled = true;
        };
    }, [activeFile, dirty, getModuleCode, moduleFiles]);

    const closeEditor = (isOpen) => {
        if (!isOpen) setActiveFile(null);
    };

    const updateEditorCode = (nextCode) => {
        setEditorCode(nextCode);
        setDirty(true);
    };

    const saveActiveFile = () => {
        if (!activeFile) return;
        onSaveCode(activeFile.nodeId, activeFile.moduleName, editorCode);
        setDirty(false);
    };

    const handleImportChange = (event) => {
        const files = event.target.files;
        if (files?.length) onImportVerilogFiles(files);
        event.target.value = '';
    };

    const deleteFile = (file) => {
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
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconFolder size={15} />
                    Verilog Directory
                </div>
                <div style={{ fontSize: '11px', color: t.textSecondary, lineHeight: 1.5 }}>
                    Modules on the canvas are editable here. Upload RTL files to create module blocks automatically.
                </div>
            </div>

            <div style={{ padding: '0 14px 14px', display: 'grid', gap: '8px' }}>
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".v,.sv,.vh"
                    multiple
                    onChange={handleImportChange}
                    style={{ display: 'none' }}
                />
                <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    style={{
                        ...s.primaryBtn,
                        gap: '8px',
                        width: '100%',
                        marginTop: 0,
                    }}
                >
                    <IconSave size={14} />
                    Import RTL Files
                </button>
                {importStatus && (
                    <div
                        style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
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
            </div>

            {moduleFiles.length === 0 ? (
                <div style={{ ...s.emptyState, margin: '0 14px' }}>
                    Add a hardware block to create a module file.
                </div>
            ) : (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {moduleFiles.map((file) => {
                        const isOpen = activeFile?.moduleName === file.moduleName;
                        const code = getModuleCode(file.node);
                        const lineCount = code ? code.split('\n').length : 0;

                        return (
                            <button
                                key={file.moduleName}
                                type="button"
                                onClick={() => openFile(file)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    background: isOpen ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${isOpen ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                                    color: t.textHeading,
                                    transition: 'border-color 0.15s, background 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = isOpen ? 'rgba(59, 130, 246, 0.16)' : 'rgba(255, 255, 255, 0.07)';
                                    e.currentTarget.style.borderColor = isOpen ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.18)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isOpen ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = isOpen ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                                    <IconCode size={15} />
                                    <span style={{ minWidth: 0 }}>
                                        <span style={{
                                            display: 'block',
                                            fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {file.moduleName}.v
                                        </span>
                                        <span style={{ display: 'block', marginTop: '2px', fontSize: '10px', color: t.textMuted }}>
                                            {file.instances} instance{file.instances !== 1 ? 's' : ''} - {lineCount} lines
                                        </span>
                                    </span>
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            jumpToNode(file.node);
                                        }}
                                        style={{
                                            fontSize: '10px',
                                            color: '#10b981',
                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Jump
                                    </span>
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteFile(file);
                                        }}
                                        title={`Delete ${file.moduleName}.v`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '22px',
                                            height: '22px',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.28)',
                                            borderRadius: '5px',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <IconTrash size={12} />
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <FullCodeModal
                fullCodeModalOpen={!!activeFile}
                setFullCodeModalOpen={closeEditor}
                localCode={editorCode}
                setLocalCode={updateEditorCode}
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

export default VerilogFilesTab;

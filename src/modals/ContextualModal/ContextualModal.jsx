import NodeModalContent from './NodeModalContent';
import EdgeModalContent from './EdgeModalContent';

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
    getPortLabel,
    parsePorts,
    recordHistory,
    setNodes,
    setEdges,
    setExposedPorts,
    setSelectedNodeId,
    setGlowingNet,
    onSaveCode
}) => {
    if (!activeModal || !activeModal.type) return null;

    const isNode = activeModal.type === 'node';
    const targetId = activeModal.id;

    // ---------- Helpers ----------
    const closeModal = () => setActiveModal({ type: null, id: null });

    const isDark = theme === 'dark';

    // ---------- Shared modal style ----------
    const modalStyle = {
        position: 'fixed',
        top: `${modalPos.y}px`,
        left: `${modalPos.x}px`,
        zIndex: 99999,
        background: isDark ? 'rgba(10,15,28,0.96)' : 'rgba(255,255,255,0.98)',
        color: t.textHeading,
        cursor: 'grab',
        padding: 0,
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'min(680px, calc(100vh - 24px))',
        overflow: 'hidden',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
    };

    const borderStyle = `1px solid ${isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.12)'}`;
    const boxShadowStyle = isDark
        ? '0 24px 80px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.06)'
        : '0 24px 80px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.9)';

    if (isNode) {
        const node = nodes.find(n => n.id === targetId);
        if (!node) return null;
        return (
            <div
                onMouseDown={handleModalDragStart}
                style={{
                    ...modalStyle,
                    width: '560px',
                    border: borderStyle,
                    boxShadow: boxShadowStyle
                }}
            >
                <NodeModalContent
                    node={node}
                    targetId={targetId}
                    theme={theme}
                    t={t}
                    s={s}
                    nodes={nodes}
                    edges={edges}
                    exposedPorts={exposedPorts}
                    closeModal={closeModal}
                    updateSelectedNode={updateSelectedNode}
                    togglePortSwap={togglePortSwap}
                    toggleExposePort={toggleExposePort}
                    getPortLabel={getPortLabel}
                    parsePorts={parsePorts}
                    recordHistory={recordHistory}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    setExposedPorts={setExposedPorts}
                    setSelectedNodeId={setSelectedNodeId}
                    currentModuleCode={currentModuleCode}
                    onSaveCode={onSaveCode}
                />
            </div>
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
                    border: borderStyle,
                    boxShadow: boxShadowStyle
                }}
            >
                <EdgeModalContent
                    edge={edge}
                    targetId={targetId}
                    t={t}
                    s={s}
                    theme={theme}
                    recordHistory={recordHistory}
                    setEdges={setEdges}
                    closeModal={closeModal}
                    setGlowingNet={setGlowingNet}
                />
            </div>
        );
    }
};

export default ContextualModal;

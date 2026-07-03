import { useState } from 'react';
import { useCodeEditor } from './useCodeEditor.js';
import NodeModalContent from './NodeModalContent';
import EdgeModalContent from './EdgeModalContent';
import FullCodeModal from './FullCodeModal';

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
    setSelectedNodeId,
    setGlowingNet,
    highlightVerilogCode,
    onSaveCode
}) => {
    // ============================
    // ALL REACT HOOKS MUST BE AT THE TOP
    // ============================
    const [fullCodeModalOpen, setFullCodeModalOpen] = useState(false);
    const [localCode, setLocalCode] = useState('');
    const [lastTargetId, setLastTargetId] = useState(null);
    const [instantiationQuantity, setInstantiationQuantity] = useState(1);

    // Moved above the early return to fix the react-hooks/rules-of-hooks lint error
    const handleKeyDown = useCodeEditor(localCode, setLocalCode);

    // ============================
    // State Sync & Early Returns
    // ============================
    if (activeModal && activeModal.type === 'node' && activeModal.id !== lastTargetId) {
        setLocalCode(currentModuleCode || '');
        setLastTargetId(activeModal.id);
        setInstantiationQuantity(1);
    }

    if (!activeModal || !activeModal.type) return null;

    const isNode = activeModal.type === 'node';
    const targetId = activeModal.id;

    // ---------- Helpers ----------
    const closeModal = () => setActiveModal({ type: null, id: null });

    // ---------- Shared modal style ----------
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

    const borderStyle = `4px solid ${theme === 'dark' ? "rgba(0, 27, 233, 0.87)" : "rgba(255, 1, 1, 0.87)"}`;
    const boxShadowStyle = theme === 'dark'
        ? '0 20px 40px rgba(0,0,0,0.6)'
        : '0 20px 40px rgba(0,0,0,0.15)';

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
                        setSelectedNodeId={setSelectedNodeId}
                        onSaveCode={onSaveCode}
                        setFullCodeModalOpen={setFullCodeModalOpen}
                        instantiationQuantity={instantiationQuantity}
                        setInstantiationQuantity={setInstantiationQuantity}
                        localCode={localCode}
                    />
                </div>
                <FullCodeModal
                    fullCodeModalOpen={fullCodeModalOpen}
                    setFullCodeModalOpen={setFullCodeModalOpen}
                    localCode={localCode}
                    setLocalCode={setLocalCode}
                    handleKeyDown={handleKeyDown}
                    t={t}
                    theme={theme}
                    highlightVerilogCode={highlightVerilogCode}
                    nodes={nodes}
                    targetId={targetId}
                    onSaveCode={onSaveCode}
                    instantiationQuantity={instantiationQuantity}
                    setInstantiationQuantity={setInstantiationQuantity}
                />
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
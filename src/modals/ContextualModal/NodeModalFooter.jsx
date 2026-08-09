const NodeModalFooter = ({
    targetId,
    nodes,
    t,
    s,
    currentModuleCode,
    recordHistory,
    setNodes,
    closeModal,
    setSelectedNodeId,
    onSaveCode,
    instantiationQuantity,
    setInstantiationQuantity
}) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 18px',
        borderTop: `1px solid ${t.border}`,
        userSelect: 'none',
        background: t.bgSecondary,
        cursor: 'default',
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
                borderRadius: '10px',
                padding: '10px 14px',
                fontWeight: 800,
                transition: 'transform 0.1s ease, background-color 0.2s',
                cursor: 'pointer'
            }}
        >
            Purge Block
        </button>
        <button
            onClick={(e) => {
                e.currentTarget.style.transform = 'scale(0.94)';
                const targetNode = nodes.find(n => n.id === targetId);

                if (targetNode && !targetNode.data.isSplitter && !targetNode.data.isBundler && instantiationQuantity > 1) {
                    if (typeof onSaveCode === 'function') {
                        onSaveCode(targetId, targetNode.data.moduleName, currentModuleCode, instantiationQuantity);
                        setInstantiationQuantity(1);
                    }
                }
                setTimeout(closeModal, 80);
            }}
            style={{
                ...s.primaryBtn,
                margin: 0,
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 800,
                transition: 'transform 0.1s ease, background-color 0.2s',
                cursor: 'pointer'
            }}
        >
            Apply Changes
        </button>
    </div>
);

export default NodeModalFooter;

const NodeModalFooter = ({
    targetId,
    nodes,
    t,
    s,
    localCode,
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
                const targetNode = nodes.find(n => n.id === targetId);

                if (targetNode && !targetNode.data.isSplitter && !targetNode.data.isBundler) {
                    if (typeof onSaveCode === 'function') {
                        onSaveCode(targetId, targetNode.data.moduleName, localCode, instantiationQuantity);
                        setInstantiationQuantity(1);
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

export default NodeModalFooter;
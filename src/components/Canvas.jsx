import { ReactFlow, Background, Controls } from "@xyflow/react"


const Canvas = ({
    nodes,
    edges,
    onNodeClick,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    onEdgeClick,
    onPaneClick,
    edgeTypes,
    nodeTypes,
    recordHistory,
    isValidConnection,
    ConnectionMode,
    t,
    s,
    wireViewMode,
    setWireViewMode,
    wireStats,
}) => {
    const modeButton = (mode, label) => {
        const active = wireViewMode === mode;
        return (
            <button
                type="button"
                onClick={() => setWireViewMode(mode)}
                style={{
                    border: `1px solid ${active ? '#3b82f6' : 'rgba(148,163,184,0.28)'}`,
                    background: active ? 'rgba(59,130,246,0.18)' : 'rgba(15,23,42,0.72)',
                    color: active ? '#bfdbfe' : '#94a3b8',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                }}
            >
                {label}
            </button>
        );
    };

    return (
        <div style={{ ...s.canvas, position: 'relative' }}>
            <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onConnect={onConnect} 
            onReconnect={onReconnect} 
            onNodeClick={onNodeClick} 
            onEdgeClick={onEdgeClick} 
            onPaneClick={onPaneClick} 
            onNodeDragStop={recordHistory} 
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes} 
            edgeTypes={edgeTypes} 
            fitView reconnectable="always" 
            deleteKeyCode={null} 
            connectionMode={ConnectionMode.Loose} 
            style={{ backgroundColor: t.canvasBg }}>
                <Background color={t.canvasDot} gap={24} size={1.5} />
                <Controls position="bottom-left" style={{ background: '#050505', border: '1px solid #222222', borderRadius: '6px' }} />
            </ReactFlow>
            <div
                style={{
                    position: 'absolute',
                    left: '14px',
                    top: '14px',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px',
                    borderRadius: '9px',
                    border: '1px solid rgba(148,163,184,0.22)',
                    background: 'rgba(2,6,23,0.72)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
                    backdropFilter: 'blur(8px)',
                    pointerEvents: 'all',
                }}
            >
                {modeButton('clean', 'Clean')}
                {modeButton('focus', 'Focus')}
                {modeButton('all', 'All')}
                <span style={{ color: '#64748b', fontSize: '11px', padding: '0 4px' }}>
                    {wireStats?.visible ?? edges.length}/{wireStats?.total ?? edges.length} wires
                </span>
            </div>
        </div>
    )
}

export default Canvas;

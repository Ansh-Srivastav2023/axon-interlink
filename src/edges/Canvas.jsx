import { ReactFlow } from "@xyflow/react"
import { Background } from "@xyflow/react";
import { Controls } from "@xyflow/react";
const Canvas = ( { nodes, edges, onNodeClick, onNodesChange, onEdgesChange, onConnect, onReconnect, onEdgeClick, onPaneClick, edgeTypes, nodeTypes, recordHistory, ConnectionMode, t, s } ) => {
    return (
        <div style={s.canvas}>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onReconnect={onReconnect} onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onPaneClick={onPaneClick} onNodeDragStop={recordHistory} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView reconnectable="always" deleteKeyCode={null} connectionMode={ConnectionMode.Loose} style={{ backgroundColor: t.canvasBg }}>
                <Background color={t.canvasDot} gap={24} size={1.5} />
                <Controls position="bottom-left" style={{ background: '#050505', border: '1px solid #222222', borderRadius: '6px' }} />
            </ReactFlow>
                </div>
    )
}

export default Canvas;
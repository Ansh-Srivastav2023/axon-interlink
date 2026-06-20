import { useState, useCallback } from 'react';

export default function useHistory({
    nodes,
    edges,
    customCodes,
    exposedPorts,
    setNodes,
    setEdges,
    setCustomCodes,
    setExposedPorts,
    setSelectedNodeId,
    setSelectedEdgeId,
    setGlowingNet,
}) {
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    const captureSnapshot = useCallback(() => {
        return {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
            customCodes: { ...customCodes },
            exposedPorts: { ...exposedPorts },
        };
    }, [nodes, edges, customCodes, exposedPorts]);

    const recordHistory = useCallback(() => {
        setPast((prev) => [...prev, captureSnapshot()]);
        setFuture([]);
    }, [captureSnapshot]);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        const current = captureSnapshot();
        setPast(newPast);
        setFuture((next) => [current, ...next]);
        setNodes(previous.nodes);
        setEdges(previous.edges);
        setCustomCodes(previous.customCodes);
        setExposedPorts(previous.exposedPorts);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
    }, [
        past,
        captureSnapshot,
        setNodes,
        setEdges,
        setCustomCodes,
        setExposedPorts,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
        setPast,
        setFuture,
    ]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        const current = captureSnapshot();
        setPast((prev) => [...prev, current]);
        setFuture(newFuture);
        setNodes(next.nodes);
        setEdges(next.edges);
        setCustomCodes(next.customCodes);
        setExposedPorts(next.exposedPorts);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
    }, [
        future,
        captureSnapshot,
        setNodes,
        setEdges,
        setCustomCodes,
        setExposedPorts,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
        setPast,
        setFuture,
    ]);

    return {
        past,
        future,
        recordHistory,
        undo,
        redo,
    };
}
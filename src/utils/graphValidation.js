export const findPort = (node, handle, direction) => {
    if (!node?.data || !handle) return null;
    const ports = direction === 'output' ? node.data.outputs : node.data.inputs;
    return (ports || []).find((port) => port.name === handle) || null;
};

export const validateGraph = (nodes = [], edges = [], exposedPorts = {}) => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const issues = [];
    const targetInputs = new Map();

    edges.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);

        if (!sourceNode || !targetNode) {
            issues.push({ type: 'invalid-edge-node', edgeId: edge.id });
            return;
        }

        const sourcePort = findPort(sourceNode, edge.sourceHandle, 'output');
        const targetPort = findPort(targetNode, edge.targetHandle, 'input');

        if (!sourcePort || !targetPort) {
            issues.push({ type: 'invalid-edge-port', edgeId: edge.id });
            return;
        }

        if (sourcePort.width !== targetPort.width) {
            issues.push({
                type: 'width-mismatch',
                edgeId: edge.id,
                sourceWidth: sourcePort.width,
                targetWidth: targetPort.width,
            });
        }

        const targetKey = `${edge.target}__${edge.targetHandle}`;
        targetInputs.set(targetKey, (targetInputs.get(targetKey) || 0) + 1);
    });

    targetInputs.forEach((count, key) => {
        if (count > 1) issues.push({ type: 'multiple-drivers', targetKey: key, count });
    });

    Object.entries(exposedPorts || {}).forEach(([key, entry]) => {
        const node = nodeById.get(entry?.nodeId);
        if (!node) {
            issues.push({ type: 'invalid-exposed-node', key });
            return;
        }
        const direction = entry.isInput ? 'input' : 'output';
        if (!findPort(node, entry.portName, direction)) {
            issues.push({ type: 'invalid-exposed-port', key });
        }
    });

    return issues;
};

export const sanitizeGraph = (nodes = [], edges = [], exposedPorts = {}) => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const cleanEdges = edges.filter((edge) => {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);
        if (!sourceNode || !targetNode) return false;
        return !!findPort(sourceNode, edge.sourceHandle, 'output') && !!findPort(targetNode, edge.targetHandle, 'input');
    });

    const cleanExposedPorts = {};
    Object.entries(exposedPorts || {}).forEach(([key, entry]) => {
        const node = nodeById.get(entry?.nodeId);
        if (!node) return;
        const direction = entry.isInput ? 'input' : 'output';
        const port = findPort(node, entry.portName, direction);
        if (!port) return;
        const isConnected = entry.isInput
            ? cleanEdges.some((edge) => edge.target === entry.nodeId && edge.targetHandle === entry.portName)
            : cleanEdges.some((edge) => edge.source === entry.nodeId && edge.sourceHandle === entry.portName);
        const isAutoRouted = entry.isInput && !!node.data?.autoRoute?.[entry.portName];
        if (isConnected || isAutoRouted) return;
        cleanExposedPorts[key] = {
            ...entry,
            width: port.width,
            msb: port.msb,
            lsb: port.lsb,
        };
    });

    const edgesChanged = cleanEdges.length !== edges.length;
    const exposedChanged = JSON.stringify(cleanExposedPorts) !== JSON.stringify(exposedPorts || {});

    return {
        edges: cleanEdges,
        exposedPorts: cleanExposedPorts,
        changed: edgesChanged || exposedChanged,
        edgesChanged,
        exposedChanged,
    };
};

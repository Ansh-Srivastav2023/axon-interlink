import { getEdgeEffectiveWidths, getSourceSlice, getTargetSlice, rangesOverlap } from './edgeSlices.js';

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

        const { sourceWidth, targetWidth } = getEdgeEffectiveWidths(edge, sourcePort, targetPort);
        if (edge.data?.sourceSlice && !getSourceSlice(edge, sourcePort)) {
            issues.push({ type: 'invalid-source-slice', edgeId: edge.id });
        }
        if (edge.data?.targetSlice && !getTargetSlice(edge, targetPort)) {
            issues.push({ type: 'invalid-target-slice', edgeId: edge.id });
        }

        if (sourceWidth !== targetWidth) {
            issues.push({
                type: 'width-mismatch',
                edgeId: edge.id,
                sourceWidth,
                targetWidth,
            });
        }

        const targetKey = `${edge.target}__${edge.targetHandle}`;
        if (!targetInputs.has(targetKey)) targetInputs.set(targetKey, []);
        targetInputs.get(targetKey).push({ edge, slice: getTargetSlice(edge, targetPort) });
    });

    targetInputs.forEach((drivers, key) => {
        if (drivers.length <= 1) return;
        const hasFullPortDriver = drivers.some((driver) => !driver.slice);
        const hasOverlap = drivers.some((driver, driverIndex) =>
            drivers.some((otherDriver, otherIndex) =>
                driverIndex !== otherIndex && rangesOverlap(driver.slice, otherDriver.slice)
            )
        );
        if (hasFullPortDriver || hasOverlap) {
            issues.push({ type: 'multiple-drivers', targetKey: key, count: drivers.length });
        }
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

export const getPortWidth = (port) => Math.max(1, port?.width || 1);

export const floatingLiteral = (port) => `${getPortWidth(port)}'bz`;

export const topPortName = (node, port) => `${node.data.instanceName}_${port.name}`;

export const sliceSignal = (signal, port, sourceWidth = null) => {
    if (sourceWidth !== null && sourceWidth <= 1) return signal;
    if (getPortWidth(port) <= 1) {
        return Number.isInteger(port?.lsb) ? `${signal}[${port.lsb}]` : signal;
    }
    if (Number.isInteger(port?.msb) && Number.isInteger(port?.lsb)) {
        return `${signal}[${port.msb}:${port.lsb}]`;
    }
    return signal;
};

export const getSinkExpression = (node, port, edges = [], exposedPorts = {}) => {
    const incomingEdge = edges.find((edge) => edge.target === node.id && edge.targetHandle === port.name);
    if (incomingEdge) return `w_${node.id}_${port.name}`;
    if (exposedPorts[`${node.id}__${port.name}`]) return topPortName(node, port);
    if (node.data.tieoffs?.[port.name]) return node.data.tieoffs[port.name];
    if (node.data.autoRoute?.[port.name]) {
        const route = node.data.autoRoute[port.name];
        return typeof route === 'string' ? route : port.name;
    }
    return null;
};

export const generateSplitterBundlerAssigns = (nodes = [], edges = [], exposedPorts = {}) => {
    const assigns = [];

    nodes.forEach((node) => {
        if (node.data?.isSplitter) {
            const inputPort = (node.data.inputs || [])[0] || { name: 'bus_in', width: 1, msb: 0, lsb: 0 };
            const sourceBusNet = getSinkExpression(node, inputPort, edges, exposedPorts);

            (node.data.outputs || []).forEach((outPort) => {
                const outEdges = edges.filter((edge) => edge.source === node.id && edge.sourceHandle === outPort.name);
                const sourceSlice = sourceBusNet
                    ? sliceSignal(sourceBusNet, outPort, getPortWidth(inputPort))
                    : floatingLiteral(outPort);

                outEdges.forEach((edge) => {
                    assigns.push(`  assign w_${edge.target}_${edge.targetHandle} = ${sourceSlice};`);
                });

                if (exposedPorts[`${node.id}__${outPort.name}`]) {
                    assigns.push(`  assign ${topPortName(node, outPort)} = ${sourceSlice};`);
                }
            });
        }

        if (node.data?.isBundler) {
            const outputPort = (node.data.outputs || [])[0];
            const outEdges = edges.filter((edge) => edge.source === node.id && edge.sourceHandle === outputPort?.name);
            const outputExposed = outputPort && exposedPorts[`${node.id}__${outputPort.name}`];

            if (outEdges.length > 0 || outputExposed) {
                const bundledNets = [...(node.data.inputs || [])]
                    .reverse()
                    .map((inPort) => getSinkExpression(node, inPort, edges, exposedPorts) || floatingLiteral(inPort));
                const bundledExpression = `{ ${bundledNets.join(', ')} }`;

                outEdges.forEach((edge) => {
                    assigns.push(`  assign w_${edge.target}_${edge.targetHandle} = ${bundledExpression};`);
                });

                if (outputExposed) {
                    assigns.push(`  assign ${topPortName(node, outputPort)} = ${bundledExpression};`);
                }
            }
        }
    });

    return assigns;
};

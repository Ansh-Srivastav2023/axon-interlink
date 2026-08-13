import { generateSplitterBundlerAssigns } from './splitterBundlerCodegen.js';
import { applySourceSlice, applyTargetSlice, getSourceSlice } from './edgeSlices.js';

const getAutoRouteSignalName = (autoRouteValue, fallbackName) =>
    typeof autoRouteValue === 'string' ? autoRouteValue : fallbackName;

const getDeclaredModuleName = (code = '') => {
    const match = String(code || '').match(/\bmodule\s+([a-zA-Z_][a-zA-Z0-9_$]*)/);
    return match?.[1] || null;
};

const getEffectiveModuleName = (moduleName, customCodes = {}) =>
    getDeclaredModuleName(customCodes[moduleName]) || moduleName;

const getInputPort = (nodes, nodeId, handle) => {
    const node = nodes.find((candidate) => candidate.id === nodeId);
    return (node?.data?.inputs || []).find((port) => port.name === handle) || null;
};

const getOutputPort = (nodes, nodeId, handle) => {
    const node = nodes.find((candidate) => candidate.id === nodeId);
    return (node?.data?.outputs || []).find((port) => port.name === handle) || null;
};

const getSourceRouteWireName = (nodeId, handle) => `w_${nodeId}_${handle}_src`;

const getEdgeTargetSignal = (edge, nodes) => {
    const signalName = `w_${edge.target}_${edge.targetHandle}`;
    const targetPort = getInputPort(nodes, edge.target, edge.targetHandle);
    return applyTargetSlice(signalName, edge, targetPort);
};

const getEdgeSourceSignal = (edge, nodes) => {
    const signalName = getSourceRouteWireName(edge.source, edge.sourceHandle);
    const sourcePort = getOutputPort(nodes, edge.source, edge.sourceHandle);
    return applySourceSlice(signalName, edge, sourcePort);
};

export function generateStructuralVerilog({
    moduleName = 'top_module',
    nodes = [],
    edges = [],
    customCodes = {},
    exposedPorts = {},
    includeChildDefinitions = true,
    timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
} = {}) {
    const autoRouteTopPorts = [];
    const seenAutoRouteTopPorts = new Set(['clk', 'rst_n']);
    nodes.forEach((node) => {
        (node.data?.inputs || []).forEach((port) => {
            const autoRoute = node.data?.autoRoute?.[port.name];
            if (!autoRoute) return;
            const topName = getAutoRouteSignalName(autoRoute, port.name);
            if (seenAutoRouteTopPorts.has(topName)) return;
            seenAutoRouteTopPorts.add(topName);
            autoRouteTopPorts.push(topName);
        });
    });

    let code = `// ============================================================================
// DESIGN NETLIST | AUTOMATICALLY GENERATED STRUCTURAL CODE
// ============================================================================
// Creator/Designer : Ansh Srivastav
// Generator Engine : Axon Interlink Engine v1.0.0
// Generated On      : ${timestamp}
//
// [USAGE NOTE / COMPILER COMPATIBILITY]:
// By default, internal module compute definitions utilize output types as 'logic'. 
// For strict legacy Verilog simulation environments or downstream hardware 
// synthesis compiler compliance, feel free to switch port outputs to 'wire' 
// or 'reg' mappings to match your target EDA toolchain requirements.
// ============================================================================

module ${moduleName} (
  input wire clk,
  input wire rst_n`;

    autoRouteTopPorts.forEach((portName) => {
        code += `,\n  input wire ${portName}`;
    });

    const exposedKeys = Object.keys(exposedPorts);
    const validExposedKeys = exposedKeys.filter((key) => {
        const p = exposedPorts[key];
        const node = nodes.find((n) => n.id === p.nodeId);
        if (!node) return false;
        return !(p.isInput && node.data.autoRoute?.[p.portName]);
    });
    if (validExposedKeys.length > 0) {
        code += `,\n`;
        const seenTopPortNames = new Set(['clk', 'rst_n', ...autoRouteTopPorts]);
        const ioLines = [];
        validExposedKeys.forEach((key) => {
            const port = exposedPorts[key];
            const node = nodes.find((n) => n.id === port.nodeId);
            const prefix = node ? node.data.instanceName : 'unknown';
            const topPortName = port.externalName || `${prefix}_${port.portName}`;
            if (seenTopPortNames.has(topPortName)) return;
            seenTopPortNames.add(topPortName);
            const wDecl =
                port.width > 1
                    ? `[${port.msb !== undefined ? port.msb : port.width - 1}:${port.lsb !== undefined ? port.lsb : 0}] `
                    : '';
            const ioType = port.isInput ? 'input wire' : 'output wire';
            ioLines.push(`  ${ioType} ${wDecl}${topPortName}`);
        });
        code += ioLines.join(',\n') + `\n`;
    } else {
        code += `\n`;
    }
    code += `);\n\n`;

    const internalWireDecls = [];
    const internalWireNames = new Set();
    const pushInternalWireDecl = (wireName, width = 1) => {
        if (internalWireNames.has(wireName)) return;
        internalWireNames.add(wireName);
        const wDecl = width > 1 ? `[${width - 1}:0] ` : '';
        internalWireDecls.push(`  wire ${wDecl}${wireName};`);
    };

    nodes.forEach((node) => {
        (node.data.inputs || []).forEach((p) => {
            const incomingEdge = edges.find((e) => e.target === node.id && e.targetHandle === p.name);
            const exposedKey = `${node.id}__${p.name}`;
            const isExposed = !!exposedPorts[exposedKey];
            if (incomingEdge && !isExposed) {
                pushInternalWireDecl(`w_${node.id}_${p.name}`, p.width || 1);
            }
        });
        (node.data.outputs || []).forEach((p) => {
            const outgoingEdges = edges.filter((e) => e.source === node.id && e.sourceHandle === p.name);
            if (outgoingEdges.some((edge) => getSourceSlice(edge, p))) {
                pushInternalWireDecl(getSourceRouteWireName(node.id, p.name), p.width || 1);
            }
        });
    });
    if (internalWireDecls.length > 0) {
        code += `  // Internal Routing Nets (Sink-Based Naming Style)\n`;
        code += internalWireDecls.join('\n') + `\n\n`;
    }

    const driverShortingAssigns = [];
    const processedDrivers = {};
    const sourceSliceAssigns = [];
    const sourceSlicedDrivers = new Set();
    edges.forEach((edge) => {
        const sourcePort = getOutputPort(nodes, edge.source, edge.sourceHandle);
        if (getSourceSlice(edge, sourcePort)) {
            sourceSlicedDrivers.add(`${edge.source}_${edge.sourceHandle}`);
        }
    });
    edges.forEach((edge) => {
        const driverKey = `${edge.source}_${edge.sourceHandle}`;
        const currentSinkWire = getEdgeTargetSignal(edge, nodes);
        if (sourceSlicedDrivers.has(driverKey)) {
            sourceSliceAssigns.push(`  assign ${currentSinkWire} = ${getEdgeSourceSignal(edge, nodes)};`);
            return;
        }
        if (!processedDrivers[driverKey]) {
            processedDrivers[driverKey] = currentSinkWire;
        } else {
            const masterWireName = processedDrivers[driverKey];
            driverShortingAssigns.push(`  assign ${currentSinkWire} = ${masterWireName};`);
        }
    });
    if (driverShortingAssigns.length > 0) {
        code += `  // Fan-Out Interconnect Shunt Links \n`;
        code += driverShortingAssigns.join('\n') + `\n\n`;
    }
    if (sourceSliceAssigns.length > 0) {
        code += `  // Source Bit-Slice Routing\n`;
        code += sourceSliceAssigns.join('\n') + `\n\n`;
    }

    const splitterAssigns = generateSplitterBundlerAssigns(nodes, edges, exposedPorts);
    if (splitterAssigns.length > 0) {
        code += `  // Inline Structural Bus Routing Layers\n`;
        code += splitterAssigns.join('\n') + `\n\n`;
    }

    code += `  // Component Instantiations\n`;
    nodes.forEach((node) => {
        if (node.data.isSplitter || node.data.isBundler) return;
        const effectiveModuleName = getEffectiveModuleName(node.data.moduleName, customCodes);
        code += `  ${effectiveModuleName} ${node.data.instanceName} (\n`;
        const maps = [];
        if (node.data.inputs) {
            (node.data.inputs || []).forEach((p) => {
                const e = edges.find((ed) => ed.target === node.id && ed.targetHandle === p.name);
                const exposedKey = `${node.id}__${p.name}`;
                const tieoff = node.data.tieoffs?.[p.name];
                const autoRoute = node.data.autoRoute?.[p.name];
                if (e) {
                    maps.push(`    .${p.name}(w_${node.id}_${p.name})`);
                } else if (autoRoute) maps.push(`    .${p.name}(${getAutoRouteSignalName(autoRoute, p.name)})`);
                else if (exposedPorts[exposedKey]) maps.push(`    .${p.name}(${exposedPorts[exposedKey].externalName || `${node.data.instanceName}_${p.name}`})`);
                else if (tieoff) maps.push(`    .${p.name}(${tieoff})`);
                else maps.push(`    .${p.name}(${p.width}'bz)`);
            });
        }
        if (node.data.outputs) {
            (node.data.outputs || []).forEach((p) => {
                const connectedEdges = edges.filter((ed) => ed.source === node.id && ed.sourceHandle === p.name);
                const exposedKey = `${node.id}__${p.name}`;
                if (exposedPorts[exposedKey]) {
                    maps.push(`    .${p.name}(${exposedPorts[exposedKey].externalName || `${node.data.instanceName}_${p.name}`})`);
                } else if (connectedEdges.length > 0) {
                    const driverKey = `${node.id}_${p.name}`;
                    const masterWireName = sourceSlicedDrivers.has(driverKey)
                        ? getSourceRouteWireName(node.id, p.name)
                        : processedDrivers[driverKey] || getEdgeTargetSignal(connectedEdges[0], nodes);
                    maps.push(`    .${p.name}(${masterWireName})`);
                } else {
                    maps.push(`    .${p.name}()`);
                }
            });
        }
        code += maps.join(',\n') + `\n  );\n\n`;
    });
    code += `endmodule\n\n`;

    if (!includeChildDefinitions) return code;

    const seen = new Set();
    nodes.forEach((node) => {
        const mName = node.data.moduleName;
        const codeForModule = customCodes[mName];
        const effectiveModuleName = getDeclaredModuleName(codeForModule) || mName;
        if (seen.has(effectiveModuleName)) return;
        seen.add(effectiveModuleName);
        if (customCodes[mName] !== undefined) {
            code += `// --- Core Compute Definition: ${effectiveModuleName} ---\n${customCodes[mName]}\n\n`;
        }
    });

    return code;
}

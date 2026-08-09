import { generateSplitterBundlerAssigns } from './splitterBundlerCodegen.js';

const getAutoRouteSignalName = (autoRouteValue, fallbackName) =>
    typeof autoRouteValue === 'string' ? autoRouteValue : fallbackName;

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
    nodes.forEach((node) => {
        if (!node.data.inputs) return;
        (node.data.inputs || []).forEach((p) => {
            const incomingEdge = edges.find((e) => e.target === node.id && e.targetHandle === p.name);
            const exposedKey = `${node.id}__${p.name}`;
            const isExposed = !!exposedPorts[exposedKey];
            if (incomingEdge && !isExposed) {
                const wDecl = p.width > 1 ? `[${p.width - 1}:0] ` : '';
                internalWireDecls.push(`  wire ${wDecl}w_${node.id}_${p.name};`);
            }
        });
    });
    if (internalWireDecls.length > 0) {
        code += `  // Internal Routing Nets (Sink-Based Naming Style)\n`;
        code += internalWireDecls.join('\n') + `\n\n`;
    }

    const driverShortingAssigns = [];
    const processedDrivers = {};
    edges.forEach((edge) => {
        const driverKey = `${edge.source}_${edge.sourceHandle}`;
        const currentSinkWire = `w_${edge.target}_${edge.targetHandle}`;
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

    const splitterAssigns = generateSplitterBundlerAssigns(nodes, edges, exposedPorts);
    if (splitterAssigns.length > 0) {
        code += `  // Inline Structural Bus Routing Layers\n`;
        code += splitterAssigns.join('\n') + `\n\n`;
    }

    code += `  // Component Instantiations\n`;
    nodes.forEach((node) => {
        if (node.data.isSplitter || node.data.isBundler) return;
        code += `  ${node.data.moduleName} ${node.data.instanceName} (\n`;
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
                    const masterWireName =
                        processedDrivers[driverKey] || `w_${connectedEdges[0].target}_${connectedEdges[0].targetHandle}`;
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
        if (seen.has(mName)) return;
        seen.add(mName);
        if (customCodes[mName] !== undefined) {
            code += `// --- Core Compute Definition: ${mName} ---\n${customCodes[mName]}\n\n`;
        }
    });

    return code;
}

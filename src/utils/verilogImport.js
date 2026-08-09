const IDENTIFIER = '[a-zA-Z_][a-zA-Z0-9_$]*';
const RESERVED_WORDS = new Set([
    'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'logic',
    'assign', 'always', 'initial', 'if', 'else', 'case', 'for', 'while', 'begin',
    'end', 'generate', 'endgenerate', 'parameter', 'localparam', 'function',
    'task', 'typedef', 'class', 'interface', 'package',
]);
const CLOCK_ALIASES = new Set(['clk', 'clock', 'i_clk', 'aclk', 'clk_i']);
const RESET_ALIASES = new Set(['rst_n', 'reset_n', 'aresetn', 'i_rst_n', 'rst_ni', 'rst', 'reset', 'i_reset', 'areset', 'rst_i']);

export const stripVerilogComments = (code = '') =>
    code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');

const splitTopLevel = (text = ',', delimiter = ',') => {
    const parts = [];
    let current = '';
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === '(') parenDepth += 1;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
        else if (ch === '{') braceDepth += 1;
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (ch === '[') bracketDepth += 1;
        else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (ch === delimiter && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
};

const skipWhitespace = (text, index) => {
    let cursor = index;
    while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
    return cursor;
};

const readBalancedGroup = (text, openIndex, openChar = '(', closeChar = ')') => {
    if (text[openIndex] !== openChar) return null;

    let depth = 0;
    let quote = null;
    for (let index = openIndex; index < text.length; index += 1) {
        const ch = text[index];
        const prev = text[index - 1];

        if (quote) {
            if (ch === quote && prev !== '\\') quote = null;
            continue;
        }

        if (ch === '"') {
            quote = ch;
            continue;
        }

        if (ch === openChar) depth += 1;
        else if (ch === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return {
                    content: text.slice(openIndex + 1, index),
                    endIndex: index,
                };
            }
        }
    }

    return null;
};

const readIdentifier = (text, index) => {
    const match = text.slice(index).match(new RegExp(`^(${IDENTIFIER})`));
    if (!match) return null;
    return {
        value: match[1],
        endIndex: index + match[1].length,
    };
};

const parseNumericRange = (rangeText) => {
    if (!rangeText) return { width: 1, msb: undefined, lsb: undefined, rawRange: undefined, rangeSupported: true };
    const match = rangeText.trim().match(/^(-?\d+)\s*:\s*(-?\d+)$/);
    if (!match) {
        return {
            width: 1,
            msb: undefined,
            lsb: undefined,
            rawRange: `[${rangeText.trim()}]`,
            rangeSupported: false,
        };
    }
    const msb = Number.parseInt(match[1], 10);
    const lsb = Number.parseInt(match[2], 10);
    return { width: Math.abs(msb - lsb) + 1, msb, lsb, rawRange: `[${rangeText.trim()}]`, rangeSupported: true };
};

const normalizePortName = (rawName = '') => {
    const withoutDefault = rawName.split('=')[0].trim();
    const match = withoutDefault.match(new RegExp(`^(${IDENTIFIER})`));
    return match?.[1] || null;
};

const makePort = (direction, name, range) => ({
    name,
    width: range.width,
    msb: range.msb,
    lsb: range.lsb,
    direction,
    rawRange: range.rawRange,
    rangeSupported: range.rangeSupported,
});

const parseAnsiPorts = (portList = '') => {
    const ports = [];
    let currentDirection = null;
    let currentRange = parseNumericRange(null);
    const chunks = splitTopLevel(portList);

    chunks.forEach((chunk) => {
        const declaration = chunk.replace(/\s+/g, ' ').trim();
        if (!declaration) return;

        const directed = declaration.match(
            new RegExp(`^(input|output|inout)\\b\\s*(?:(?:wire|reg|logic|signed|unsigned|tri)\\s+)*(?:\\[([^\\]]+)\\]\\s*)?(.+)$`, 'i')
        );

        let namePart = declaration;
        let range = currentRange;
        if (directed) {
            currentDirection = directed[1].toLowerCase();
            range = parseNumericRange(directed[2]);
            currentRange = range;
            namePart = directed[3];
        }

        if (!currentDirection) return;
        const name = normalizePortName(namePart);
        if (name) ports.push(makePort(currentDirection, name, range));
    });

    return ports;
};

const parseBodyPortDeclarations = (body = '') => {
    const ports = [];
    const declarationRegex = new RegExp(
        `\\b(input|output|inout)\\b\\s*((?:(?:wire|reg|logic|signed|unsigned|tri)\\s+)*)?(?:\\[([^\\]]+)\\]\\s*)?([^;]+);`,
        'gi'
    );
    let match;
    while ((match = declarationRegex.exec(body)) !== null) {
        const direction = match[1].toLowerCase();
        const range = parseNumericRange(match[3]);
        splitTopLevel(match[4]).forEach((rawName) => {
            const name = normalizePortName(rawName);
            if (name) ports.push(makePort(direction, name, range));
        });
    }
    return ports;
};

const mergePorts = (headerPorts, bodyPorts) => {
    const byName = new Map();
    headerPorts.forEach((port) => byName.set(port.name, port));
    bodyPorts.forEach((port) => byName.set(port.name, port));

    const inputs = [];
    const outputs = [];
    const inouts = [];
    byName.forEach((port) => {
        const cleanPort = {
            name: port.name,
            width: port.width,
            msb: port.msb,
            lsb: port.lsb,
            rawRange: port.rawRange,
            rangeSupported: port.rangeSupported,
        };
        if (port.direction === 'input') inputs.push(cleanPort);
        else if (port.direction === 'output') outputs.push(cleanPort);
        else inouts.push(cleanPort);
    });

    return { inputs, outputs, inouts };
};

export const parseModuleDeclarations = (code = '', fileName = 'uploaded.v') => {
    const clean = stripVerilogComments(code);
    const modules = [];
    const moduleRegex = new RegExp(`\\bmodule\\s+(${IDENTIFIER})`, 'g');

    let match;
    while ((match = moduleRegex.exec(clean)) !== null) {
        const [, name] = match;
        let cursor = skipWhitespace(clean, moduleRegex.lastIndex);

        if (clean[cursor] === '#') {
            cursor = skipWhitespace(clean, cursor + 1);
            const parameterGroup = readBalancedGroup(clean, cursor);
            if (!parameterGroup) continue;
            cursor = skipWhitespace(clean, parameterGroup.endIndex + 1);
        }

        const portGroup = readBalancedGroup(clean, cursor);
        if (!portGroup) continue;
        cursor = skipWhitespace(clean, portGroup.endIndex + 1);
        if (clean[cursor] !== ';') continue;

        const bodyStart = cursor + 1;
        const endModuleRegex = /\bendmodule\b/g;
        endModuleRegex.lastIndex = bodyStart;
        const endModuleMatch = endModuleRegex.exec(clean);
        if (!endModuleMatch) continue;

        const portList = portGroup.content;
        const body = clean.slice(bodyStart, endModuleMatch.index);
        const headerPorts = parseAnsiPorts(portList);
        const bodyPorts = parseBodyPortDeclarations(body);
        const { inputs, outputs, inouts } = mergePorts(headerPorts, bodyPorts);

        modules.push({
            name,
            inputs,
            outputs,
            inouts,
            body,
            rawCode: clean.slice(match.index, endModuleRegex.lastIndex).trim(),
            fileName,
        });

        moduleRegex.lastIndex = endModuleRegex.lastIndex;
    }

    return modules;
};

const isConstantExpression = (expression = '') => {
    const clean = expression.trim();
    return (
        /^\d*\s*'\s*[bBoOdDhH]\s*[0-9a-fA-F_xXzZ]+$/.test(clean) ||
        /^\d+$/.test(clean) ||
        /^[01xXzZ]$/.test(clean)
    );
};

const extractConstantExpression = (expression = '') => {
    const clean = expression.trim();
    return isConstantExpression(clean) ? clean.replace(/\s+/g, '') : null;
};

const extractExpressionSignal = (expression = '') => {
    const clean = expression.trim();
    if (!clean || clean === '') return null;
    if (extractConstantExpression(clean)) return null;
    if (clean.startsWith('{')) return null;
    const match = clean.match(new RegExp(`^(${IDENTIFIER})(?:\\s*\\[[^\\]]+\\])?$`));
    if (!match) return null;
    return match[1];
};

const getAutoRouteSignal = (portName = '', signalName = '') => {
    const port = String(portName).toLowerCase();
    const signal = String(signalName).toLowerCase();
    if (CLOCK_ALIASES.has(port) && CLOCK_ALIASES.has(signal)) return signalName;
    if (RESET_ALIASES.has(port) && RESET_ALIASES.has(signal)) return signalName;
    return null;
};

export const parseInstanceDeclarations = (body = '', knownModuleNames = []) => {
    const clean = stripVerilogComments(body);
    const instances = [];
    const known = new Set(knownModuleNames);
    const modulePattern = known.size > 0
        ? Array.from(known).map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        : IDENTIFIER;
    const instanceRegex = new RegExp(`\\b(${modulePattern})\\b`, 'g');

    let match;
    while ((match = instanceRegex.exec(clean)) !== null) {
        const [, moduleName] = match;
        if (RESERVED_WORDS.has(moduleName)) continue;
        if (known.size > 0 && !known.has(moduleName)) continue;

        const previousChar = clean[match.index - 1] || ';';
        if (/[a-zA-Z0-9_$]/.test(previousChar)) continue;

        let cursor = skipWhitespace(clean, instanceRegex.lastIndex);
        if (clean[cursor] === '#') {
            cursor = skipWhitespace(clean, cursor + 1);
            const parameterGroup = readBalancedGroup(clean, cursor);
            if (!parameterGroup) continue;
            cursor = skipWhitespace(clean, parameterGroup.endIndex + 1);
        }

        const instanceIdentifier = readIdentifier(clean, cursor);
        if (!instanceIdentifier) continue;
        const instanceName = instanceIdentifier.value;
        if (RESERVED_WORDS.has(instanceName)) continue;
        cursor = skipWhitespace(clean, instanceIdentifier.endIndex);

        if (clean[cursor] === '[') {
            const arrayGroup = readBalancedGroup(clean, cursor, '[', ']');
            if (!arrayGroup) continue;
            cursor = skipWhitespace(clean, arrayGroup.endIndex + 1);
        }

        const portGroup = readBalancedGroup(clean, cursor);
        if (!portGroup) continue;
        cursor = skipWhitespace(clean, portGroup.endIndex + 1);
        if (clean[cursor] !== ';' && clean[cursor] !== ',') continue;

        const portMap = {};
        let orderedCount = 0;
        splitTopLevel(portGroup.content).forEach((entry) => {
            const named = entry.match(new RegExp(`^\\.(${IDENTIFIER})\\s*\\(([\\s\\S]*)\\)$`));
            if (named) {
                portMap[named[1]] = {
                    expression: named[2].trim(),
                    signal: extractExpressionSignal(named[2]),
                    constant: extractConstantExpression(named[2]),
                };
            } else if (entry.trim()) {
                orderedCount += 1;
            }
        });

        instances.push({ moduleName, instanceName, portMap, orderedCount });
        instanceRegex.lastIndex = cursor + 1;
    }

    return instances;
};

const isLikelyOutputPort = (portName = '') =>
    /(^|_)(y|q|out|dout|data_out|res|result|sum|cout|valid|done|ready|ack)(_|$)/i.test(portName) ||
    /(^y$|^q$|^o$)/i.test(portName);

const uniqueNodeId = (base, used) => {
    const clean = base.replace(/[^a-zA-Z0-9_]/g, '_') || 'inst';
    let candidate = clean;
    let idx = 1;
    while (used.has(candidate)) {
        candidate = `${clean}_${idx}`;
        idx += 1;
    }
    used.add(candidate);
    return candidate;
};

const addExposedPort = (node, exposedPorts, port, isInput, externalName) => {
    const key = `${node.id}__${port.name}`;
    exposedPorts[key] = {
        nodeId: node.id,
        portName: port.name,
        externalName,
        width: port.width || 1,
        msb: port.msb,
        lsb: port.lsb,
        isInput,
    };
    node.data.exposedPorts = { ...(node.data.exposedPorts || {}), [port.name]: true };
};

const findPort = (moduleDef, portName, direction) => {
    if (direction === 'output') return moduleDef?.outputs?.find((p) => p.name === portName);
    if (direction === 'input') return moduleDef?.inputs?.find((p) => p.name === portName);
    return (
        moduleDef?.outputs?.find((p) => p.name === portName) ||
        moduleDef?.inputs?.find((p) => p.name === portName) ||
        moduleDef?.inouts?.find((p) => p.name === portName)
    );
};

const buildPlaceholderModule = (instance, topModule) => {
    const inputPorts = [];
    const outputPorts = [];
    const topOutputs = new Set((topModule?.outputs || []).map((p) => p.name));

    Object.entries(instance.portMap).forEach(([portName, connection]) => {
        const signal = connection.signal;
        const asOutput = topOutputs.has(signal) || isLikelyOutputPort(portName);
        const port = { name: portName, width: 1, msb: undefined, lsb: undefined, inferred: true };
        if (asOutput) outputPorts.push(port);
        else inputPorts.push(port);
    });

    return {
        name: instance.moduleName,
        inputs: inputPorts,
        outputs: outputPorts,
        inouts: [],
        rawCode: `module ${instance.moduleName} (\n${[
            ...inputPorts.map((p) => `  input wire ${p.name}`),
            ...outputPorts.map((p) => `  output wire ${p.name}`),
        ].join(',\n')}\n);\n\n// Placeholder generated from a top-module-only import.\n\nendmodule`,
        fileName: 'inferred',
    };
};

export const buildWorkspaceFromVerilogFiles = (files = [], options = {}) => {
    const theme = options.theme || 'dark';
    const startX = options.startX ?? 80;
    const startY = options.startY ?? 80;
    const warnings = [];
    const modules = [];

    files.forEach((file) => {
        modules.push(...parseModuleDeclarations(file.code, file.name));
    });

    if (modules.length === 0) {
        return { nodes: [], edges: [], exposedPorts: {}, customCodes: {}, modules: [], warnings: ['No module declarations found.'] };
    }

    const moduleMap = new Map();
    modules.forEach((moduleDef) => {
        if (moduleMap.has(moduleDef.name)) {
            warnings.push(`Duplicate module '${moduleDef.name}' found in '${moduleMap.get(moduleDef.name).fileName}' and '${moduleDef.fileName}'; using '${moduleDef.fileName}'.`);
        }
        moduleMap.set(moduleDef.name, moduleDef);
        [...moduleDef.inputs, ...moduleDef.outputs, ...moduleDef.inouts].forEach((port) => {
            if (port.rangeSupported === false) {
                warnings.push(`Port '${moduleDef.name}.${port.name}' uses parameterized range ${port.rawRange}; imported as 1 bit.`);
            }
        });
    });

    const knownNames = Array.from(moduleMap.keys());
    const instanceMap = new Map();
    modules.forEach((moduleDef) => {
        instanceMap.set(moduleDef.name, parseInstanceDeclarations(moduleDef.body, knownNames));
    });

    let topModule = null;
    if (options.topModuleName && moduleMap.has(options.topModuleName)) {
        topModule = moduleMap.get(options.topModuleName);
    } else {
        const instantiatedModules = new Set();
        instanceMap.forEach((instances) => instances.forEach((inst) => instantiatedModules.add(inst.moduleName)));
        const structuralCandidates = modules.filter(
            (moduleDef) => (instanceMap.get(moduleDef.name) || []).length > 0 && !instantiatedModules.has(moduleDef.name)
        );
        topModule =
            structuralCandidates.find((moduleDef) => moduleDef.name === 'top_module') ||
            structuralCandidates[0] ||
            modules.find((moduleDef) => moduleDef.name === 'top_module') ||
            null;
    }

    let topInstances = topModule ? instanceMap.get(topModule.name) || [] : [];
    if (topModule && topInstances.length === 0) {
        topInstances = parseInstanceDeclarations(topModule.body, []);
        topInstances.forEach((instance) => {
            if (!moduleMap.has(instance.moduleName)) {
                moduleMap.set(instance.moduleName, buildPlaceholderModule(instance, topModule));
                warnings.push(`Module '${instance.moduleName}' was not uploaded; created a placeholder using port-name heuristics.`);
            }
        });
    }

    const customCodes = {};
    moduleMap.forEach((moduleDef, moduleName) => {
        if (topModule && moduleName === topModule.name && topInstances.length > 0) return;
        customCodes[moduleName] = moduleDef.rawCode;
    });

    const nodes = [];
    const usedNodeIds = new Set();

    if (topModule && topInstances.length > 0) {
        topInstances.forEach((instance, idx) => {
            const moduleDef = moduleMap.get(instance.moduleName) || buildPlaceholderModule(instance, topModule);
            const nodeId = uniqueNodeId(instance.instanceName, usedNodeIds);
            const autoRoute = {};
            moduleDef.inputs.forEach((port) => {
                const signal = instance.portMap[port.name]?.signal;
                const routeSignal = getAutoRouteSignal(port.name, signal);
                if (routeSignal) autoRoute[port.name] = routeSignal;
            });

            nodes.push({
                id: nodeId,
                type: 'hardware',
                position: {
                    x: startX + (idx % 4) * 245,
                    y: startY + Math.floor(idx / 4) * 170,
                },
                data: {
                    moduleName: instance.moduleName,
                    instanceName: instance.instanceName,
                    theme,
                    inputs: moduleDef.inputs,
                    outputs: moduleDef.outputs,
                    portsSwapped: false,
                    tieoffs: {},
                    exposedPorts: {},
                    autoRoute,
                    importedFromVerilog: true,
                },
            });
        });
    } else {
        Array.from(moduleMap.values()).forEach((moduleDef, idx) => {
            const nodeId = uniqueNodeId(`u_${moduleDef.name}`, usedNodeIds);
            nodes.push({
                id: nodeId,
                type: 'hardware',
                position: {
                    x: startX + (idx % 3) * 245,
                    y: startY + Math.floor(idx / 3) * 170,
                },
                data: {
                    moduleName: moduleDef.name,
                    instanceName: nodeId,
                    theme,
                    inputs: moduleDef.inputs,
                    outputs: moduleDef.outputs,
                    portsSwapped: false,
                    tieoffs: {},
                    exposedPorts: {},
                    autoRoute: {},
                    importedFromVerilog: true,
                },
            });
        });
    }

    const edges = [];
    const exposedPorts = {};

    if (topModule && topInstances.length > 0) {
        const nodeByInstance = new Map(nodes.map((node) => [node.data.instanceName, node]));
        const topInputs = new Set((topModule.inputs || []).map((p) => p.name));
        const topOutputs = new Set((topModule.outputs || []).map((p) => p.name));
        const netMap = new Map();

        const ensureNet = (net) => {
            if (!netMap.has(net)) netMap.set(net, { drivers: [], sinks: [] });
            return netMap.get(net);
        };

        topInstances.forEach((instance) => {
            const node = nodeByInstance.get(instance.instanceName);
            const moduleDef = moduleMap.get(instance.moduleName);
            if (!node || !moduleDef) return;

            if (instance.orderedCount > 0) {
                warnings.push(`Instance '${instance.instanceName}' uses ordered port connections; only named .port(signal) mappings are imported.`);
            }

            Object.entries(instance.portMap).forEach(([portName, connection]) => {
                const outputPort = findPort(moduleDef, portName, 'output');
                const inputPort = findPort(moduleDef, portName, 'input');
                if (!connection.signal) {
                    if (inputPort && connection.constant) {
                        node.data.tieoffs = {
                            ...(node.data.tieoffs || {}),
                            [inputPort.name]: connection.constant,
                        };
                        return;
                    }
                    warnings.push(`Connection '${instance.instanceName}.${portName}' is an expression and was not converted to a canvas edge.`);
                    return;
                }

                const net = ensureNet(connection.signal);
                if (outputPort) net.drivers.push({ node, port: outputPort });
                else if (inputPort) net.sinks.push({ node, port: inputPort });
                else warnings.push(`Port '${instance.moduleName}.${portName}' was not found in the uploaded module definition.`);
            });
        });

        netMap.forEach((net, netName) => {
            if (net.drivers.length > 1) {
                warnings.push(`Net '${netName}' has multiple drivers; using '${net.drivers[0].node.data.instanceName}.${net.drivers[0].port.name}'.`);
            }
            const driver = net.drivers[0];

            if (driver && net.sinks.length > 0) {
                net.sinks.forEach((sink) => {
                    edges.push({
                        id: `e-${driver.node.id}-${driver.port.name}-${sink.node.id}-${sink.port.name}`,
                        source: driver.node.id,
                        sourceHandle: driver.port.name,
                        target: sink.node.id,
                        targetHandle: sink.port.name,
                        type: 'smart',
                        data: {
                            bitWidth: Math.min(driver.port.width || 1, sink.port.width || 1),
                            manualBitWidth: false,
                            importedNet: netName,
                        },
                    });
                });
            }

            if (!driver) {
                net.sinks.forEach((sink) => {
                    if (sink.node.data.autoRoute?.[sink.port.name]) return;
                    if (topInputs.has(netName) || !topOutputs.has(netName)) addExposedPort(sink.node, exposedPorts, sink.port, true, netName);
                });
            }

            if (driver && topOutputs.has(netName)) addExposedPort(driver.node, exposedPorts, driver.port, false, netName);
        });
    }

    return {
        nodes,
        edges,
        exposedPorts,
        customCodes,
        modules: Array.from(moduleMap.values()),
        topModuleName: topModule?.name || null,
        warnings,
    };
};

export const generateTestbenchFromModule = (moduleDef, moduleName = moduleDef?.name || 'top_module') => {
    const inputs = moduleDef?.inputs || [];
    const outputs = moduleDef?.outputs || [];
    const declRange = (port) => (port.width > 1 ? `[${port.msb ?? port.width - 1}:${port.lsb ?? 0}] ` : '');

    let code = `\`timescale 1ns / 1ps\n\nmodule ${moduleName}_tb();\n`;
    inputs.forEach((port) => {
        code += `  reg ${declRange(port)}${port.name};\n`;
    });
    outputs.forEach((port) => {
        code += `  wire ${declRange(port)}${port.name};\n`;
    });

    code += `\n  ${moduleName} uut (\n`;
    code += [...inputs, ...outputs].map((port) => `    .${port.name}(${port.name})`).join(',\n');
    code += `\n  );\n\n  initial begin\n`;
    inputs.forEach((port) => {
        code += `    ${port.name} = ${port.width || 1}'b0;\n`;
    });
    code += `\n    #20;\n`;
    inputs.forEach((port) => {
        code += `    ${port.name} = ${port.width > 1 ? `${port.width}'hAA` : "1'b1"};\n`;
    });
    code += `\n    #40;\n    $finish;\n  end\n\nendmodule\n`;
    return code;
};

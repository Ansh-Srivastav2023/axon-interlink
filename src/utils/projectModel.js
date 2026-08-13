export const PROJECT_SCHEMA_VERSION = '2.0.0';
export const PROJECT_SCHEMA_ID = 'axon-interlink-project';
export const LEGACY_WORKSPACE_VERSION = '1.0.0';
export const DEFAULT_CANVAS_ID = 'canvas_top_module';
export const DEFAULT_TOP_MODULE_NAME = 'top_module';

const emptyObject = Object.freeze({});

const sanitizeIdentifier = (value, fallback = 'item') => {
    const cleaned = String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^_+/, '')
        .replace(/_+$/, '');
    return cleaned || fallback;
};

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stableId = (prefix, name) => `${prefix}_${sanitizeIdentifier(name).toLowerCase()}`;

const makeUniqueId = (baseId, usedIds) => {
    const base = sanitizeIdentifier(baseId, 'id').toLowerCase();
    let candidate = base;
    let index = 1;
    while (usedIds.has(candidate)) {
        candidate = `${base}_${index}`;
        index += 1;
    }
    usedIds.add(candidate);
    return candidate;
};

const cloneArray = (value) => (Array.isArray(value) ? value.map((entry) => ({ ...entry })) : []);

const cloneJsonValue = (value, fallback) => {
    if (value === undefined || value === null) return fallback;
    return JSON.parse(JSON.stringify(value));
};

const isStructuralNode = (node) => Boolean(node?.data?.isSplitter || node?.data?.isBundler || node?.type === 'splitter');

const getModuleNamesFromFlatState = (nodes = [], customCodes = emptyObject) => {
    const names = new Set();
    nodes.forEach((node) => {
        const moduleName = node?.data?.moduleName;
        if (moduleName && !isStructuralNode(node)) names.add(moduleName);
    });
    Object.keys(customCodes || {}).forEach((moduleName) => {
        if (moduleName) names.add(moduleName);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
};

const findRepresentativeNode = (moduleName, nodes = []) =>
    nodes.find((node) => node?.data?.moduleName === moduleName && !isStructuralNode(node));

const normalizePorts = (ports = []) =>
    cloneArray(ports).map((port) => ({
        name: sanitizeIdentifier(port.name, 'port'),
        width: Number(port.width) || 1,
        msb: Number.isFinite(Number(port.msb)) ? Number(port.msb) : (Number(port.width) || 1) - 1,
        lsb: Number.isFinite(Number(port.lsb)) ? Number(port.lsb) : 0,
    }));

const portsFromRepresentativeNode = (moduleName, nodes = []) => {
    const node = findRepresentativeNode(moduleName, nodes);
    return {
        inputs: normalizePorts(node?.data?.inputs),
        outputs: normalizePorts(node?.data?.outputs),
        inouts: [],
    };
};

const addOrMergePort = (target, port) => {
    const existingIndex = target.findIndex((entry) => entry.name === port.name);
    if (existingIndex < 0) {
        target.push(port);
        return;
    }

    const existing = target[existingIndex];
    if ((port.width || 1) > (existing.width || 1)) {
        target[existingIndex] = port;
    }
};

export const portsFromExposedPorts = (exposedPorts = emptyObject) => {
    const inputs = [];
    const outputs = [];
    const seenTopPortDirections = new Map();
    Object.values(exposedPorts || {}).forEach((port) => {
        const normalized = {
            name: sanitizeIdentifier(port.externalName || port.portName || port.name, 'port'),
            width: Number(port.width) || 1,
            msb: Number.isFinite(Number(port.msb)) ? Number(port.msb) : (Number(port.width) || 1) - 1,
            lsb: Number.isFinite(Number(port.lsb)) ? Number(port.lsb) : 0,
        };

        const direction = port.isInput ? 'input' : 'output';
        const existingDirection = seenTopPortDirections.get(normalized.name);
        if (existingDirection) {
            if (existingDirection !== direction) return;
            const target = port.isInput ? inputs : outputs;
            addOrMergePort(target, normalized);
            return;
        }

        seenTopPortDirections.set(normalized.name, direction);
        if (port.isInput) addOrMergePort(inputs, normalized);
        else addOrMergePort(outputs, normalized);
    });
    return { inputs, outputs, inouts: [] };
};

const findPreviousFileForModule = (previousProject, moduleName) => {
    if (!previousProject?.modules || !previousProject?.files) return null;
    const previousModule = Object.values(previousProject.modules).find((moduleDef) => moduleDef?.name === moduleName);
    if (!previousModule?.fileId) return null;
    return previousProject.files[previousModule.fileId] || null;
};

const deriveProjectSettings = (theme, previousProject) => ({
    activeHierarchyMode: previousProject?.settings?.activeHierarchyMode || 'flat-canvas',
    topModuleStrategy: previousProject?.settings?.topModuleStrategy || 'single-active-canvas',
    theme,
});

const getModuleNameSet = (modules) => new Set(Object.values(modules || {}).map((moduleDef) => moduleDef?.name).filter(Boolean));

const exposedPortsToModulePorts = (exposedPorts = emptyObject) => portsFromExposedPorts(exposedPorts);

export function createProjectFromFlatState({
    nodes = [],
    edges = [],
    customCodes = {},
    exposedPorts = {},
    theme = 'dark',
    previousProject = null,
} = {}) {
    const moduleNames = getModuleNamesFromFlatState(nodes, customCodes);
    const files = {};
    const modules = {};
    const usedFileIds = new Set();
    const usedModuleIds = new Set();

    moduleNames.forEach((moduleName) => {
        const previousFile = findPreviousFileForModule(previousProject, moduleName);
        const fileId = Object.prototype.hasOwnProperty.call(customCodes || {}, moduleName)
            ? makeUniqueId(stableId('file', moduleName), usedFileIds)
            : null;
        const moduleId = makeUniqueId(stableId('mod', moduleName), usedModuleIds);
        const rawCode = customCodes?.[moduleName] || previousFile?.content || '';

        if (fileId) {
            files[fileId] = {
                id: fileId,
                name: `${moduleName}.v`,
                path: previousFile?.path || `rtl/${moduleName}.v`,
                type: 'rtl',
                language: 'verilog',
                moduleIds: [moduleId],
                content: rawCode,
                source: previousFile?.source || 'canvas-editor',
                dirty: false,
                generated: false,
            };
        }

        modules[moduleId] = {
            id: moduleId,
            name: moduleName,
            kind: previousProject
                ? Object.values(previousProject.modules || {}).find((moduleDef) => moduleDef?.name === moduleName)?.kind || (fileId ? 'leaf' : 'external')
                : fileId ? 'leaf' : 'external',
            fileId,
            ports: portsFromRepresentativeNode(moduleName, nodes),
            parameters: [],
            rawCode,
            canvasId: previousProject
                ? Object.values(previousProject.modules || {}).find((moduleDef) => moduleDef?.name === moduleName)?.canvasId || null
                : null,
        };
    });

    const activeCanvasId = previousProject?.activeCanvasId || DEFAULT_CANVAS_ID;
    const activeTopName = previousProject?.topModuleName || DEFAULT_TOP_MODULE_NAME;
    let activeTopModule = Object.values(modules).find((moduleDef) => moduleDef.name === activeTopName);

    if (!activeTopModule) {
        const activeTopModuleId = makeUniqueId(stableId('mod', activeTopName), usedModuleIds);
        activeTopModule = {
            id: activeTopModuleId,
            name: activeTopName,
            kind: 'hierarchical',
            fileId: null,
            ports: portsFromExposedPorts(exposedPorts),
            parameters: [],
            rawCode: '',
            canvasId: activeCanvasId,
        };
        modules[activeTopModuleId] = activeTopModule;
    } else {
        activeTopModule = {
            ...activeTopModule,
            kind: activeTopModule.kind === 'external' ? 'hierarchical' : activeTopModule.kind,
            canvasId: activeCanvasId,
            ports: activeTopModule.ports?.inputs?.length || activeTopModule.ports?.outputs?.length
                ? activeTopModule.ports
                : portsFromExposedPorts(exposedPorts),
        };
        modules[activeTopModule.id] = activeTopModule;
    }

    const preservedCanvases = cloneJsonValue(previousProject?.canvases, {});
    const canvases = {
        ...preservedCanvases,
        [activeCanvasId]: {
            id: activeCanvasId,
            name: activeTopName,
            moduleId: activeTopModule.id,
            nodes: cloneJsonValue(nodes, []),
            edges: cloneJsonValue(edges, []),
            exposedPorts: cloneJsonValue(exposedPorts, {}),
            layout: {
                viewport: previousProject?.canvases?.[activeCanvasId]?.layout?.viewport || null,
            },
        },
    };

    const liveModuleNames = getModuleNameSet(modules);
    Object.values(previousProject?.modules || {}).forEach((moduleDef) => {
        if (!moduleDef?.name || liveModuleNames.has(moduleDef.name)) return;
        if (!moduleDef.canvasId || !canvases[moduleDef.canvasId]) return;
        modules[moduleDef.id] = cloneJsonValue(moduleDef, moduleDef);
        liveModuleNames.add(moduleDef.name);
    });

    Object.values(previousProject?.files || {}).forEach((file) => {
        if (!file?.id || files[file.id]) return;
        const hasLiveModule = (file.moduleIds || []).some((moduleId) => modules[moduleId]);
        if (hasLiveModule) files[file.id] = cloneJsonValue(file, file);
    });

    return {
        schema: PROJECT_SCHEMA_ID,
        version: PROJECT_SCHEMA_VERSION,
        activeCanvasId,
        topModuleName: activeTopName,
        topModuleId: activeTopModule.id,
        files,
        modules,
        canvases,
        testbenches: previousProject?.testbenches || {},
        generatedFiles: previousProject?.generatedFiles || {},
        warnings: [],
        settings: deriveProjectSettings(theme, previousProject),
    };
}

export function getCanvasSummaries(project) {
    return Object.values(project?.canvases || {})
        .map((canvas) => {
            const moduleDef = project?.modules?.[canvas.moduleId];
            return {
                id: canvas.id,
                name: canvas.name,
                moduleId: canvas.moduleId,
                moduleName: moduleDef?.name || canvas.name,
                isActive: project?.activeCanvasId === canvas.id,
                nodeCount: Array.isArray(canvas.nodes) ? canvas.nodes.length : 0,
                edgeCount: Array.isArray(canvas.edges) ? canvas.edges.length : 0,
                exposedPortCount: Object.keys(canvas.exposedPorts || {}).length,
            };
        })
        .sort((a, b) => {
            if (a.isActive) return -1;
            if (b.isActive) return 1;
            return a.moduleName.localeCompare(b.moduleName);
        });
}

export function updateActiveCanvasInProject(project, { nodes = [], edges = [], exposedPorts = {}, theme = 'dark' } = {}) {
    const baseProject = project?.schema === PROJECT_SCHEMA_ID
        ? cloneJsonValue(project, project)
        : createProjectFromFlatState({ nodes, edges, exposedPorts, theme });
    const activeCanvasId = baseProject.activeCanvasId || DEFAULT_CANVAS_ID;
    const activeCanvas = baseProject.canvases?.[activeCanvasId] || {
        id: activeCanvasId,
        name: baseProject.topModuleName || DEFAULT_TOP_MODULE_NAME,
        moduleId: baseProject.topModuleId,
    };
    const activeModule = baseProject.modules?.[activeCanvas.moduleId];

    return {
        ...baseProject,
        canvases: {
            ...(baseProject.canvases || {}),
            [activeCanvasId]: {
                ...activeCanvas,
                nodes: cloneJsonValue(nodes, []),
                edges: cloneJsonValue(edges, []),
                exposedPorts: cloneJsonValue(exposedPorts, {}),
            },
        },
        modules: {
            ...(baseProject.modules || {}),
            ...(activeModule
                ? {
                    [activeModule.id]: {
                        ...activeModule,
                        ports: exposedPortsToModulePorts(exposedPorts),
                        canvasId: activeCanvasId,
                    },
                }
                : {}),
        },
        settings: deriveProjectSettings(theme, baseProject),
    };
}

export function createCanvasInProject(project, { name, theme = 'dark' } = {}) {
    const cleanName = sanitizeIdentifier(name || DEFAULT_TOP_MODULE_NAME, DEFAULT_TOP_MODULE_NAME);
    const baseProject = project?.schema === PROJECT_SCHEMA_ID
        ? cloneJsonValue(project, project)
        : createProjectFromFlatState({ theme });
    const usedCanvasIds = new Set(Object.keys(baseProject.canvases || {}));
    const usedModuleIds = new Set(Object.keys(baseProject.modules || {}));
    const canvasId = makeUniqueId(stableId('canvas', cleanName), usedCanvasIds);
    const moduleId = makeUniqueId(stableId('mod', cleanName), usedModuleIds);

    return {
        ...baseProject,
        activeCanvasId: canvasId,
        topModuleName: cleanName,
        topModuleId: moduleId,
        canvases: {
            ...(baseProject.canvases || {}),
            [canvasId]: {
                id: canvasId,
                name: cleanName,
                moduleId,
                nodes: [],
                edges: [],
                exposedPorts: {},
                layout: { viewport: null },
            },
        },
        modules: {
            ...(baseProject.modules || {}),
            [moduleId]: {
                id: moduleId,
                name: cleanName,
                kind: 'hierarchical',
                fileId: null,
                ports: { inputs: [], outputs: [], inouts: [] },
                parameters: [],
                rawCode: '',
                canvasId,
            },
        },
        settings: deriveProjectSettings(theme, baseProject),
    };
}

export function switchActiveCanvasInProject(project, canvasId, currentState = {}) {
    const savedProject = updateActiveCanvasInProject(project, currentState);
    const targetCanvas = savedProject.canvases?.[canvasId];
    if (!targetCanvas) {
        return {
            project: savedProject,
            state: {
                nodes: currentState.nodes || [],
                edges: currentState.edges || [],
                exposedPorts: currentState.exposedPorts || {},
            },
        };
    }

    const targetModule = savedProject.modules?.[targetCanvas.moduleId];
    const nextProject = {
        ...savedProject,
        activeCanvasId: canvasId,
        topModuleId: targetCanvas.moduleId || savedProject.topModuleId,
        topModuleName: targetModule?.name || targetCanvas.name || DEFAULT_TOP_MODULE_NAME,
    };

    return {
        project: nextProject,
        state: {
            nodes: targetCanvas.nodes || [],
            edges: targetCanvas.edges || [],
            exposedPorts: targetCanvas.exposedPorts || {},
        },
    };
}

export function getCanvasModuleDefinition(project, canvasId) {
    const canvas = project?.canvases?.[canvasId];
    if (!canvas) return null;
    const moduleDef = project?.modules?.[canvas.moduleId];
    if (!moduleDef) return null;
    return {
        ...moduleDef,
        ports: moduleDef.ports || exposedPortsToModulePorts(canvas.exposedPorts),
    };
}

const removeCanvasModuleInstances = (canvas, moduleName, sourceCanvasId) => {
    if (!canvas || !moduleName) return canvas;

    const removedNodeIds = new Set(
        (canvas.nodes || [])
            .filter((node) => node?.data?.moduleName === moduleName || node?.data?.sourceCanvasId === sourceCanvasId)
            .map((node) => node.id)
    );

    if (removedNodeIds.size === 0) return canvas;

    const exposedPorts = {};
    Object.entries(canvas.exposedPorts || {}).forEach(([key, port]) => {
        if (!removedNodeIds.has(port.nodeId)) exposedPorts[key] = port;
    });

    return {
        ...canvas,
        nodes: (canvas.nodes || []).filter((node) => !removedNodeIds.has(node.id)),
        edges: (canvas.edges || []).filter((edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)),
        exposedPorts,
    };
};

const renameModuleDeclaration = (code, oldName, newName) => {
    if (typeof code !== 'string' || !oldName || !newName || oldName === newName) return code;
    return code.replace(new RegExp(`\\bmodule\\s+${escapeRegExp(oldName)}\\b`), `module ${newName}`);
};

const renameCanvasModuleReferences = (canvas, oldName, newName, sourceCanvasId) => {
    if (!canvas || !oldName || !newName || oldName === newName) return canvas;

    const nextNodes = (canvas.nodes || []).map((node) => {
        const shouldRename =
            node?.data?.sourceCanvasId === sourceCanvasId ||
            node?.data?.moduleName === oldName;
        if (!shouldRename) return node;

        return {
            ...node,
            data: {
                ...(node.data || {}),
                moduleName: newName,
            },
        };
    });

    return {
        ...canvas,
        nodes: nextNodes,
    };
};

export function renameCanvasInProject(project, canvasId, requestedName, currentState = {}) {
    const baseProject = updateActiveCanvasInProject(project, currentState);
    const targetCanvas = baseProject.canvases?.[canvasId];
    if (!targetCanvas) {
        return {
            ok: false,
            reason: 'Canvas was not found.',
            project: baseProject,
            state: currentState,
        };
    }

    const targetModule = baseProject.modules?.[targetCanvas.moduleId];
    const oldName = targetModule?.name || targetCanvas.name;
    const newName = sanitizeIdentifier(requestedName || oldName, oldName);

    if (!newName) {
        return {
            ok: false,
            reason: 'Canvas name cannot be empty.',
            project: baseProject,
            state: currentState,
        };
    }

    if (newName === oldName) {
        const activeCanvas = baseProject.canvases?.[baseProject.activeCanvasId] || targetCanvas;
        return {
            ok: true,
            unchanged: true,
            oldName,
            newName,
            project: baseProject,
            state: {
                nodes: activeCanvas.nodes || [],
                edges: activeCanvas.edges || [],
                exposedPorts: activeCanvas.exposedPorts || {},
            },
        };
    }

    const hasNameConflict = Object.values(baseProject.modules || {}).some(
        (moduleDef) => moduleDef?.id !== targetCanvas.moduleId && moduleDef?.name === newName
    );
    if (hasNameConflict) {
        return {
            ok: false,
            reason: `A module or canvas named '${newName}' already exists.`,
            project: baseProject,
            state: currentState,
        };
    }

    const nextFiles = { ...(baseProject.files || {}) };
    const nextModules = { ...(baseProject.modules || {}) };
    const nextCanvases = {};

    Object.entries(baseProject.canvases || {}).forEach(([id, canvas]) => {
        const renamedCanvas = renameCanvasModuleReferences(canvas, oldName, newName, canvasId);
        nextCanvases[id] = id === canvasId
            ? {
                ...renamedCanvas,
                name: newName,
            }
            : renamedCanvas;
    });

    if (targetModule) {
        const nextRawCode = renameModuleDeclaration(targetModule.rawCode, oldName, newName);
        nextModules[targetModule.id] = {
            ...targetModule,
            name: newName,
            rawCode: nextRawCode,
        };

        if (targetModule.fileId && nextFiles[targetModule.fileId]) {
            nextFiles[targetModule.fileId] = {
                ...nextFiles[targetModule.fileId],
                name: `${newName}.v`,
                path: `rtl/${newName}.v`,
                content: renameModuleDeclaration(nextFiles[targetModule.fileId].content, oldName, newName),
            };
        }
    }

    const nextActiveCanvas = nextCanvases[baseProject.activeCanvasId] || Object.values(nextCanvases)[0];
    const nextActiveModule = nextModules[nextActiveCanvas?.moduleId];
    const nextProject = {
        ...baseProject,
        files: nextFiles,
        modules: nextModules,
        canvases: nextCanvases,
        topModuleId: nextActiveModule?.id || baseProject.topModuleId,
        topModuleName: nextActiveModule?.name || nextActiveCanvas?.name || baseProject.topModuleName || DEFAULT_TOP_MODULE_NAME,
    };

    return {
        ok: true,
        oldName,
        newName,
        canvasId,
        project: nextProject,
        state: {
            nodes: nextActiveCanvas?.nodes || [],
            edges: nextActiveCanvas?.edges || [],
            exposedPorts: nextActiveCanvas?.exposedPorts || {},
        },
    };
}

export function deleteCanvasFromProject(project, canvasId, currentState = {}) {
    const baseProject = updateActiveCanvasInProject(project, currentState);
    const targetCanvas = baseProject.canvases?.[canvasId];
    if (!targetCanvas) {
        return {
            ok: false,
            reason: 'Canvas was not found.',
            project: baseProject,
            state: currentState,
        };
    }

    const canvasIds = Object.keys(baseProject.canvases || {});
    if (canvasIds.length <= 1) {
        return {
            ok: false,
            reason: 'At least one canvas must remain in the project.',
            project: baseProject,
            state: currentState,
        };
    }

    const deletedModule = baseProject.modules?.[targetCanvas.moduleId];
    const deletedModuleName = deletedModule?.name || targetCanvas.name;
    const nextCanvases = {};

    Object.entries(baseProject.canvases || {}).forEach(([id, canvas]) => {
        if (id === canvasId) return;
        nextCanvases[id] = removeCanvasModuleInstances(canvas, deletedModuleName, canvasId);
    });

    const nextModules = {};
    Object.entries(baseProject.modules || {}).forEach(([id, moduleDef]) => {
        if (id !== targetCanvas.moduleId) nextModules[id] = moduleDef;
    });

    const nextFiles = {};
    Object.entries(baseProject.files || {}).forEach(([id, file]) => {
        const moduleIds = (file.moduleIds || []).filter((moduleId) => moduleId !== targetCanvas.moduleId);
        if (moduleIds.length > 0) nextFiles[id] = { ...file, moduleIds };
    });

    const nextActiveCanvasId = baseProject.activeCanvasId === canvasId
        ? Object.keys(nextCanvases)[0]
        : baseProject.activeCanvasId;
    const nextActiveCanvas = nextCanvases[nextActiveCanvasId] || Object.values(nextCanvases)[0];
    const nextActiveModule = nextModules[nextActiveCanvas?.moduleId];

    const nextProject = {
        ...baseProject,
        activeCanvasId: nextActiveCanvas?.id || nextActiveCanvasId,
        topModuleName: nextActiveModule?.name || nextActiveCanvas?.name || DEFAULT_TOP_MODULE_NAME,
        topModuleId: nextActiveModule?.id || nextActiveCanvas?.moduleId || baseProject.topModuleId,
        files: nextFiles,
        modules: nextModules,
        canvases: nextCanvases,
    };

    return {
        ok: true,
        project: nextProject,
        state: {
            nodes: nextActiveCanvas?.nodes || [],
            edges: nextActiveCanvas?.edges || [],
            exposedPorts: nextActiveCanvas?.exposedPorts || {},
        },
        deletedCanvasName: targetCanvas.name,
        deletedModuleName,
    };
}

export function getCustomCodesFromProject(project, fallback = {}) {
    if (!project?.modules || !project?.files) return fallback || {};

    const codes = {};
    Object.values(project.modules).forEach((moduleDef) => {
        if (!moduleDef?.name) return;
        const fileContent = moduleDef.fileId ? project.files[moduleDef.fileId]?.content : null;
        if (typeof fileContent === 'string') codes[moduleDef.name] = fileContent;
        else if (typeof moduleDef.rawCode === 'string' && moduleDef.rawCode.trim()) codes[moduleDef.name] = moduleDef.rawCode;
    });

    return Object.keys(codes).length > 0 ? codes : fallback || {};
}

export function workspacePayloadToFlatState(payload = {}) {
    const project = payload.project?.schema === PROJECT_SCHEMA_ID
        ? payload.project
        : createProjectFromFlatState({
            nodes: payload.nodes || [],
            edges: payload.edges || [],
            customCodes: payload.customCodes || {},
            exposedPorts: payload.exposedPorts || {},
            theme: payload.theme || 'dark',
        });

    const activeCanvas =
        project.canvases?.[project.activeCanvasId] ||
        Object.values(project.canvases || {})[0] ||
        {};

    return {
        nodes: activeCanvas.nodes || payload.nodes || [],
        edges: activeCanvas.edges || payload.edges || [],
        customCodes: getCustomCodesFromProject(project, payload.customCodes || {}),
        exposedPorts: activeCanvas.exposedPorts || payload.exposedPorts || {},
        theme: payload.theme || project.settings?.theme || 'dark',
        project,
    };
}

export function createWorkspacePayload({
    nodes = [],
    edges = [],
    customCodes = {},
    exposedPorts = {},
    theme = 'dark',
    previousProject = null,
} = {}) {
    const project = createProjectFromFlatState({
        nodes,
        edges,
        customCodes,
        exposedPorts,
        theme,
        previousProject,
    });

    return {
        schema: PROJECT_SCHEMA_ID,
        version: PROJECT_SCHEMA_VERSION,
        legacyVersion: LEGACY_WORKSPACE_VERSION,
        nodes,
        edges,
        customCodes,
        exposedPorts,
        theme,
        project,
    };
}

export function validateProjectModel(project) {
    const issues = [];

    if (project?.schema !== PROJECT_SCHEMA_ID) issues.push('Project schema id is missing or invalid.');
    if (project?.version !== PROJECT_SCHEMA_VERSION) issues.push('Project schema version is missing or invalid.');
    if (!project?.activeCanvasId || !project?.canvases?.[project.activeCanvasId]) {
        issues.push('Active canvas is missing.');
    }
    if (!project?.topModuleId || !project?.modules?.[project.topModuleId]) {
        issues.push('Top module is missing.');
    }

    Object.values(project?.files || {}).forEach((file) => {
        (file.moduleIds || []).forEach((moduleId) => {
            if (!project.modules?.[moduleId]) issues.push(`File ${file.name || file.id} references missing module ${moduleId}.`);
        });
    });

    Object.values(project?.modules || {}).forEach((moduleDef) => {
        if (moduleDef.fileId && !project.files?.[moduleDef.fileId]) {
            issues.push(`Module ${moduleDef.name || moduleDef.id} references missing file ${moduleDef.fileId}.`);
        }
        if (moduleDef.canvasId && !project.canvases?.[moduleDef.canvasId]) {
            issues.push(`Module ${moduleDef.name || moduleDef.id} references missing canvas ${moduleDef.canvasId}.`);
        }
    });

    return issues;
}

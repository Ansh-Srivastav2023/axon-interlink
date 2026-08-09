import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { addEdge, useNodesState, useEdgesState, useReactFlow, reconnectEdge, ConnectionMode } from '@xyflow/react';

import { ResizeHandle, SmartEdge, LeftPanel, Canvas, RightPanel } from './components';
import { GateNode, HardwareNode, SplitterNode } from './nodes';
import { themes } from './styles';
import getStyles from './styles/getStyles';
import { STANDARD_LIBRARY, parsePorts, getPortLabel, getSmartSpawnPosition, validatePorts } from './utils/hardwareutils';
import { sanitizeGraph } from './utils/graphValidation';
import { buildWorkspaceFromVerilogFiles, generateTestbenchFromModule, parseInstanceDeclarations, parseModuleDeclarations } from './utils/verilogImport';
import {
    createCanvasInProject,
    createWorkspacePayload,
    DEFAULT_TOP_MODULE_NAME,
    deleteCanvasFromProject,
    getCanvasModuleDefinition,
    portsFromExposedPorts,
    switchActiveCanvasInProject,
    workspacePayloadToFlatState,
} from './utils/projectModel';
import { generateStructuralVerilog } from './utils/verilogGenerate';
import { parseVerilogToPorts } from './verilog-code/verilogEdits';
import Header from './utils/Header';
import { HelpModal, ClearModal, SaveModal, ErrorModal, ContextualModal } from './modals';
import { useFileOperations, useHistory } from './hooks';

const edgeTypes = { smart: SmartEdge };
const nodeTypes = { hardware: HardwareNode, gate: GateNode, splitter: SplitterNode };
const GLOBAL_NET_NAMES = new Set(['clk', 'clock', 'rst', 'reset', 'rst_n', 'reset_n']);
const CLOCK_ALIASES = new Set(['clk', 'clock', 'i_clk', 'aclk', 'clk_i']);
const RESET_ALIASES = new Set(['rst_n', 'reset_n', 'aresetn', 'i_rst_n', 'rst_ni', 'rst', 'reset', 'i_reset', 'areset', 'rst_i']);
const MODULE_WIRE_COLORS = [
    '#60a5fa',
    '#34d399',
    '#f59e0b',
    '#a78bfa',
    '#fb7185',
    '#22d3ee',
    '#f472b6',
    '#84cc16',
    '#f97316',
    '#38bdf8',
    '#c084fc',
    '#2dd4bf',
];

const edgeNetName = (edge) => edge?.data?.importedNet || edge?.targetHandle || edge?.sourceHandle || '';
const isGlobalNetEdge = (edge) => GLOBAL_NET_NAMES.has(String(edgeNetName(edge)).toLowerCase());
const getDefaultAutoRouteSignal = (portName = '') => {
    const normalized = String(portName).toLowerCase();
    if (CLOCK_ALIASES.has(normalized)) return portName;
    if (RESET_ALIASES.has(normalized)) return portName;
    return null;
};

const getModuleWireColor = (moduleName = '') => {
    const key = String(moduleName || 'unknown');
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
        hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
    }
    return MODULE_WIRE_COLORS[Math.abs(hash) % MODULE_WIRE_COLORS.length];
};

const shallowExposureFlagsEqual = (left = {}, right = {}) => {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => !!left[key] === !!right[key]);
};

const syncNodeExposureFlags = (currentNodes = [], currentExposedPorts = {}) => {
    const flagsByNode = new Map();
    Object.values(currentExposedPorts || {}).forEach((port) => {
        if (!port?.nodeId || !port?.portName) return;
        if (!flagsByNode.has(port.nodeId)) flagsByNode.set(port.nodeId, {});
        flagsByNode.get(port.nodeId)[port.portName] = true;
    });

    let changed = false;
    const syncedNodes = currentNodes.map((node) => {
        const nextFlags = flagsByNode.get(node.id) || {};
        const currentFlags = node.data?.exposedPorts || {};
        if (shallowExposureFlagsEqual(currentFlags, nextFlags)) return node;
        changed = true;
        return {
            ...node,
            data: {
                ...node.data,
                exposedPorts: nextFlags,
            },
        };
    });

    return changed ? syncedNodes : currentNodes;
};

export default function FlowCanvas() {
    // ============================================================
    // 1. THEME & UI STATE
    // ============================================================
    const [theme, setTheme] = useState('dark');
    const t = themes[theme];
    const mainRef = useRef(null);
    const helpColors = theme === 'dark'
        ? {
            text: '#93c5fd',
            border: 'rgba(96,165,250,0.25)',
            bg: 'rgba(96,165,250,0.08)',
            glow: 'rgba(96,165,250,0.35)',
        }
        : {
            text: '#2563eb',
            border: 'rgba(37,99,235,0.30)',
            bg: 'rgba(37,99,235,0.10)',
            glow: 'rgba(37,99,235,0.28)',
        };
    const fileInputRef = useRef(null);

    const [traceGlowingEdgeId, setTraceGlowingEdgeId] = useState(null);
    const { screenToFlowPosition, fitView, setCenter } = useReactFlow();

    // ============================================================
    // 2. PANEL RESIZE STATE & HANDLERS
    // ============================================================
    const dragRef = useRef({ left: false, right: false, startX: 0, startW: 0 });
    const [leftCollapsed, setLeftCollapsed] = useState(true);
    const [rightCollapsed, setRightCollapsed] = useState(true);
    const [leftWidth, setLeftWidth] = useState(385);
    const [rightWidth, setRightWidth] = useState(420);
    const [draggingLeft, setDraggingLeft] = useState(false);
    const [draggingRight, setDraggingRight] = useState(false);

    const onMouseDownLeft = useCallback(
        (e) => {
            e.preventDefault();
            dragRef.current = { left: true, right: false, startX: e.clientX, startW: leftWidth };
            setDraggingLeft(true);
        },
        [leftWidth]
    );

    const onMouseDownRight = useCallback(
        (e) => {
            e.preventDefault();
            dragRef.current = { left: false, right: true, startX: e.clientX, startW: rightWidth };
            setDraggingRight(true);
        },
        [rightWidth]
    );

    useEffect(() => {
        const onMove = (e) => {
            const { left, right, startX, startW } = dragRef.current;
            if (left) setLeftWidth(Math.max(220, Math.min(500, startW + (e.clientX - startX))));
            if (right) setRightWidth(Math.max(250, Math.min(700, startW + (startX - e.clientX))));
        };
        const onUp = () => {
            dragRef.current.left = false;
            dragRef.current.right = false;
            setDraggingLeft(false);
            setDraggingRight(false);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    // ============================================================
    // 3. NODES, EDGES, SELECTION & WARNINGS
    // ============================================================
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [glowingNet, setGlowingNet] = useState(null);
    const [wireViewMode, setWireViewMode] = useState('clean');
    const [colorWiresByModule, setColorWiresByModule] = useState(false);
    const [animateWireFlow, setAnimateWireFlow] = useState(false);

    const [customCodes, setCustomCodes] = useState({});
    const [exposedPorts, setExposedPorts] = useState({});
    const [projectModel, setProjectModel] = useState(null);

    // ============================================================
    // 4. LEFT PANEL TABS & SEARCH / TRACE STATE
    // ============================================================
    const [moduleSearchQuery, setModuleSearchQuery] = useState('');
    const [moduleSearchFocusIdx, setModuleSearchFocusIdx] = useState(0);
    const [, setSearchHighlightIds] = useState(new Set());

    const [hierarchySearchQuery, setHierarchySearchQuery] = useState('');
    const [hierarchyResults, setHierarchyResults] = useState(null);
    const [hierarchyExpanded, setHierarchyExpanded] = useState({});
    const [leftTab, setLeftTab] = useState('library');

    const [selectedStandardBlock, setSelectedStandardBlock] = useState('and_gate');
    const [isLibOpen, setIsLibOpen] = useState(false);

    const [showHelp, setShowHelp] = useState(false);
    const [importStatus, setImportStatus] = useState(null);
    const [uploadedTopTestbenchCode, setUploadedTopTestbenchCode] = useState('');

    // ============================================================
    // 5. RIGHT PANEL VIEW MODE & COPY
    // ============================================================
    const [topViewMode, setTopViewMode] = useState('code');
    const [copied, setCopied] = useState(false);

    // ============================================================
    // 6. MODALS (CONFIG, SAVE, CLEAR)
    // ============================================================
    const [activeModal, setActiveModal] = useState({ type: null, id: null });
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [proposedFileName, setProposedFileName] = useState('');
    const [showClearModal, setShowClearModal] = useState(false);
    const [modalTab, setModalTab] = useState('properties');
    const [modalPos, setModalPos] = useState({ x: 100, y: 100 });
    const dragStartRef = useRef(null);
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });
    const showError = useCallback((message) => {
        setErrorModal({ show: true, message });
    }, []);

    // ============================================================
    // 7. UNDO / REDO
    // ============================================================
    const { past, future, recordHistory, undo, redo } = useHistory({
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
    });

    // ============================================================
    // 8. REFS FOR INPUT FOCUS
    // ============================================================
    const searchInputRef = useRef(null);
    const hierarchyInputRef = useRef(null);

    // ============================================================
    // 9. KEYBOARD SHORTCUTS
    // ============================================================
    const handleSaveWorkspace = useCallback(() => {
        const defaultName = `rtl_schematic_backup_${Date.now().toString().slice(-5)}`;
        setProposedFileName(defaultName);
        setShowSaveModal(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showSaveModal) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowSaveModal(false);
                }
                return;
            }
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
            if (isInput) {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    handleSaveWorkspace();
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
                    return; // let native input undo/redo work
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSaveWorkspace();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setLeftCollapsed(false);
                setLeftTab('search');
                setTimeout(() => searchInputRef.current?.focus(), 50);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
                setEdges((eds) => eds.map((ed) => ({ ...ed, selected: true })));
                return;
            }
            if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                fitView({ duration: 400 });
            } else if (e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setLeftCollapsed(false);
                setLeftTab('trace');
                setTimeout(() => hierarchyInputRef.current?.focus(), 50);
            } else if (e.code === 'Space') {
                e.preventDefault();
                if (selectedNodeId) {
                    const node = nodes.find((n) => n.id === selectedNodeId);
                    if (node) setCenter(node.position.x + 90, node.position.y + 60, { zoom: 1.2, duration: 400 });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, fitView, setCenter, selectedNodeId, nodes, setNodes, setEdges, showSaveModal, handleSaveWorkspace]);

    // ============================================================
    // 10. DELETE & ESCAPE HANDLING
    // ============================================================
    const selectedNodeIdRef = useRef(selectedNodeId);
    const selectedEdgeIdRef = useRef(selectedEdgeId);

    useEffect(() => {
        selectedNodeIdRef.current = selectedNodeId;
        selectedEdgeIdRef.current = selectedEdgeId;
    });

    const handleDelete = useCallback(() => {
        const nodeId = selectedNodeIdRef.current;
        const edgeId = selectedEdgeIdRef.current;

        if (nodeId) {
            recordHistory();
            setNodes((nds) => nds.filter((n) => !n.selected));
            setEdges((eds) => eds.filter((e) => !e.selected && e.source !== nodeId && e.target !== nodeId));
            // Clean orphaned exposed ports
            setExposedPorts((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((key) => {
                    if (next[key].nodeId === nodeId || key.startsWith(`${nodeId}__`)) {
                        delete next[key];
                    }
                });
                return next;
            });
            setSelectedNodeId(null);
        }
        if (edgeId) {
            recordHistory();
            setEdges((eds) => eds.filter((e) => !e.selected));
            setSelectedEdgeId(null);
            setGlowingNet(null);
        }
    }, [recordHistory, setNodes, setEdges, setExposedPorts, setSelectedNodeId, setSelectedEdgeId, setGlowingNet]);

    useEffect(() => {
        const onKeyDown = (e) => {
            const target = e.target;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setGlowingNet(null);
                setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
                setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
                setActiveModal({ type: null, id: null });
                setShowHelp(false);
                setShowSaveModal(false);
                setShowClearModal(false);
                setErrorModal({ show: false, message: '' });
                setNodes((nds) =>
                    nds.map((n) => ({
                        ...n,
                        data: { ...n.data, _closeInfoTrigger: Date.now() },
                    }))
                );
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleDelete, setSelectedNodeId, setSelectedEdgeId, setGlowingNet, setNodes, setEdges, setActiveModal, setShowHelp, setShowSaveModal, setShowClearModal, setErrorModal]);

    // ============================================================
    // 11. THEME SYNC
    // ============================================================
    useEffect(() => {
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, theme } })));
    }, [theme, setNodes]);

    // ============================================================
    // 12. EDGE WARNINGS & BIT WIDTH INFERENCE
    // ============================================================
    const checkEdgeWarnings = useCallback(
        (edge, currentNodes) => {
            const srcNode = currentNodes.find((n) => n.id === edge.source);
            const tgtNode = currentNodes.find((n) => n.id === edge.target);
            if (!srcNode || !tgtNode) return null;
            const srcPort = (srcNode.data.outputs || []).find((p) => p.name === edge.sourceHandle);
            const tgtPort = (tgtNode.data.inputs || []).find((p) => p.name === edge.targetHandle);
            if (!srcPort || !tgtPort) return null;
            if (srcPort.width !== tgtPort.width)
                return `Bit-width mismatch: ${srcPort.name}[${srcPort.width}b] → ${tgtPort.name}[${tgtPort.width}b]`;
            return null;
        },
        []
    );

    const computedEdges = useMemo(() => {
        return edges.map((e) => {
            const srcNode = nodes.find((n) => n.id === e.source);
            const tgtNode = nodes.find((n) => n.id === e.target);
            const srcPort =
                (srcNode?.data.outputs || []).find((p) => p.name === e.sourceHandle) ||
                (srcNode?.data.inputs || []).find((p) => p.name === e.sourceHandle);
            const tgtPort =
                (tgtNode?.data.inputs || []).find((p) => p.name === e.targetHandle) ||
                (tgtNode?.data.outputs || []).find((p) => p.name === e.targetHandle);
            const sourceWidth = srcPort?.width || 1;
            const targetWidth = tgtPort?.width || 1;
            const nativeWidth = e.data?.manualBitWidth ? e.data?.bitWidth || sourceWidth : sourceWidth;
            const allowedMaxWidth = Math.min(sourceWidth, targetWidth);
            const configuredWidth = Math.min(nativeWidth, allowedMaxWidth);
            const warning = checkEdgeWarnings(e, nodes);
            const routeOffset = 22 + (Math.abs(String(e.id || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 5) * 10;
            const sourceModuleName = srcNode?.data?.moduleName || srcNode?.data?.instanceName || e.source;
            return {
                ...e,
                type: 'smart',
                data: {
                    ...e.data,
                    warning,
                    bitWidth: Math.max(1, configuredWidth),
                    routeOffset,
                    sourceModuleName,
                    sourceModuleColor: colorWiresByModule ? getModuleWireColor(sourceModuleName) : undefined,
                    animateFlow: animateWireFlow,
                },
            };
        });
    }, [edges, nodes, checkEdgeWarnings, colorWiresByModule, animateWireFlow]);

    const displayEdges = useMemo(() => {
        const focusNodeId = selectedNodeId;
        const focusEdgeId = selectedEdgeId;

        return computedEdges
            .filter((edge) => {
                if (wireViewMode === 'all') return true;
                if (focusEdgeId && edge.id === focusEdgeId) return true;
                if (wireViewMode === 'focus' && focusNodeId) {
                    return edge.source === focusNodeId || edge.target === focusNodeId;
                }
                if (wireViewMode === 'focus') return !isGlobalNetEdge(edge);
                return !isGlobalNetEdge(edge);
            })
            .map((edge) => {
                const isFocused =
                    (focusNodeId && (edge.source === focusNodeId || edge.target === focusNodeId)) ||
                    (focusEdgeId && edge.id === focusEdgeId) ||
                    edge.data?.isGlowing ||
                    edge.data?.isFlashing;
                const shouldDim = wireViewMode === 'focus' && (focusNodeId || focusEdgeId) && !isFocused;
                return { ...edge, data: { ...edge.data, isDimmed: shouldDim } };
            });
    }, [computedEdges, selectedEdgeId, selectedNodeId, wireViewMode]);

    const wireStats = useMemo(
        () => ({
            total: computedEdges.length,
            visible: displayEdges.length,
            hiddenGlobal: computedEdges.filter((edge) => isGlobalNetEdge(edge)).length,
        }),
        [computedEdges, displayEdges.length]
    );

    const warnings = useMemo(() => {
        return computedEdges.map((e) => ({ id: e.id, msg: e.data?.warning })).filter((w) => w.msg);
    }, [computedEdges]);

    useEffect(() => {
        const sanitized = sanitizeGraph(nodes, edges, exposedPorts);
        if (!sanitized.changed) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            if (sanitized.edgesChanged) setEdges(sanitized.edges);
            if (sanitized.exposedChanged) setExposedPorts(sanitized.exposedPorts);
            if (sanitized.exposedChanged) {
                setNodes((currentNodes) => syncNodeExposureFlags(currentNodes, sanitized.exposedPorts));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [nodes, edges, exposedPorts, setEdges, setExposedPorts, setNodes]);

    useEffect(() => {
        setNodes((currentNodes) => syncNodeExposureFlags(currentNodes, exposedPorts));
    }, [exposedPorts, setNodes]);

    // ============================================================
    // 13. DYNAMIC SPLITTER / BUNDLER AUTO‑INFERENCE
    // ============================================================
    useEffect(() => {
        let nodesChanged = false;
        const updatedNodes = nodes.map((node) => {
            if (node.type !== 'splitter') return node;

            if (node.data.isSplitter) {
                if (node.data._manualOverride) return node;
                const inputEdge = edges.find((e) => e.target === node.id);
                let inferredInWidth = (node.data.outputs || []).reduce((sum, p) => sum + (p.width || 1), 0) || 1;
                if (inputEdge) {
                    const srcNode = nodes.find((n) => n.id === inputEdge.source);
                    const srcPort = srcNode?.data.outputs?.find((p) => p.name === inputEdge.sourceHandle);
                    if (srcPort) inferredInWidth = srcPort.width;
                }
                const connectedOutEdges = edges.filter((e) => e.source === node.id);
                let dynamicOutputs = [];
                if (connectedOutEdges.length === 0) {
                    dynamicOutputs =
                        node.data.outputs && node.data.outputs.length > 0
                            ? node.data.outputs.map((p) => ({ ...p }))
                            : [{ name: 'out0', width: inferredInWidth, msb: inferredInWidth - 1, lsb: 0 }];
                } else {
                    const uniqueWiredHandles = Array.from(
                        new Set(connectedOutEdges.map((e) => e.sourceHandle).filter(Boolean))
                    );
                    const totalAllocatedCount = Math.max(node.data.outputs?.length || 0, uniqueWiredHandles.length);
                    let currentLsb = 0;
                    for (let idx = 0; idx < totalAllocatedCount; idx++) {
                        const handleName = `out${idx}`;
                        const wiresForThisHandle = connectedOutEdges.filter((e) => e.sourceHandle === handleName);
                        if (wiresForThisHandle.length > 0) {
                            const firstEdge = wiresForThisHandle[0];
                            const tgtNode = nodes.find((n) => n.id === firstEdge.target);
                            const tgtPort = tgtNode?.data.inputs?.find((p) => p.name === firstEdge.targetHandle);
                            const sliceWidth = tgtPort ? tgtPort.width : 1;
                            const lsb = Math.min(currentLsb, Math.max(0, inferredInWidth - 1));
                            const remainingWidth = Math.max(1, inferredInWidth - lsb);
                            const actualWidth = Math.min(sliceWidth, remainingWidth);
                            dynamicOutputs.push({
                                name: handleName,
                                width: actualWidth,
                                msb: Math.min(inferredInWidth - 1, lsb + actualWidth - 1),
                                lsb,
                            });
                            currentLsb += actualWidth;
                        } else {
                            const existingPort = node.data.outputs?.[idx];
                            const requestedWidth = existingPort?.width || 1;
                            const lsb = Math.min(existingPort?.lsb ?? currentLsb, Math.max(0, inferredInWidth - 1));
                            const remainingWidth = Math.max(1, inferredInWidth - lsb);
                            const actualWidth = Math.min(requestedWidth, remainingWidth);
                            dynamicOutputs.push({
                                name: existingPort?.name || handleName,
                                width: actualWidth,
                                msb: lsb + actualWidth - 1,
                                lsb,
                            });
                            currentLsb += actualWidth;
                        }
                    }
                }
                const expectedInputs = [{ name: 'bus_in', width: inferredInWidth, msb: inferredInWidth - 1, lsb: 0 }];
                const inChanged = JSON.stringify(node.data.inputs) !== JSON.stringify(expectedInputs);
                const outChanged = JSON.stringify(node.data.outputs) !== JSON.stringify(dynamicOutputs);
                if (inChanged || outChanged) {
                    nodesChanged = true;
                    return { ...node, data: { ...node.data, inputs: expectedInputs, outputs: dynamicOutputs } };
                }
                return node;
            }

            if (node.data.isBundler) {
                const inputs = node.data.inputs || [];
                let totalWidth = 0;
                inputs.forEach((p) => {
                    totalWidth += p.width || 1;
                });
                if (totalWidth < 1) totalWidth = 1;

                const currentOutputs = node.data.outputs || [];
                const newOutputs =
                    currentOutputs.length > 0
                        ? [{ ...currentOutputs[0], width: totalWidth, msb: totalWidth - 1, lsb: 0 }]
                        : [{ name: 'bus_out', width: totalWidth, msb: totalWidth - 1, lsb: 0 }];

                const outChanged = JSON.stringify(node.data.outputs) !== JSON.stringify(newOutputs);
                if (outChanged) {
                    nodesChanged = true;
                    return { ...node, data: { ...node.data, outputs: newOutputs } };
                }
                return node;
            }

            return node;
        });

        if (nodesChanged) {
            setNodes(updatedNodes);
        }
    }, [edges, setNodes, nodes]);

    // ============================================================
    // 14. GLOW EFFECT (FOR EDGES)
    // ============================================================
    const [hoveredNetSource] = useState(null);
    useEffect(() => {
        setEdges((eds) => {
            let changed = false;
            const updated = eds.map((e) => {
                const matchesGroup = glowingNet && e.source === glowingNet.source && e.sourceHandle === glowingNet.sourceHandle;
                const matchesTrace = traceGlowingEdgeId && e.id === traceGlowingEdgeId;
                const matchesHoverTree = hoveredNetSource && e.source === hoveredNetSource.source && e.sourceHandle === hoveredNetSource.sourceHandle;
                const shouldGlow = !!(matchesGroup || matchesTrace || matchesHoverTree);
                if ((e.data?.isGlowing || false) !== shouldGlow) {
                    changed = true;
                    return { ...e, data: { ...e.data, isGlowing: shouldGlow } };
                }
                return e;
            });
            return changed ? updated : eds;
        });
    }, [glowingNet, traceGlowingEdgeId, hoveredNetSource, setEdges]);

    // ============================================================
    // 15. CANVAS INTERACTIONS (CONNECT, CLICK, RECONNECT)
    // ============================================================
    const isValidConnection = useCallback(
        (connection) => {
            const isTargetAlreadyWired = edges.some(
                (e) => e.target === connection.target && e.targetHandle === connection.targetHandle
            );
            if (isTargetAlreadyWired) return false;
            return true;
        },
        [edges]
    );

    const onConnect = useCallback(
        (params) => {
            recordHistory();
            let sourceNode = nodes.find((n) => n.id === params.source);
            let targetNode = nodes.find((n) => n.id === params.target);
            const isSourceOutput = (sourceNode?.data.outputs || []).some((p) => p.name === params.sourceHandle);
            const isTargetInput = (targetNode?.data.inputs || []).some((p) => p.name === params.targetHandle);
            let normParams = { ...params };
            if (!isSourceOutput && !isTargetInput) {
                const isSourceInput = (sourceNode?.data.inputs || []).some((p) => p.name === params.sourceHandle);
                const isTargetOutput = (targetNode?.data.outputs || []).some((p) => p.name === params.targetHandle);
                if (isSourceInput && isTargetOutput) {
                    normParams = {
                        source: params.target,
                        sourceHandle: params.targetHandle,
                        target: params.source,
                        targetHandle: params.sourceHandle,
                    };
                    sourceNode = nodes.find((n) => n.id === normParams.source);
                    targetNode = nodes.find((n) => n.id === normParams.target);
                }
            }
            const finalSrcPort = (sourceNode?.data.outputs || []).find((p) => p.name === normParams.sourceHandle);
            const finalTgtPort = (targetNode?.data.inputs || []).find((p) => p.name === normParams.targetHandle);
            if (!finalSrcPort || !finalTgtPort) {
                console.warn('Invalid net connection blocked.');
                return;
            }
            const srcCompoundKey = `${normParams.source}__${normParams.sourceHandle}`;
            const tgtCompoundKey = `${normParams.target}__${normParams.targetHandle}`;
            setExposedPorts((prev) => {
                const next = { ...prev };
                delete next[srcCompoundKey];
                delete next[tgtCompoundKey];
                return next;
            });
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === normParams.source || n.id === normParams.target) {
                        const newExposed = { ...(n.data.exposedPorts || {}) };
                        delete newExposed[normParams.sourceHandle];
                        delete newExposed[normParams.targetHandle];
                        return { ...n, data: { ...n.data, exposedPorts: newExposed } };
                    }
                    return n;
                })
            );
            const portWidth = Math.min(finalSrcPort.width, finalTgtPort.width);
            const newEdge = {
                ...normParams,
                id: `e-${normParams.source}-${normParams.sourceHandle}-${normParams.target}-${normParams.targetHandle}`,
                type: 'smart',
                data: { bitWidth: portWidth, manualBitWidth: false },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [nodes, setNodes, setEdges, recordHistory]
    );

    const onReconnect = useCallback(
        (oldEdge, newConnection) => {
            recordHistory();
            setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        },
        [setEdges, recordHistory]
    );

    const onNodeClick = useCallback(
        (event, node) => {
            if (event.target?.closest?.('.react-flow__handle')) return;
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setTraceGlowingEdgeId(null);
        },
        [setSelectedNodeId, setSelectedEdgeId]
    );

    const openNodeConfigModal = useCallback((nodeId, clientX = window.innerWidth / 2, clientY = window.innerHeight / 2) => {
        const node = nodes.find((candidate) => candidate.id === nodeId);
        if (!node) return;
        setSelectedNodeId(nodeId);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setTraceGlowingEdgeId(null);
        setModalTab('properties');
        setActiveModal({ type: 'node', id: nodeId });
        const modalWidth = 560;
        const modalHeight = 620;
        const x = Math.max(12, Math.min(clientX - 280, window.innerWidth - modalWidth - 12));
        const y = Math.max(12, Math.min(clientY - 96, window.innerHeight - modalHeight - 12));
        setModalPos({ x, y });
    }, [nodes, setSelectedNodeId, setSelectedEdgeId, setGlowingNet]);

    useEffect(() => {
        const onOpenNodeConfig = (event) => {
            const { nodeId, clientX, clientY } = event.detail || {};
            if (!nodeId) return;
            openNodeConfigModal(nodeId, clientX, clientY);
        };
        window.addEventListener('axon:open-node-config', onOpenNodeConfig);
        return () => window.removeEventListener('axon:open-node-config', onOpenNodeConfig);
    }, [openNodeConfigModal]);

    const onEdgeClick = useCallback(
        (event, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
            setTraceGlowingEdgeId(null);
            setGlowingNet({ source: edge.source, sourceHandle: edge.sourceHandle });
            setModalTab('properties');
            setActiveModal({ type: 'edge', id: edge.id });
            const modalWidth = 380;
            const modalHeight = 420;
            const x = Math.max(10, Math.min(event.clientX - 180, window.innerWidth - modalWidth - 10));
            const y = Math.max(10, Math.min(event.clientY - 80, window.innerHeight - modalHeight - 10));
            setModalPos({ x, y });
        },
        [setSelectedEdgeId, setSelectedNodeId]
    );

    const onPaneClick = useCallback(
        (event) => {
            if (event.target?.closest?.('.react-flow__handle')) return;
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setTraceGlowingEdgeId(null);
        },
        [setSelectedNodeId, setSelectedEdgeId]
    );

    // ============================================================
    // 16. SELECTED NODE HELPERS
    // ============================================================
    const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

    // ============================================================
    // 17. PORT & NODE UPDATE FUNCTIONS
    // ============================================================
    const toggleExposePort = useCallback(
        (nodeId, portName, portRef, isInput) => {
            const key = `${nodeId}__${portName}`;
            const node = nodes.find((candidate) => candidate.id === nodeId);
            const isConnected = isInput
                ? edges.some((edge) => edge.target === nodeId && edge.targetHandle === portName)
                : edges.some((edge) => edge.source === nodeId && edge.sourceHandle === portName);
            const isAutoRouted = isInput && !!node?.data?.autoRoute?.[portName];
            if (!exposedPorts[key] && (isConnected || isAutoRouted)) return;

            recordHistory();
            setExposedPorts((prev) => {
                const next = { ...prev };
                if (next[key]) delete next[key];
                else next[key] = { nodeId, portName, width: portRef.width, msb: portRef.msb, lsb: portRef.lsb, isInput };
                return next;
            });
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== nodeId) return n;
                    const newExposed = { ...(n.data.exposedPorts || {}) };
                    if (newExposed[portName]) delete newExposed[portName];
                    else newExposed[portName] = true;
                    return { ...n, data: { ...n.data, exposedPorts: newExposed } };
                })
            );
        },
        [edges, exposedPorts, nodes, recordHistory, setExposedPorts, setNodes]
    );

    const togglePortSwap = useCallback(() => {
        if (!selectedNodeId) return;
        recordHistory();
        setNodes((nds) =>
            nds.map((n) =>
                n.id === selectedNodeId ? { ...n, data: { ...n.data, portsSwapped: !n.data.portsSwapped } } : n
            )
        );
    }, [selectedNodeId, recordHistory, setNodes]);

    const updateSelectedNode = useCallback(
    (field, value) => {
        if (!selectedNodeId) return;
        const nodeToUpdate = nodes.find((n) => n.id === selectedNodeId);
        if (!nodeToUpdate) return;

        if (field === 'inputs' || field === 'outputs') {
            const parsed = parsePorts(value);
            const currentInputs = field === 'inputs' ? parsed : nodeToUpdate.data.inputs || [];
            const currentOutputs = field === 'outputs' ? parsed : nodeToUpdate.data.outputs || [];
            const error = validatePorts(currentInputs, currentOutputs);
            if (error) {
                showError(error);
                return;
            }
        }
        
        recordHistory();
        const oldModuleName = nodeToUpdate.data.moduleName;
        const newValue = field.includes('puts') ? parsePorts(value) : value;
        const newModuleName = field === 'moduleName' ? value.trim() : oldModuleName;
        
        let newInputs = field === 'inputs' ? newValue : nodeToUpdate.data.inputs || [];
        let newOutputs = field === 'outputs' ? newValue : nodeToUpdate.data.outputs || [];

        // Dynamic autoRoute evaluation mapping rules
        const updatedAutoRoute = { ...(nodeToUpdate.data.autoRoute || {}) };
        newInputs.forEach((p) => {
            const routeSignal = getDefaultAutoRouteSignal(p.name);
            if (routeSignal) updatedAutoRoute[p.name] = routeSignal;
        });

        // Generate the new uniform Verilog port signature array
        const portDecls = [];
        newInputs.forEach((p) =>
            portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`)
        );
        newOutputs.forEach((p) =>
            portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`)
        );
        const newSignature = `module ${newModuleName} (\n${portDecls.join(',\n')}\n);`;

        let synchronizedUpdatedCode = '';

        // Update the code store map explicitly
        setCustomCodes((prev) => {
            const next = { ...prev };
            let baseCode = next[oldModuleName];
            
            if (!baseCode) {
                baseCode = `${newSignature}\n\n// Write internal design logic here\n\nendmodule\n`;
            }

            // Perform direct AST replacement regex swap
            synchronizedUpdatedCode = baseCode.replace(/module\s+\w+\s*\([\s\S]*?\);/, newSignature);
            
            if (field === 'moduleName' && oldModuleName !== newModuleName) {
                next[newModuleName] = synchronizedUpdatedCode;
                delete next[oldModuleName];
            } else {
                next[oldModuleName] = synchronizedUpdatedCode;
            }
            return next;
        });

        // Update the visual canvas nodes array
        setNodes((nds) =>
            nds.map((n) => {
                // Check if this node shares the same module design definitions
                if (n.data.moduleName === oldModuleName || n.id === selectedNodeId) {
                    return { 
                        ...n, 
                        data: { 
                            ...n.data, 
                            moduleName: newModuleName,
                            inputs: newInputs, 
                            outputs: newOutputs,
                            autoRoute: updatedAutoRoute,
                            // Inject the string instantly to bypass parser validation drops
                            code: synchronizedUpdatedCode 
                        } 
                    };
                }
                return n;
            })
        );
    },
    [selectedNodeId, nodes, recordHistory, setCustomCodes, setNodes, showError]
);

    // ============================================================
    // 18. CODE EDITOR (RTL & TESTBENCH)
    // ============================================================
    const getModuleCode = useCallback((node) => {
        if (!node) return '';
        const mName = node.data.moduleName;
        if (customCodes[mName] !== undefined) return customCodes[mName];
        let code = `module ${mName} (\n`;
        const portDecls = [];
        (node.data.inputs || []).forEach((p) => {
            portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`);
        });
        (node.data.outputs || []).forEach((p) => {
            portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`);
        });
        code += portDecls.join(',\n') + `\n);\n\n// Write internal design logic here\n\nendmodule\n`;
        return code;
    }, [customCodes]);

    const currentModuleCode = useMemo(() => getModuleCode(selectedNode), [getModuleCode, selectedNode]);
    const effectiveProjectModel = useMemo(
        () => projectModel || createWorkspacePayload({
            nodes,
            edges,
            customCodes,
            exposedPorts,
            theme,
        }).project,
        [projectModel, nodes, edges, customCodes, exposedPorts, theme]
    );
    const activeTopModuleName = effectiveProjectModel?.topModuleName || DEFAULT_TOP_MODULE_NAME;

    // Debounced structural Verilog generation to avoid blocking UI during edits
    const [debouncedVerilog, setDebouncedVerilog] = useState('');
    const verilogTimerRef = useRef(null);

    useEffect(() => {
        // Clear previous timer
        if (verilogTimerRef.current) clearTimeout(verilogTimerRef.current);
        // Schedule generation after 300ms idle
        verilogTimerRef.current = setTimeout(() => {
            setDebouncedVerilog(generateStructuralVerilog({
                moduleName: activeTopModuleName,
                nodes,
                edges,
                customCodes,
                exposedPorts,
            }));
        }, 300);

        return () => {
            if (verilogTimerRef.current) clearTimeout(verilogTimerRef.current);
        };
    }, [nodes, edges, customCodes, exposedPorts, activeTopModuleName]);

    const structuralVerilogFull = debouncedVerilog;

    const testbenchCodeFull = useMemo(() => {
        if (nodes.length === 0 && uploadedTopTestbenchCode) return uploadedTopTestbenchCode;

        const timestamp = new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });

        let code = `// ============================================================================
// VERILOG TESTBENCH | AUTOMATICALLY GENERATED VERIFICATION SUITE
// ============================================================================
// Creator/Designer : Ansh Srivastav
// Generator Engine : Axon Interlink Verification Framework v1.0.0
// Generated On      : ${timestamp}
//
// [SIMULATION CONFIGURATION]:
// - Timescale      : 1ns / 1ps
// - Master Clock   : Driven at 100MHz (10ns Period, toggles every 5ns)
// - Reset Profile  : Active-low initial assert for 100ns base stabilization
// ============================================================================

\`timescale 1ns / 1ps

module ${activeTopModuleName}_tb();
  reg clk;
  reg rst_n;
`;
        const autoRouteTopPorts = [];
        const seenAutoRouteTopPorts = new Set(['clk', 'rst_n']);
        nodes.forEach((node) => {
            (node.data?.inputs || []).forEach((port) => {
                const autoRoute = node.data?.autoRoute?.[port.name];
                if (!autoRoute) return;
                const topName = typeof autoRoute === 'string' ? autoRoute : port.name;
                if (seenAutoRouteTopPorts.has(topName)) return;
                seenAutoRouteTopPorts.add(topName);
                autoRouteTopPorts.push(topName);
                code += `  reg ${topName};\n`;
            });
        });
        const validExposedKeys = Object.keys(exposedPorts).filter((key) => {
            const p = exposedPorts[key];
            const node = nodes.find((n) => n.id === p.nodeId);
            if (!node) return false;
            return !(p.isInput && node?.data.autoRoute?.[p.portName]);
        });

        const mappedInputs = [];
        const mappedOutputs = [];
        const declaredTestbenchPorts = new Set(['clk', 'rst_n', ...autoRouteTopPorts]);

        validExposedKeys.forEach((key) => {
            const port = exposedPorts[key];
            const node = nodes.find((n) => n.id === port.nodeId);
            const prefix = node ? node.data.instanceName : 'unknown';
            const netName = port.externalName || `${prefix}_${port.portName}`;
            if (declaredTestbenchPorts.has(netName)) return;
            declaredTestbenchPorts.add(netName);
            const wDecl =
                port.width > 1
                    ? `[${port.msb !== undefined ? port.msb : port.width - 1}:${port.lsb !== undefined ? port.lsb : 0}] `
                    : '';
            if (port.isInput) {
                code += `  reg ${wDecl}${netName};\n`;
                mappedInputs.push({ name: netName, width: port.width });
            } else {
                code += `  wire ${wDecl}${netName};\n`;
                mappedOutputs.push(netName);
            }
        });
        code += `\n  ${activeTopModuleName} uut (\n    .clk(clk),\n    .rst_n(rst_n)`;
        autoRouteTopPorts.forEach((portName) => {
            code += `,\n    .${portName}(${portName})`;
        });
        const mappedTopPorts = new Set(['clk', 'rst_n', ...autoRouteTopPorts]);
        validExposedKeys.forEach((key) => {
            const port = exposedPorts[key];
            const node = nodes.find((n) => n.id === port.nodeId);
            const prefix = node ? node.data.instanceName : 'unknown';
            const netName = port.externalName || `${prefix}_${port.portName}`;
            if (mappedTopPorts.has(netName)) return;
            mappedTopPorts.add(netName);
            code += `,\n    .${netName}(${netName})`;
        });
        code += `\n  );\n\n  initial begin\n    clk = 0;\n    forever #5 clk = ~clk;\n  end\n\n  initial begin\n    rst_n = 0;\n`;
        autoRouteTopPorts.forEach((portName) => {
            code += `    ${portName} = 0;\n`;
        });
        mappedInputs.forEach((inputObj) => {
            code += `    ${inputObj.name} = ${inputObj.width}'b0;\n`;
        });
        code += `\n    #100;\n    rst_n = 1;\n`;
        autoRouteTopPorts.forEach((portName) => {
            code += `    ${portName} = 1;\n`;
        });
        code += `    #20;\n\n`;
        if (mappedInputs.length > 0) {
            code += `    // --- Test Pattern Cycle A ---\n`;
            mappedInputs.forEach((inputObj) => {
                const val = inputObj.width > 1 ? `${inputObj.width}'hAA` : `1'b1`;
                code += `    ${inputObj.name} = ${val};\n`;
            });
            code += `    #40;\n\n    // --- Test Pattern Cycle B ---\n`;
            mappedInputs.forEach((inputObj) => {
                const val = inputObj.width > 1 ? `${inputObj.width}'h55` : `1'b0`;
                code += `    ${inputObj.name} = ${val};\n`;
            });
            code += `    #40;\n\n    // --- Test Pattern Cycle C ---\n`;
            mappedInputs.forEach((inputObj, idx) => {
                const val = inputObj.width > 1 ? `${inputObj.width}'hF0` : `${idx % 2 === 0 ? "1'b1" : "1'b0"}`;
                code += `    ${inputObj.name} = ${val};\n`;
            });
            code += `    #40;\n`;
        } else {
            code += `    #200;\n`;
        }
        code += `\n    #100;\n    $display("[TB SUCCESS] Simulation cycles executed completely without hangs.");\n    $finish;\n  end\n\nendmodule\n`;
        return code;
    }, [activeTopModuleName, exposedPorts, nodes, uploadedTopTestbenchCode]);

    const handleCopyCode = useCallback(() => {
        const codeToCopy = topViewMode === 'testbench' ? testbenchCodeFull : structuralVerilogFull;
        navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [topViewMode, testbenchCodeFull, structuralVerilogFull]);

    // ============================================================
    // 19. FILE OPERATIONS (SAVE / LOAD)
    // ============================================================
    const { executeActualDownload, handleLoadWorkspace, handleClearAll } = useFileOperations({
        nodes,
        edges,
        customCodes,
        exposedPorts,
        theme,
        projectModel,
        recordHistory,
        setNodes,
        setEdges,
        setCustomCodes,
        setExposedPorts,
        setProjectModel,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
        setTheme,
        setShowSaveModal,
        setShowClearModal,
    });

    const readUploadedVerilogFiles = useCallback((fileList) => {
        const selectedFiles = Array.from(fileList || []);
        return Promise.all(
            selectedFiles.map(
                (file) =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve({ name: file.name, code: event.target?.result || '' });
                        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
                        reader.readAsText(file);
                    })
            )
        );
    }, []);

    const applyImportedVerilogFiles = useCallback(
        async (fileList, targetTab = 'project', importMode = 'merge') => {
            try {
                const filePayloads = await readUploadedVerilogFiles(fileList);
                if (filePayloads.length === 0) return;

                const shouldReplaceCanvas = importMode === 'replace';
                if (
                    shouldReplaceCanvas &&
                    (nodes.length > 0 || edges.length > 0) &&
                    !window.confirm('Importing top RTL will replace the current canvas. Continue?')
                ) {
                    return;
                }

                const uploadedParsedModules = filePayloads.flatMap((file) => parseModuleDeclarations(file.code, file.name));
                const uploadedModuleNames = new Set(uploadedParsedModules.map((moduleDef) => moduleDef.name));
                const knownModuleNames = new Set([
                    ...uploadedParsedModules.map((moduleDef) => moduleDef.name),
                    ...nodes.map((node) => node.data?.moduleName).filter(Boolean),
                    ...Object.keys(customCodes || {}),
                ]);
                const uploadedStructuralCandidates = uploadedParsedModules.filter(
                    (moduleDef) => parseInstanceDeclarations(moduleDef.body, Array.from(knownModuleNames)).length > 0
                );
                let uploadedTopModuleName =
                    uploadedStructuralCandidates.find((moduleDef) => moduleDef.name === 'top_module')?.name ||
                    uploadedStructuralCandidates[0]?.name ||
                    null;
                if (uploadedStructuralCandidates.length > 1) {
                    const candidateNames = uploadedStructuralCandidates.map((moduleDef) => moduleDef.name);
                    const selectedTop = window.prompt(
                        `Multiple structural top modules were found:\n\n${candidateNames.join('\n')}\n\nEnter the top module to instantiate:`,
                        uploadedTopModuleName || candidateNames[0]
                    );
                    if (selectedTop === null) return;
                    const trimmedTop = selectedTop.trim();
                    if (!candidateNames.includes(trimmedTop)) {
                        showError(`'${trimmedTop}' is not one of the detected top-module candidates: ${candidateNames.join(', ')}.`);
                        return;
                    }
                    uploadedTopModuleName = trimmedTop;
                }
                const existingModulePayloads =
                    !shouldReplaceCanvas && uploadedTopModuleName
                        ? Object.entries(customCodes || {})
                            .filter(([moduleName, code]) => moduleName && !uploadedModuleNames.has(moduleName) && typeof code === 'string' && code.trim())
                            .map(([moduleName, code]) => ({
                                name: `existing_${moduleName}.v`,
                                code,
                            }))
                        : [];
                const importPayloads = existingModulePayloads.length > 0
                    ? [...existingModulePayloads, ...filePayloads]
                    : filePayloads;
                const projectedPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                const imported = buildWorkspaceFromVerilogFiles(importPayloads, {
                    theme,
                    startX: projectedPosition.x - 320,
                    startY: projectedPosition.y - 160,
                    topModuleName: uploadedTopModuleName || undefined,
                });

                if (imported.modules.length === 0) {
                    showError('No Verilog module declarations were found in the uploaded files.');
                    return;
                }

                const testbenchModule =
                    uploadedParsedModules.find((moduleDef) => moduleDef.name === imported.topModuleName) ||
                    uploadedParsedModules.find((moduleDef) => moduleDef.name === 'top_module') ||
                    uploadedParsedModules[0];

                recordHistory();
                if (shouldReplaceCanvas) {
                    setNodes(imported.nodes);
                    setEdges(imported.edges);
                    setCustomCodes(imported.customCodes);
                    setExposedPorts(imported.exposedPorts);
                } else {
                    const existingNodeIds = new Set(nodes.map((node) => node.id));
                    const existingInstanceNames = new Set(nodes.map((node) => node.data?.instanceName).filter(Boolean));
                    const existingNodesByModuleName = new Map();
                    nodes.forEach((node) => {
                        const moduleName = node.data?.moduleName;
                        if (!moduleName || node.data?.isSplitter || node.data?.isBundler) return;
                        if (!existingNodesByModuleName.has(moduleName)) existingNodesByModuleName.set(moduleName, []);
                        existingNodesByModuleName.get(moduleName).push(node);
                    });
                    const moduleDefsByName = new Map(imported.modules.map((moduleDef) => [moduleDef.name, moduleDef]));
                    const idRemap = new Map();
                    const reusedExistingNodeIds = new Set();
                    const newNodes = [];

                    const makeUnique = (base, used) => {
                        const cleanBase = (base || 'imported').replace(/[^a-zA-Z0-9_]/g, '_');
                        let candidate = cleanBase;
                        let index = 1;
                        while (used.has(candidate)) {
                            candidate = `${cleanBase}_${index}`;
                            index += 1;
                        }
                        used.add(candidate);
                        return candidate;
                    };

                    imported.nodes.forEach((node) => {
                        const moduleName = node.data?.moduleName;
                        const reusableExistingNode = existingNodesByModuleName
                            .get(moduleName)
                            ?.find((existingNode) => !reusedExistingNodeIds.has(existingNode.id));

                        if (reusableExistingNode) {
                            idRemap.set(node.id, reusableExistingNode.id);
                            reusedExistingNodeIds.add(reusableExistingNode.id);
                            return;
                        }

                        const nextId = makeUnique(node.id, existingNodeIds);
                        const nextInstanceName = makeUnique(node.data?.instanceName || `u_${moduleName}`, existingInstanceNames);
                        idRemap.set(node.id, nextId);
                        newNodes.push({
                            ...node,
                            id: nextId,
                            position: {
                                x: node.position.x + nodes.length * 8,
                                y: node.position.y + nodes.length * 8,
                            },
                            data: {
                                ...node.data,
                                instanceName: nextInstanceName,
                                theme,
                            },
                        });
                    });

                    const nextImportedEdges = imported.edges
                        .filter((edge) => idRemap.has(edge.source) && idRemap.has(edge.target))
                        .map((edge) => ({
                            ...edge,
                            id: `e-${idRemap.get(edge.source)}-${edge.sourceHandle}-${idRemap.get(edge.target)}-${edge.targetHandle}`,
                            source: idRemap.get(edge.source),
                            target: idRemap.get(edge.target),
                        }));

                    const nextImportedExposedPorts = {};
                    Object.entries(imported.exposedPorts).forEach(([, port]) => {
                        const nextNodeId = idRemap.get(port.nodeId);
                        if (!nextNodeId) return;
                        nextImportedExposedPorts[`${nextNodeId}__${port.portName}`] = {
                            ...port,
                            nodeId: nextNodeId,
                        };
                    });

                    setNodes((currentNodes) => [
                        ...currentNodes.map((node) => {
                            const moduleDef = moduleDefsByName.get(node.data?.moduleName);
                            if (!moduleDef) return node;
                            if (moduleDef.fileName === 'inferred') return node;
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    inputs: moduleDef.inputs,
                                    outputs: moduleDef.outputs,
                                    code: imported.customCodes[node.data.moduleName] || node.data.code,
                                },
                            };
                        }),
                        ...newNodes,
                    ]);
                    setEdges((currentEdges) => {
                        const existingEdgeKeys = new Set(
                            currentEdges.map((edge) => `${edge.source}|${edge.sourceHandle}|${edge.target}|${edge.targetHandle}`)
                        );
                        const uniqueImportedEdges = nextImportedEdges.filter((edge) => {
                            const key = `${edge.source}|${edge.sourceHandle}|${edge.target}|${edge.targetHandle}`;
                            if (existingEdgeKeys.has(key)) return false;
                            existingEdgeKeys.add(key);
                            return true;
                        });
                        return [...currentEdges, ...uniqueImportedEdges];
                    });
                    setCustomCodes((currentCodes) => {
                        const nextCodes = { ...currentCodes };
                        Object.entries(imported.customCodes).forEach(([moduleName, code]) => {
                            const moduleDef = moduleDefsByName.get(moduleName);
                            if (moduleDef?.fileName === 'inferred' && currentCodes[moduleName] !== undefined) return;
                            nextCodes[moduleName] = code;
                        });
                        return nextCodes;
                    });
                    setExposedPorts((currentExposedPorts) => ({ ...currentExposedPorts, ...nextImportedExposedPorts }));
                }

                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setGlowingNet(null);
                setUploadedTopTestbenchCode(testbenchModule ? generateTestbenchFromModule(testbenchModule, testbenchModule.name) : '');
                setLeftCollapsed(false);
                setLeftTab(targetTab);

                const warningText = imported.warnings.length > 0 ? ` Warnings: ${imported.warnings.slice(0, 3).join(' ')}` : '';
                setImportStatus({
                    type: imported.warnings.length > 0 ? 'warning' : 'success',
                    message: `${shouldReplaceCanvas ? 'Imported' : 'Merged'} ${imported.nodes.length} block${imported.nodes.length === 1 ? '' : 's'}, ${imported.edges.length} connection${imported.edges.length === 1 ? '' : 's'}, and ${Object.keys(imported.exposedPorts).length} top port${Object.keys(imported.exposedPorts).length === 1 ? '' : 's'}.${warningText}`,
                });

                requestAnimationFrame(() => {
                    fitView({ duration: 400, padding: 0.2 });
                });
            } catch (error) {
                showError(error?.message || 'Failed to import uploaded Verilog files.');
            }
        },
        [
            customCodes,
            edges.length,
            fitView,
            nodes,
            readUploadedVerilogFiles,
            recordHistory,
            screenToFlowPosition,
            setEdges,
            setExposedPorts,
            setNodes,
            showError,
            theme,
        ]
    );

    const handleImportVerilogFiles = useCallback(
        (fileList) => applyImportedVerilogFiles(fileList, 'project', 'merge'),
        [applyImportedVerilogFiles]
    );

    const handleImportTopModuleFiles = useCallback(
        (fileList) => applyImportedVerilogFiles(fileList, 'testbench', 'replace'),
        [applyImportedVerilogFiles]
    );

    const handleDeleteModuleFile = useCallback(
        (moduleName) => {
            if (!moduleName) return;
            const affectedNodeIds = new Set(
                nodes.filter((node) => node.data?.moduleName === moduleName).map((node) => node.id)
            );

            recordHistory();
            setNodes((currentNodes) => currentNodes.filter((node) => node.data?.moduleName !== moduleName));
            setEdges((currentEdges) =>
                currentEdges.filter((edge) => !affectedNodeIds.has(edge.source) && !affectedNodeIds.has(edge.target))
            );
            setCustomCodes((currentCodes) => {
                const nextCodes = { ...currentCodes };
                delete nextCodes[moduleName];
                return nextCodes;
            });
            setExposedPorts((currentExposedPorts) => {
                const nextExposedPorts = {};
                Object.entries(currentExposedPorts || {}).forEach(([key, port]) => {
                    if (!affectedNodeIds.has(port.nodeId)) nextExposedPorts[key] = port;
                });
                return nextExposedPorts;
            });
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setActiveModal({ type: null, id: null });
            setImportStatus({
                type: 'success',
                message: `Deleted ${moduleName}.v and removed ${affectedNodeIds.size} instance${affectedNodeIds.size === 1 ? '' : 's'} from the canvas.`,
            });
        },
        [nodes, recordHistory, setEdges, setExposedPorts, setNodes]
    );

    const downloadTextFile = useCallback((fileName, content) => {
        if (!content?.trim()) return;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }, []);

    const getCurrentProjectSnapshot = useCallback(
        () => createWorkspacePayload({
            nodes,
            edges,
            customCodes,
            exposedPorts,
            theme,
            previousProject: projectModel,
        }).project,
        [nodes, edges, customCodes, exposedPorts, theme, projectModel]
    );

    const getUniqueCanvasModuleName = useCallback((baseName, project, options = {}) => {
        const cleanBase = (baseName || `sub_top_${Date.now().toString().slice(-5)}`)
            .trim()
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^_+/, '') || `sub_top_${Date.now().toString().slice(-5)}`;
        const excludedCanvasIds = new Set(options.excludeCanvasIds || []);
        const excludedModuleNames = new Set(options.excludeModuleNames || []);
        const usedNames = new Set();
        Object.values(project?.canvases || {}).forEach((canvas) => {
            if (excludedCanvasIds.has(canvas.id)) return;
            const moduleName = project?.modules?.[canvas.moduleId]?.name || canvas.name;
            if (moduleName && !excludedModuleNames.has(moduleName)) usedNames.add(moduleName);
        });
        (nodes || []).forEach((node) => {
            const moduleName = node?.data?.moduleName;
            if (moduleName && !excludedModuleNames.has(moduleName) && !node?.data?.isSplitter && !node?.data?.isBundler) {
                usedNames.add(moduleName);
            }
        });
        let candidate = cleanBase;
        let index = 1;
        while (usedNames.has(candidate)) {
            candidate = `${cleanBase}_${index}`;
            index += 1;
        }
        return candidate;
    }, [nodes]);

    const getUniqueNodeId = useCallback((baseId) => {
        const usedIds = new Set(nodes.map((node) => node.id));
        const cleanBase = (baseId || 'u_module').replace(/[^a-zA-Z0-9_]/g, '_');
        let candidate = cleanBase;
        let index = 1;
        while (usedIds.has(candidate)) {
            candidate = `${cleanBase}_${index}`;
            index += 1;
        }
        return candidate;
    }, [nodes]);

    const getUniqueInstanceName = useCallback((baseName) => {
        const usedNames = new Set(nodes.map((node) => node.data?.instanceName).filter(Boolean));
        const cleanBase = (baseName || 'u_module').replace(/[^a-zA-Z0-9_]/g, '_');
        let candidate = cleanBase;
        let index = 1;
        while (usedNames.has(candidate)) {
            candidate = `${cleanBase}_${index}`;
            index += 1;
        }
        return candidate;
    }, [nodes]);

    const handleCreateCanvas = useCallback(
        (requestedName) => {
            const currentProject = getCurrentProjectSnapshot();
            const moduleName = getUniqueCanvasModuleName(requestedName, currentProject);
            const nextProject = createCanvasInProject(currentProject, { name: moduleName, theme });

            setProjectModel(nextProject);
            setNodes([]);
            setEdges([]);
            setExposedPorts({});
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setLeftCollapsed(false);
            setLeftTab('project');
            setImportStatus({
                type: 'success',
                message: `Created and opened canvas ${moduleName}.`,
            });
        },
        [
            getCurrentProjectSnapshot,
            getUniqueCanvasModuleName,
            setNodes,
            setEdges,
            setExposedPorts,
            theme,
        ]
    );

    const handleOpenCanvas = useCallback(
        (canvasId) => {
            const currentProject = getCurrentProjectSnapshot();
            const switched = switchActiveCanvasInProject(currentProject, canvasId, {
                nodes,
                edges,
                exposedPorts,
                theme,
            });

            setProjectModel(switched.project);
            setNodes(switched.state.nodes);
            setEdges(switched.state.edges);
            setExposedPorts(switched.state.exposedPorts);
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
        },
        [getCurrentProjectSnapshot, nodes, edges, exposedPorts, theme, setNodes, setEdges, setExposedPorts]
    );

    const handlePromoteCurrentCanvas = useCallback(
        (requestedName) => {
            if (nodes.length === 0 && edges.length === 0) return;

            const currentProject = getCurrentProjectSnapshot();
            const activeCanvas = currentProject.canvases?.[currentProject.activeCanvasId];
            const activeModule = currentProject.modules?.[activeCanvas?.moduleId];
            const currentName = activeModule?.name || activeTopModuleName;
            const moduleName = requestedName?.trim()
                ? getUniqueCanvasModuleName(requestedName, currentProject, {
                    excludeCanvasIds: [activeCanvas?.id || currentProject.activeCanvasId].filter(Boolean),
                    excludeModuleNames: [currentName].filter(Boolean),
                })
                : currentName;

            const moduleCode = generateStructuralVerilog({
                moduleName,
                nodes,
                edges,
                customCodes,
                exposedPorts,
                includeChildDefinitions: false,
            });

            const nextProject = {
                ...currentProject,
                topModuleName: moduleName,
                modules: {
                    ...(currentProject.modules || {}),
                    ...(activeModule
                        ? {
                            [activeModule.id]: {
                                ...activeModule,
                                name: moduleName,
                                kind: 'hierarchical',
                                ports: portsFromExposedPorts(exposedPorts),
                                rawCode: moduleCode,
                                canvasId: activeCanvas?.id || currentProject.activeCanvasId,
                            },
                        }
                        : {}),
                },
                canvases: {
                    ...(currentProject.canvases || {}),
                    ...(activeCanvas
                        ? {
                            [activeCanvas.id]: {
                                ...activeCanvas,
                                name: moduleName,
                                nodes,
                                edges,
                                exposedPorts,
                            },
                        }
                        : {}),
                },
            };

            recordHistory();
            setProjectModel(nextProject);
            setCustomCodes((currentCodes) => ({ ...currentCodes, [moduleName]: moduleCode }));
            setImportStatus({
                type: 'success',
                message: `Saved current canvas as structural module ${moduleName}.v.`,
            });
        },
        [
            activeTopModuleName,
            customCodes,
            edges,
            exposedPorts,
            getCurrentProjectSnapshot,
            getUniqueCanvasModuleName,
            nodes,
            recordHistory,
        ]
    );

    const handleInstantiateCanvas = useCallback(
        (canvasId) => {
            const currentProject = getCurrentProjectSnapshot();
            const targetModule = getCanvasModuleDefinition(currentProject, canvasId);
            const targetCanvas = currentProject.canvases?.[canvasId];

            if (!targetModule || !targetCanvas) {
                showError('Could not find the selected canvas module.');
                return;
            }
            if (canvasId === currentProject.activeCanvasId) {
                showError('A canvas cannot instantiate itself directly.');
                return;
            }

            const moduleCode = generateStructuralVerilog({
                moduleName: targetModule.name,
                nodes: targetCanvas.nodes || [],
                edges: targetCanvas.edges || [],
                customCodes,
                exposedPorts: targetCanvas.exposedPorts || {},
                includeChildDefinitions: false,
            });
            const instanceName = getUniqueInstanceName(`u_${targetModule.name}`);
            const nodeId = getUniqueNodeId(instanceName);
            const projectedPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            const spawnPos = getSmartSpawnPosition(nodes, projectedPosition.x - 90, projectedPosition.y - 60);

            recordHistory();
            setCustomCodes((currentCodes) => ({ ...currentCodes, [targetModule.name]: moduleCode }));
            setNodes((currentNodes) => currentNodes.concat({
                id: nodeId,
                type: 'hardware',
                position: spawnPos,
                data: {
                    moduleName: targetModule.name,
                    instanceName,
                    theme,
                    inputs: targetModule.ports?.inputs || [],
                    outputs: targetModule.ports?.outputs || [],
                    autoRoute: {},
                    portsSwapped: false,
                    tieoffs: {},
                    exposedPorts: {},
                    isHierarchicalInstance: true,
                    sourceCanvasId: canvasId,
                },
            }));
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setImportStatus({
                type: 'success',
                message: `Instantiated ${targetModule.name} on ${activeTopModuleName}.`,
            });
        },
        [
            activeTopModuleName,
            customCodes,
            getCurrentProjectSnapshot,
            getUniqueInstanceName,
            getUniqueNodeId,
            nodes,
            recordHistory,
            screenToFlowPosition,
            setNodes,
            showError,
            theme,
        ]
    );

    const handleDeleteCanvas = useCallback(
        (canvasId) => {
            const currentProject = getCurrentProjectSnapshot();
            const result = deleteCanvasFromProject(currentProject, canvasId, {
                nodes,
                edges,
                exposedPorts,
                theme,
            });

            if (!result.ok) {
                showError(result.reason || 'Could not delete the selected canvas.');
                return;
            }

            recordHistory();
            setProjectModel(result.project);
            setNodes(result.state.nodes);
            setEdges(result.state.edges);
            setExposedPorts(result.state.exposedPorts);
            setCustomCodes((currentCodes) => {
                if (!result.deletedModuleName) return currentCodes;
                const nextCodes = { ...currentCodes };
                delete nextCodes[result.deletedModuleName];
                return nextCodes;
            });
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setImportStatus({
                type: 'success',
                message: `Deleted canvas ${result.deletedCanvasName || result.deletedModuleName}.`,
            });
        },
        [
            edges,
            exposedPorts,
            getCurrentProjectSnapshot,
            nodes,
            recordHistory,
            setEdges,
            setExposedPorts,
            setNodes,
            showError,
            theme,
        ]
    );

    // ============================================================
    // 20. MODULE CREATION (CUSTOM & PREBUILT)
    // ============================================================
    const [newModuleName, setNewModuleName] = useState('alu');
    const [newInputs, setNewInputs] = useState('a[15:0], b[15:0], op[3:0]');
    const [newOutputs, setNewOutputs] = useState('res[15:0], zero');

    const createBlock = useCallback(
        (ev) => {
            ev.preventDefault();
            const cleanName = newModuleName.trim();
            if (!cleanName) return;

            if (nodes.some((n) => n.data.moduleName === cleanName)) {
                showError(`A module named '${cleanName}' already exists. Module names must be unique.`);
                return;
            }

            const parsedInputs = parsePorts(newInputs);
            const parsedOutputs = parsePorts(newOutputs);

            const error = validatePorts(parsedInputs, parsedOutputs);
            if (error) {
                showError(error);
                return;
            }
            recordHistory();

            const initialAutoRoute = {};
            parsedInputs.forEach((p) => {
                const routeSignal = getDefaultAutoRouteSignal(p.name);
                if (routeSignal) initialAutoRoute[p.name] = routeSignal;
            });
            const projectedPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            const spawnPos = getSmartSpawnPosition(nodes, projectedPosition.x - 90, projectedPosition.y - 60);
            const instanceId = `u_${cleanName}_${Date.now().toString().slice(-4)}`;

            setCustomCodes((prev) => {
                const portDecls = [];
                parsedInputs.forEach((p) =>
                    portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`)
                );
                parsedOutputs.forEach((p) =>
                    portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`)
                );

                const freshlyCompiledCode = `// ============================================================================
// Target Cell Block : ${cleanName}
// [USAGE NOTE]:
// The output ports below default to SystemVerilog 'logic'. For legacy IEEE 1364 
// Verilog environments, safely change 'output logic' to 'output wire' or 
// 'output reg' to achieve strict toolchain alignment where necessary.
// ============================================================================

module ${cleanName} (\n${portDecls.join(',\n')}\n);\n\n// Write internal design logic here\n\nendmodule\n`;

                return {
                    ...prev,
                    [cleanName]: freshlyCompiledCode,
                };
            });

            setNodes((nds) =>
                nds.concat({
                    id: instanceId,
                    type: 'hardware',
                    position: spawnPos,
                    data: {
                        moduleName: cleanName,
                        instanceName: instanceId,
                        theme,
                        inputs: parsedInputs,
                        outputs: parsedOutputs,
                        autoRoute: initialAutoRoute,
                        portsSwapped: false,
                        tieoffs: {},
                        exposedPorts: {},
                    },
                })
            );
        },
        [newModuleName, newInputs, newOutputs, nodes, recordHistory, setCustomCodes, setNodes, screenToFlowPosition, showError, theme]
    );

    const spawnPrebuilt = useCallback(
        (key) => {
            recordHistory();
            const conf = STANDARD_LIBRARY[key];
            let counter = 0;
            let newModuleName = `${key}_${counter}`;
            while (nodes.some((n) => n.data.moduleName === newModuleName)) {
                counter++;
                newModuleName = `${key}_${counter}`;
            }
            const instanceId = `u_${newModuleName}_${Date.now().toString().slice(-4)}`;
            const nodeType = conf.type || 'hardware';
            const parsedInputs = parsePorts(conf.inputs);
            const parsedOutputs = parsePorts(conf.outputs);
            const initialAutoRoute = {};
            parsedInputs.forEach((p) => {
                const routeSignal = getDefaultAutoRouteSignal(p.name);
                if (routeSignal) initialAutoRoute[p.name] = routeSignal;
            });
            const projectedPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            const spawnPos = getSmartSpawnPosition(nodes, projectedPosition.x - 30, projectedPosition.y - 30);
            setNodes((nds) =>
                nds.concat({
                    id: instanceId,
                    type: nodeType,
                    position: spawnPos,
                    data: {
                        moduleName: newModuleName,
                        instanceName: instanceId,
                        theme,
                        gateKey: key,
                        standardKey: key,
                        fixedPorts: conf.fixedPorts || [],
                        gateShape: conf.gateShape,
                        inputs: parsedInputs,
                        outputs: parsedOutputs,
                        autoRoute: initialAutoRoute,
                        isSplitter: conf.isSplitter,
                        isBundler: conf.isBundler,
                        portsSwapped: false,
                        tieoffs: {},
                        exposedPorts: {},
                    },
                })
            );
            if (nodeType === 'splitter') {
                setCustomCodes((prev) => ({
                    ...prev,
                    [newModuleName]: `// Structural Cell [${newModuleName}] handled via Top inline vector slice assignments.`,
                }));
                return;
            }
            setCustomCodes((prev) => {
                const portDecls = [];
                parsedInputs.forEach((p) =>
                    portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`)
                );
                parsedOutputs.forEach((p) =>
                    portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`)
                );
                let code = `module ${newModuleName} (\n${portDecls.join(',\n')}\n);\n\n${conf.code}\n\nendmodule\n`;
                return { ...prev, [newModuleName]: code };
            });
        },
        [nodes, recordHistory, setNodes, setCustomCodes, screenToFlowPosition, theme]
    );

    // ============================================================
    // 21. LAYOUT & SEARCH / TRACE HELPERS
    // ============================================================
    const arrangeTopologicalLayout = useCallback(() => {
        if (nodes.length === 0) return;
        recordHistory();
        const nodeById = new Map(nodes.map((node) => [node.id, node]));
        const nodePortCount = (node) => Math.max(node?.data?.inputs?.length || 0, node?.data?.outputs?.length || 0);
        const nodeHeight = (node) => Math.max(150, 92 + nodePortCount(node) * 25);
        const nodeWidth = (node) => {
            const longestPort = [...(node?.data?.inputs || []), ...(node?.data?.outputs || [])]
                .reduce((max, port) => Math.max(max, String(port.name || '').length), 0);
            return Math.max(270, Math.min(430, 205 + longestPort * 7));
        };

        const semanticStage = (node) => {
            const name = `${node?.data?.moduleName || ''} ${node?.data?.instanceName || ''}`.toLowerCase();
            if (/pc|instr|fetch|scheduler/.test(name)) return 0;
            if (/decode|decoder|cmp|compare|branch/.test(name)) return 1;
            if (/reg_wr_src|regwrite|writeback|wb/.test(name)) return 4;
            if (/lsu|dmem|mem|cache/.test(name)) return 4;
            if (/alu|exec|rv_dmux|dmux|mux/.test(name)) return 3;
            if (/reg|register/.test(name)) return 2;
            return null;
        };

        const adj = {};
        const inDegree = {};
        const topoColumn = {};
        nodes.forEach((n) => {
            adj[n.id] = [];
            inDegree[n.id] = 0;
            topoColumn[n.id] = 0;
        });
        edges.filter((edge) => !isGlobalNetEdge(edge)).forEach((e) => {
            if (adj[e.source] && adj[e.target] !== undefined) {
                adj[e.source].push(e.target);
                inDegree[e.target]++;
            }
        });
        const queue = [];
        nodes.forEach((n) => {
            if (inDegree[n.id] === 0) {
                queue.push(n.id);
            }
        });
        while (queue.length > 0) {
            const u = queue.shift();
            const currentLayer = topoColumn[u];
            adj[u].forEach((v) => {
                topoColumn[v] = Math.max(topoColumn[v], currentLayer + 1);
                inDegree[v]--;
                if (inDegree[v] === 0) {
                    queue.push(v);
                }
            });
        }

        const rawTopoMax = Math.max(1, ...Object.values(topoColumn));
        const desiredStageCount = Math.min(6, Math.max(4, Math.ceil(Math.sqrt(nodes.length)) + 1));
        const nodeColumn = {};
        nodes.forEach((node) => {
            const semantic = semanticStage(node);
            const normalizedTopo = Math.round((topoColumn[node.id] / rawTopoMax) * (desiredStageCount - 1));
            if (semantic !== null) {
                nodeColumn[node.id] = Math.min(desiredStageCount - 1, semantic);
            } else {
                nodeColumn[node.id] = Math.min(desiredStageCount - 1, normalizedTopo);
            }
        });

        const columnGroups = {};
        Object.entries(nodeColumn).forEach(([id, col]) => {
            if (!columnGroups[col]) columnGroups[col] = [];
            columnGroups[col].push(id);
        });
        Object.values(columnGroups).forEach((group) => {
            group.sort((a, b) => {
                const nodeA = nodeById.get(a);
                const nodeB = nodeById.get(b);
                const laneA = Number(String(nodeA?.data?.moduleName || nodeA?.data?.instanceName || '').match(/(?:lane|reg|alu|r)(\d+)/i)?.[1] ?? 99);
                const laneB = Number(String(nodeB?.data?.moduleName || nodeB?.data?.instanceName || '').match(/(?:lane|reg|alu|r)(\d+)/i)?.[1] ?? 99);
                if (laneA !== laneB) return laneA - laneB;
                const portDelta = nodePortCount(nodeB) - nodePortCount(nodeA);
                if (portDelta !== 0) return portDelta;
                return String(nodeA?.data?.moduleName || '').localeCompare(String(nodeB?.data?.moduleName || ''));
            });
        });

        const startY = 90;
        const rowGap = 110;
        const columnIds = Object.keys(columnGroups).map(Number).sort((a, b) => a - b);
        const columnX = {};
        let runningX = 80;
        columnIds.forEach((col) => {
            columnX[col] = runningX;
            const widest = Math.max(...columnGroups[col].map((id) => nodeWidth(nodeById.get(id))));
            runningX += widest + 260;
        });

        const columnHeights = {};
        columnIds.forEach((col) => {
            columnHeights[col] = columnGroups[col]
                .reduce((sum, id) => sum + nodeHeight(nodeById.get(id)) + rowGap, 0) - rowGap;
        });
        const tallestColumn = Math.max(0, ...Object.values(columnHeights));

        setNodes((currentNodes) => {
            return currentNodes.map((node) => {
                const col = nodeColumn[node.id] ?? 0;
                const colNodes = columnGroups[col] || [node.id];
                const rowIndex = colNodes.indexOf(node.id);
                const columnOffset = Math.max(0, (tallestColumn - (columnHeights[col] || 0)) / 2);
                const y = startY + columnOffset + colNodes
                    .slice(0, rowIndex)
                    .reduce((sum, id) => sum + nodeHeight(nodeById.get(id)) + rowGap, 0);
                return {
                    ...node,
                    position: {
                        x: columnX[col] ?? 80,
                        y,
                    },
                };
            });
        });
        setTimeout(() => {
            fitView({ duration: 500, padding: 0.2 });
        }, 50);
    }, [nodes, edges, recordHistory, setNodes, fitView]);

    const moduleSearchResults = useMemo(() => {
        if (!moduleSearchQuery.trim()) return [];
        const q = moduleSearchQuery.toLowerCase();
        return nodes.filter(
            (n) =>
                n.data.moduleName?.toLowerCase().includes(q) ||
                n.data.instanceName?.toLowerCase().includes(q)
        );
    }, [moduleSearchQuery, nodes]);

    const jumpToNode = useCallback(
        (node) => {
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setCenter(node.position.x + 90, node.position.y + 60, { zoom: 1.2, duration: 500 });
            setSearchHighlightIds(new Set([node.id]));
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === node.id ? { ...n, data: { ...n.data, isDrcFlashing: true } } : n
                )
            );
            setTimeout(() => {
                setNodes((nds) =>
                    nds.map((n) =>
                        n.id === node.id ? { ...n, data: { ...n.data, isDrcFlashing: false } } : n
                    )
                );
            }, 1600);
        },
        [setCenter, setNodes, setSearchHighlightIds, setSelectedNodeId, setSelectedEdgeId, setGlowingNet]
    );

    const handleModuleSearchKey = useCallback(
        (e) => {
            if (moduleSearchResults.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setModuleSearchFocusIdx((i) => Math.min(i + 1, moduleSearchResults.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setModuleSearchFocusIdx((i) => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter') {
                jumpToNode(moduleSearchResults[moduleSearchFocusIdx]);
            }
            if (e.key === 'Escape') {
                setModuleSearchQuery('');
                setSearchHighlightIds(new Set());
            }
        },
        [moduleSearchResults, moduleSearchFocusIdx, jumpToNode, setModuleSearchFocusIdx, setModuleSearchQuery, setSearchHighlightIds]
    );

    const buildHierarchyResult = useCallback(
        (query) => {
            const q = query.toLowerCase().trim();
            if (!q) {
                setHierarchyResults(null);
                return;
            }
            const matchedNodes = nodes.filter(
                (n) =>
                    n.data.moduleName?.toLowerCase().includes(q) ||
                    n.data.instanceName?.toLowerCase().includes(q)
            );
            if (matchedNodes.length === 0) {
                setHierarchyResults([]);
                return;
            }
            const results = matchedNodes.map((node) => {
                const drivers = edges
                    .filter((e) => e.target === node.id)
                    .map((e) => {
                        const srcNode = nodes.find((n) => n.id === e.source);
                        const w = (srcNode?.data.outputs || []).find((p) => p.name === e.sourceHandle)?.width || e.data?.bitWidth || 1;
                        return {
                            edgeId: e.id,
                            sourceNodeId: e.source,
                            sourceHandle: e.sourceHandle,
                            targetHandle: e.targetHandle,
                            srcModuleName: srcNode?.data.moduleName || '?',
                            srcInstanceName: srcNode?.data.instanceName || '?',
                            bitWidth: w,
                        };
                    });
                const fanout = edges
                    .filter((e) => e.source === node.id)
                    .map((e) => {
                        const tgtNode = nodes.find((n) => n.id === e.target);
                        const w = (tgtNode?.data.inputs || []).find((p) => p.name === e.targetHandle)?.width || e.data?.bitWidth || 1;
                        return {
                            edgeId: e.id,
                            targetNodeId: e.target,
                            sourceHandle: e.sourceHandle,
                            targetHandle: e.targetHandle,
                            tgtModuleName: tgtNode?.data.moduleName || '?',
                            tgtInstanceName: tgtNode?.data.instanceName || '?',
                            bitWidth: w,
                        };
                    });
                const fanoutByPort = {};
                fanout.forEach((f) => {
                    if (!fanoutByPort[f.sourceHandle]) fanoutByPort[f.sourceHandle] = [];
                    fanoutByPort[f.sourceHandle].push(f);
                });
                const unconnectedInputs = (node.data.inputs || []).filter(
                    (p) =>
                        !edges.some((e) => e.target === node.id && e.targetHandle === p.name) &&
                        !node.data.autoRoute?.[p.name] &&
                        !node.data.tieoffs?.[p.name]
                );
                return { node, drivers, fanoutByPort, unconnectedInputs };
            });
            setHierarchyResults(results);
            setHierarchyExpanded({});
        },
        [nodes, edges]
    );

    const highlightNetPath = useCallback(
        (edgeId, nodeId) => {
            setSearchHighlightIds(new Set([nodeId]));
            setSelectedEdgeId(edgeId);
            setSelectedNodeId(null);
            setGlowingNet(null);
            setTraceGlowingEdgeId(edgeId);

            setEdges((eds) =>
                eds.map((e) =>
                    e.id === edgeId
                        ? { ...e, selected: true, data: { ...e.data, isFlashing: true } }
                        : { ...e, selected: false, data: { ...e.data, isFlashing: false } }
                )
            );

            setTimeout(() => {
                setEdges((eds) =>
                    eds.map((e) =>
                        e.id === edgeId ? { ...e, data: { ...e.data, isFlashing: false } } : e
                    )
                );
            }, 1600);

            setTimeout(() => {
                setNodes((currentNodes) => {
                    const n = currentNodes.find((nd) => nd.id === nodeId);
                    if (n && n.position) {
                        setCenter(n.position.x + 90, n.position.y + 60, { zoom: 1.2, duration: 500 });
                    }
                    return currentNodes;
                });
            }, 50);
        },
        [setEdges, setCenter, setNodes]
    );

    // ============================================================
    // 21b. VERILOG-TO-SCHEMATIC INTERACTIVE CODE SYNC
    // ============================================================
    const handleVerilogLineClick = useCallback(
        (lineText) => {
            const cleanText = lineText.trim();
            if (!cleanText || cleanText.startsWith('//')) return;

            const wireMatch = cleanText.match(/w_([a-zA-Z0-9_]+)_([a-zA-Z0-9_]+)/);
            if (wireMatch) {
                const targetNodeId = wireMatch[1];
                const targetPortName = wireMatch[2];
                const matchingEdge = edges.find(
                    (e) => e && e.target === targetNodeId && e.targetHandle === targetPortName
                );
                if (matchingEdge) {
                    highlightNetPath(matchingEdge.id, targetNodeId);
                    return;
                }
            }

            const matchingNode = nodes.find((node) => {
                if (!node) return false;
                const instName = node.data?.instanceName;
                const modName = node.data?.moduleName;
                return cleanText.includes(instName) || cleanText.includes(modName);
            });
            if (matchingNode) {
                jumpToNode(matchingNode);
            }
        },
        [nodes, edges, jumpToNode, highlightNetPath]
    );

    // ============================================================
    // 22. MODAL DRAG HANDLING
    // ============================================================
    const onDragEndRef = useRef(null);

    // 1. Drag move handler
    const handleModalDragMove = useCallback((e) => {
        if (!dragStartRef.current) return;
        const { startX, startY, initialX, initialY } = dragStartRef.current;
        setModalPos({
            x: initialX + (e.clientX - startX),
            y: initialY + (e.clientY - startY),
        });
    }, []);

    // 2. Drag end handler - wrapped safely in a useCallback
    const handleModalDragEnd = useCallback(() => {
        dragStartRef.current = null;
        document.removeEventListener('mousemove', handleModalDragMove);
        document.removeEventListener('mouseup', onDragEndRef.current);
    }, [handleModalDragMove]);

    useEffect(() => {
        onDragEndRef.current = handleModalDragEnd;
    }, [handleModalDragEnd]);

    // 3. Drag start handler
    const handleModalDragStart = useCallback((e) => {
        if (e.target.closest('input, textarea, button, select')) return;
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: modalPos.x,
            initialY: modalPos.y,
        };
        document.addEventListener('mousemove', handleModalDragMove);
        document.addEventListener('mouseup', handleModalDragEnd);
    }, [modalPos.x, modalPos.y, handleModalDragMove, handleModalDragEnd]);


    // ============================================================
    // 23. STYLES
    // ============================================================
    const s = getStyles(t, leftCollapsed, rightCollapsed, leftWidth, rightWidth, draggingLeft || draggingRight);
    const toolbarBtn = {
        ...s.iconBtn,
        gap: '8px',
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 600,
        border: `1px solid ${t.border}`,
        borderRadius: '9px',
        background: t.bgTertiary,
        color: t.textSecondary,
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        minHeight: '34px',
        boxSizing: 'border-box',
        boxShadow: 'none',
        width: 'auto',
        height: 'auto',
    };

    const kbdStyle = {
        background: t.bgTertiary,
        border: `1px solid ${t.borderStrong}`,
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: t.textHeading,
        justifySelf: 'start',
        minWidth: '40px',
        textAlign: 'center',
        boxShadow: `0 2px 0 ${t.borderStrong}`,
    };

    // ============================================================
    // 24. AUTO-SAVE & AUTO-LOAD SYSTEM (LocalStorage Persist)
    // ============================================================
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedData = localStorage.getItem('axon_interlink_workspace');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                const migratedWorkspace = workspacePayloadToFlatState(parsed);
                requestAnimationFrame(() => {
                    setNodes(migratedWorkspace.nodes);
                    setEdges(migratedWorkspace.edges);
                    setCustomCodes(migratedWorkspace.customCodes || {});
                    setExposedPorts(migratedWorkspace.exposedPorts || {});
                    setProjectModel(migratedWorkspace.project);
                    if (migratedWorkspace.theme) setTheme(migratedWorkspace.theme);
                    setIsHydrated(true);
                });
            } catch (error) {
                console.error('Failed to parse auto-saved workspace data:', error);
                requestAnimationFrame(() => setIsHydrated(true));
            }
        } else {
            requestAnimationFrame(() => setIsHydrated(true));
        }
    }, [setNodes, setEdges, setCustomCodes, setExposedPorts, setTheme]);

    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (!isHydrated) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const dataToSave = createWorkspacePayload({
                nodes,
                edges,
                customCodes,
                exposedPorts,
                theme,
                previousProject: projectModel,
            });
            localStorage.setItem('axon_interlink_workspace', JSON.stringify(dataToSave));
        }, 500);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [nodes, edges, customCodes, exposedPorts, theme, projectModel, isHydrated]);


    // ============================================================
    // 25. CODE SAVE HANDLER
    // ============================================================
    const onSaveCode = useCallback((targetNodeId, moduleName, updatedCode, quantity = 1) => {
        if (typeof recordHistory === 'function') recordHistory();

        const targetBaseName = moduleName;
        const { inputs: newParsedInputs, outputs: newParsedOutputs } = parseVerilogToPorts(updatedCode);

        // 1. Core structural map tracking
        setCustomCodes(prev => {
            const updatedCodes = { ...prev, [targetBaseName]: updatedCode };
            if (quantity > 1) {
                updatedCodes[`${targetBaseName}_0`] = updatedCode;
                for (let i = 1; i < quantity; i++) {
                    updatedCodes[`${targetBaseName}_${i}`] = updatedCode;
                }
            }
            return updatedCodes;
        });

        // 2. Node array state synchronization
        setNodes(nds => {
            const baseNode = nds.find(n => n.id === targetNodeId);
            if (!baseNode) return nds;

            const updatedNodes = nds.map(node => {
                if (node.id === targetNodeId || node.data.moduleName === targetBaseName) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            code: updatedCode,
                            // Synchronize structural ports seamlessly!
                            inputs: newParsedInputs,
                            outputs: newParsedOutputs,
                            moduleName: quantity > 1 && node.id === targetNodeId ? `${targetBaseName}_0` : node.data.moduleName
                        }
                    };
                }
                return node;
            });

            if (quantity > 1) {
                const batchClones = [];
                for (let i = 1; i < quantity; i++) {
                    const cloneId = `${targetNodeId}_batch_${Date.now()}_${i}`;
                    batchClones.push({
                        ...baseNode,
                        id: cloneId,
                        position: {
                            x: baseNode.position.x + (i * 45),
                            y: baseNode.position.y + (i * 45)
                        },
                        data: {
                            ...baseNode.data,
                            code: updatedCode,
                            inputs: newParsedInputs, // Synchronize to clones
                            outputs: newParsedOutputs, // Synchronize to clones
                            moduleName: `${targetBaseName}_${i}`
                        }
                    });
                }
                return updatedNodes.concat(batchClones);
            }

            return updatedNodes;
        });

        setEdges(eds => {
            return eds.filter(edge => {
                if (edge.target === targetNodeId) {
                    return newParsedInputs.some(p => p.name === edge.targetHandle);
                }
                if (edge.source === targetNodeId) {
                    return newParsedOutputs.some(p => p.name === edge.sourceHandle);
                }
                return true;
            });
        });

    }, [setCustomCodes, setNodes, setEdges, recordHistory]);


    

    // ============================================================
    // 26. RENDER
    // ============================================================
    return (
        <div style={s.app}>
            {/* HEADER */}
            <Header
                s={s}
                theme={theme}
                t={t}
                nodes={nodes}
                warnings={warnings}
                edges={edges}
                undo={undo}
                toolbarBtn={toolbarBtn}
                past={past}
                redo={redo}
                future={future}
                handleLoadWorkspace={handleLoadWorkspace}
                handleSaveWorkspace={handleSaveWorkspace}
                fileInputRef={fileInputRef}
                setShowClearModal={setShowClearModal}
                setShowHelp={setShowHelp}
                setTheme={setTheme}
                helpColors={helpColors}
                arrangeTopologicalLayout={arrangeTopologicalLayout}
                colorWiresByModule={colorWiresByModule}
                setColorWiresByModule={setColorWiresByModule}
                animateWireFlow={animateWireFlow}
                setAnimateWireFlow={setAnimateWireFlow}
            />

            {/* CONTEXTUAL MODAL (NODE / EDGE CONFIG) */}
            <ContextualModal
                key={activeModal.id}
                activeModal={activeModal}
                modalPos={modalPos}
                nodes={nodes}
                edges={computedEdges}
                theme={theme}
                t={t}
                s={s}
                modalTab={modalTab}
                setModalTab={setModalTab}
                exposedPorts={exposedPorts}
                currentModuleCode={currentModuleCode}
                handleModalDragStart={handleModalDragStart}
                setActiveModal={setActiveModal}
                updateSelectedNode={updateSelectedNode}
                togglePortSwap={togglePortSwap}
                toggleExposePort={toggleExposePort}
                getPortLabel={getPortLabel}
                parsePorts={parsePorts}
                recordHistory={recordHistory}
                setNodes={setNodes}
                setEdges={setEdges}
                setExposedPorts={setExposedPorts}
                setSelectedNodeId={setSelectedNodeId}
                setSelectedEdgeId={setSelectedEdgeId}
                setGlowingNet={setGlowingNet}
                onSaveCode={onSaveCode}
            />

            {/* CLEAR MODAL */}
            <ClearModal
                showClearModal={showClearModal}
                theme={theme}
                setShowClearModal={setShowClearModal}
                t={t}
                handleClearAll={handleClearAll}
                s={s}
            />

            {/* SAVE MODAL */}
            <SaveModal
                theme={theme}
                setShowSaveModal={setShowSaveModal}
                setProposedFileName={setProposedFileName}
                proposedFileName={proposedFileName}
                executeActualDownload={executeActualDownload}
                showSaveModal={showSaveModal}
                t={t}
                s={s}
            />

            {/* HELP MODAL */}
            <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} t={t} theme={theme} kbdStyle={kbdStyle} />

            {/* ERROR MODAL */}
            <ErrorModal errorModal={errorModal} theme={theme} setErrorModal={setErrorModal} t={t} s={s} />

            {/* MAIN LAYOUT */}
            <div style={s.main} ref={mainRef}>
                <LeftPanel
                    leftCollapsed={leftCollapsed}
                    setLeftTab={setLeftTab}
                    setLeftCollapsed={setLeftCollapsed}
                    leftTab={leftTab}
                    theme={theme}
                    t={t}
                    s={s}
                    setIsLibOpen={setIsLibOpen}
                    createBlock={createBlock}
                    setSelectedStandardBlock={setSelectedStandardBlock}
                    spawnPrebuilt={spawnPrebuilt}
                    selectedStandardBlock={selectedStandardBlock}
                    setSelectedEdgeId={setSelectedEdgeId}
                    setSelectedNodeId={setSelectedNodeId}
                    isLibOpen={isLibOpen}
                    newModuleName={newModuleName}
                    setNewModuleName={setNewModuleName}
                    setNewInputs={setNewInputs}
                    setNewOutputs={setNewOutputs}
                    nodes={nodes}
                    edges={edges}
                    newInputs={newInputs}
                    newOutputs={newOutputs}
                    exposedPorts={exposedPorts}
                    setCenter={setCenter}
                    setNodes={setNodes}
                    searchInputRef={searchInputRef}
                    moduleSearchQuery={moduleSearchQuery}
                    setModuleSearchFocusIdx={setModuleSearchFocusIdx}
                    jumpToNode={jumpToNode}
                    setSearchHighlightIds={setSearchHighlightIds}
                    setModuleSearchQuery={setModuleSearchQuery}
                    handleModuleSearchKey={handleModuleSearchKey}
                    moduleSearchResults={moduleSearchResults}
                    moduleSearchFocusIdx={moduleSearchFocusIdx}
                    hierarchyExpanded={hierarchyExpanded}
                    hierarchyResults={hierarchyResults}
                    setHierarchyExpanded={setHierarchyExpanded}
                    setHierarchyResults={setHierarchyResults}
                    setHierarchySearchQuery={setHierarchySearchQuery}
                    hierarchySearchQuery={hierarchySearchQuery}
                    hierarchyInputRef={hierarchyInputRef}
                    highlightNetPath={highlightNetPath}
                    buildHierarchyResult={buildHierarchyResult}
                    customCodes={customCodes}
                    getModuleCode={getModuleCode}
                    onSaveCode={onSaveCode}
                    onImportVerilogFiles={handleImportVerilogFiles}
                    importStatus={importStatus}
                    onDeleteModuleFile={handleDeleteModuleFile}
                    projectModel={effectiveProjectModel}
                    onCreateCanvas={handleCreateCanvas}
                    onOpenCanvas={handleOpenCanvas}
                    onInstantiateCanvas={handleInstantiateCanvas}
                    onPromoteCurrentCanvas={handlePromoteCurrentCanvas}
                    onDeleteCanvas={handleDeleteCanvas}
                />
                {!leftCollapsed && <ResizeHandle onMouseDown={onMouseDownLeft} isDragging={draggingLeft} />}

                <Canvas
                    nodes={nodes}
                    edges={displayEdges}
                    onNodeClick={onNodeClick}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onReconnect={onReconnect}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={onPaneClick}
                    edgeTypes={edgeTypes}
                    nodeTypes={nodeTypes}
                    recordHistory={recordHistory}
                    ConnectionMode={ConnectionMode}
                    t={t}
                    s={s}
                    isValidConnection={isValidConnection}
                    wireViewMode={wireViewMode}
                    setWireViewMode={setWireViewMode}
                    wireStats={wireStats}
                />
                {!rightCollapsed && <ResizeHandle onMouseDown={onMouseDownRight} isDragging={draggingRight} />}

                <RightPanel
                    s={s}
                    setTopViewMode={setTopViewMode}
                    setRightCollapsed={setRightCollapsed}
                    rightCollapsed={rightCollapsed}
                    topViewMode={topViewMode}
                    t={t}
                    theme={theme}
                    exposedPorts={exposedPorts}
                    nodes={nodes}
                    handleVerilogLineClick={handleVerilogLineClick}
                    structuralVerilogFull={structuralVerilogFull}
                    testbenchCodeFull={testbenchCodeFull}
                    copied={copied}
                    handleCopyCode={handleCopyCode}
                    downloadTextFile={downloadTextFile}
                    onImportTopModuleFiles={handleImportTopModuleFiles}
                    activeTopModuleName={activeTopModuleName}
                />
            </div>
        </div>
    );
}

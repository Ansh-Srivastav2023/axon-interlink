import React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow, Background, Controls, addEdge,
    useNodesState, useEdgesState, Panel, useKeyPress,
    getBezierPath, EdgeLabelRenderer, useReactFlow,
    reconnectEdge, ConnectionMode, Handle, Position,
    ReactFlowProvider, useUpdateNodeInternals, useEdges
} from '@xyflow/react';
import { IconArrowBackUp, IconArrowForwardUp, IconHierarchy2 } from '@tabler/icons-react';
import { AppLogo } from './Logo';
import { FaMoon, FaSun } from "react-icons/fa";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import HardwareNode from './components/HardwareNode';
import GateNode from './components/GateNode';
import SplitterNode from './components/SplitterNode';
import ResizeHandle from './edges/ResizeHandle';
import SmartEdge from './edges/SmartEdge';
import getStyles from './styles/getStyles';
import {
    STANDARD_LIBRARY, parsePorts, getPortLabel, getSmartSpawnPosition, validatePorts
} from './utils/hardwareutils';
import {
    themes, lightNodeStyles, darkNodeStyles
} from './styles';
import {
    IconAlert, IconZap, IconCircleSlash, IconActivity, IconHelp,
    IconInfo, IconX, IconGrid, IconSearch, IconTrace, IconSave,
    IconFolder, IconTrash, IconUndo, IconRedo, IconChevronRight,
    IconChevronLeft, IconCode, IconBox, IconTerminal
} from './styles';
import { highlightVerilogCode } from './verilog-code/verilogEdits';

const edgeTypes = { smart: SmartEdge };
const nodeTypes = { hardware: HardwareNode, gate: GateNode, splitter: SplitterNode };


export default function FlowCanvas() {
    /* ============================================================
       1. THEME & UI STATE
       ============================================================ */
    const [theme, setTheme] = useState('light');
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



    /* ============================================================
       2. PANEL RESIZE STATE & HANDLERS
       ============================================================ */
    const dragRef = useRef({ left: false, right: false, startX: 0, startW: 0 });
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [leftWidth, setLeftWidth] = useState(320);
    const [rightWidth, setRightWidth] = useState(420);
    const [draggingLeft, setDraggingLeft] = useState(false);
    const [draggingRight, setDraggingRight] = useState(false);

    const onMouseDownLeft = useCallback((e) => {
        e.preventDefault();
        dragRef.current = { left: true, right: false, startX: e.clientX, startW: leftWidth };
        setDraggingLeft(true);
    }, [leftWidth]);

    const onMouseDownRight = useCallback((e) => {
        e.preventDefault();
        dragRef.current = { left: false, right: true, startX: e.clientX, startW: rightWidth };
        setDraggingRight(true);
    }, [rightWidth]);

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

    /* ============================================================
       3. NODES, EDGES, SELECTION & WARNINGS
       ============================================================ */
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [glowingNet, setGlowingNet] = useState(null);
    const [warnings, setWarnings] = useState([]);

    const [customCodes, setCustomCodes] = useState({});
    const [exposedPorts, setExposedPorts] = useState({});

    /* ============================================================
       4. LEFT PANEL TABS & SEARCH / TRACE STATE
       ============================================================ */
    const [moduleSearchQuery, setModuleSearchQuery] = useState('');
    const [moduleSearchFocusIdx, setModuleSearchFocusIdx] = useState(0);
    const [searchHighlightIds, setSearchHighlightIds] = useState(new Set());
    const [hierarchySearchQuery, setHierarchySearchQuery] = useState('');
    const [hierarchyResults, setHierarchyResults] = useState(null);
    const [hierarchyExpanded, setHierarchyExpanded] = useState({});
    const [leftTab, setLeftTab] = useState('library');

    const [selectedStandardBlock, setSelectedStandardBlock] = useState('and_gate');
    const [isLibOpen, setIsLibOpen] = useState(false);

    const [showHelp, setShowHelp] = useState(false);

    /* ============================================================
       5. RIGHT PANEL VIEW MODE & COPY
       ============================================================ */
    const [topViewMode, setTopViewMode] = useState('code');
    const [copied, setCopied] = useState(false);

    /* ============================================================
       6. MODALS (CONFIG, SAVE, CLEAR)
       ============================================================ */
    const [activeModal, setActiveModal] = useState({ type: null, id: null });
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [proposedFileName, setProposedFileName] = useState('');
    const [showClearModal, setShowClearModal] = useState(false);
    const [modalTab, setModalTab] = useState('properties');
    const [modalPos, setModalPos] = useState({ x: 100, y: 100 });
    const dragStartRef = useRef(null);
    const [errorModal, setErrorModal] = useState({ show: false, message: '' }); // for duplicate variables in a module error box
    const showError = (message) => {
        setErrorModal({ show: true, message });
    };

    /* ============================================================
       7. UNDO / REDO
       ============================================================ */
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    const captureSnapshot = useCallback(() => {
        return {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
            customCodes: { ...customCodes },
            exposedPorts: { ...exposedPorts }
        };
    }, [nodes, edges, customCodes, exposedPorts]);

    const recordHistory = useCallback(() => {
        setPast(prev => [...prev, captureSnapshot()]);
        setFuture([]);
    }, [captureSnapshot]);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        const current = captureSnapshot();
        setPast(newPast);
        setFuture(next => [current, ...next]);
        setNodes(previous.nodes);
        setEdges(previous.edges);
        setCustomCodes(previous.customCodes);
        setExposedPorts(previous.exposedPorts);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
    }, [past, captureSnapshot, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        const current = captureSnapshot();
        setPast(prev => [...prev, current]);
        setFuture(newFuture);
        setNodes(next.nodes);
        setEdges(next.edges);
        setCustomCodes(next.customCodes);
        setExposedPorts(next.exposedPorts);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
    }, [future, captureSnapshot, setNodes, setEdges]);

    /* ============================================================
       8. REFS FOR INPUT FOCUS
       ============================================================ */
    const searchInputRef = useRef(null);
    const hierarchyInputRef = useRef(null);

    /* ============================================================
       9. KEYBOARD SHORTCUTS
       ============================================================ */
    const deletePressed = useKeyPress('Delete');
    const escPressed = useKeyPress('Escape');
    const spacePressed = useKeyPress('Space');

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
                setNodes(nds => nds.map(n => ({ ...n, selected: true })));
                setEdges(eds => eds.map(ed => ({ ...ed, selected: true })));
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
                    const node = nodes.find(n => n.id === selectedNodeId);
                    if (node) setCenter(node.position.x + 90, node.position.y + 60, { zoom: 1.2, duration: 400 });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, fitView, setCenter, selectedNodeId, nodes, setNodes, setEdges, showSaveModal]);

    /* ============================================================
       10. DELETE & ESCAPE HANDLING
       ============================================================ */
    useEffect(() => {
        if (!deletePressed) return;
        if (selectedNodeId) {
            recordHistory();
            setNodes(nds => nds.filter(n => !n.selected));
            setEdges(eds => eds.filter(e => !e.selected && e.source !== selectedNodeId && e.target !== selectedNodeId));
            setExposedPorts(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (next[key].nodeId === selectedNodeId) delete next[key];
                });
                return next;
            });
            setSelectedNodeId(null);
        }
        if (selectedEdgeId) {
            recordHistory();
            setEdges(eds => eds.filter(e => !e.selected));
            setSelectedEdgeId(null);
            setGlowingNet(null);
        }
    }, [deletePressed, selectedNodeId, selectedEdgeId, setNodes, setEdges, recordHistory]);

    useEffect(() => {
        if (escPressed) {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setGlowingNet(null);
            setNodes(n => n.map(x => ({ ...x, selected: false })));
            setEdges(e => e.map(x => ({ ...x, selected: false })));
            setActiveModal({ type: null, id: null });
            setShowHelp(false);
            setShowSaveModal(false);
            setShowClearModal(false);
            setErrorModal({ show: false, message: '' });
            setNodes(nds => nds.map(n => ({
                ...n,
                data: { ...n.data, _closeInfoTrigger: Date.now() }
            })));
        }
    }, [escPressed, setNodes, setEdges]);

    /* ============================================================
       11. THEME SYNC
       ============================================================ */
    useEffect(() => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, theme } })));
    }, [theme, setNodes]);

    /* ============================================================
       12. EDGE WARNINGS & BIT WIDTH INFERENCE
       ============================================================ */
    const checkEdgeWarnings = useCallback((edge, currentNodes) => {
        const srcNode = currentNodes.find(n => n.id === edge.source);
        const tgtNode = currentNodes.find(n => n.id === edge.target);
        if (!srcNode || !tgtNode) return null;
        const srcPort = (srcNode.data.outputs || []).find(p => p.name === edge.sourceHandle);
        const tgtPort = (tgtNode.data.inputs || []).find(p => p.name === edge.targetHandle);
        if (!srcPort || !tgtPort) return null;
        if (srcPort.width !== tgtPort.width) return `Bit-width mismatch: ${srcPort.name}[${srcPort.width}b] → ${tgtPort.name}[${tgtPort.width}b]`;
        return null;
    }, []);

    useEffect(() => {
        const activeWarnings = edges.map(e => ({ id: e.id, msg: checkEdgeWarnings(e, nodes) })).filter(w => w.msg);
        setWarnings(activeWarnings);
        setEdges(eds => eds.map(e => {
            const srcNode = nodes.find(n => n.id === e.source);
            const tgtNode = nodes.find(n => n.id === e.target);
            const srcPort = (srcNode?.data.outputs || []).find(p => p.name === e.sourceHandle) || (srcNode?.data.inputs || []).find(p => p.name === e.sourceHandle);
            const tgtPort = (tgtNode?.data.inputs || []).find(p => p.name === e.targetHandle) || (tgtNode?.data.outputs || []).find(p => p.name === e.targetHandle);
            const sourceWidth = srcPort?.width || 1;
            const targetWidth = tgtPort?.width || 1;
            const nativeWidth = e.data?.bitWidth || sourceWidth;
            const allowedMaxWidth = Math.min(sourceWidth, targetWidth);
            const configuredWidth = Math.min(nativeWidth, allowedMaxWidth);
            const warning = checkEdgeWarnings(e, nodes);
            return { ...e, type: 'smart', data: { ...e.data, warning, bitWidth: Math.max(1, configuredWidth) } };
        }));
    }, [nodes, edges.length, checkEdgeWarnings, setEdges]);

    /* ============================================================
       13. DYNAMIC SPLITTER / BUNDLER AUTO‑INFERENCE
       ============================================================ */
    useEffect(() => {
        let nodesChanged = false;
        const updatedNodes = nodes.map(node => {
            if (node.type !== 'splitter') return node;

            // ---------- SPLITTER (unchanged) ----------
            if (node.data.isSplitter) {
                const inputEdge = edges.find(e => e.target === node.id);
                let inferredInWidth = 1;
                if (inputEdge) {
                    const srcNode = nodes.find(n => n.id === inputEdge.source);
                    const srcPort = srcNode?.data.outputs?.find(p => p.name === inputEdge.sourceHandle);
                    if (srcPort) inferredInWidth = srcPort.width;
                }
                const connectedOutEdges = edges.filter(e => e.source === node.id);
                let dynamicOutputs = [];
                if (connectedOutEdges.length === 0) {
                    dynamicOutputs = (node.data.outputs && node.data.outputs.length > 0)
                        ? node.data.outputs.map(p => ({ ...p }))
                        : [{ name: 'out0', width: inferredInWidth, msb: inferredInWidth - 1, lsb: 0 }];
                } else {
                    const uniqueWiredHandles = Array.from(new Set(
                        connectedOutEdges.map(e => e.sourceHandle).filter(Boolean)
                    ));
                    const totalAllocatedCount = Math.max(node.data.outputs?.length || 0, uniqueWiredHandles.length);
                    let currentLsb = 0;
                    for (let idx = 0; idx < totalAllocatedCount; idx++) {
                        const handleName = `out${idx}`;
                        const wiresForThisHandle = connectedOutEdges.filter(e => e.sourceHandle === handleName);
                        if (wiresForThisHandle.length > 0) {
                            const firstEdge = wiresForThisHandle[0];
                            const tgtNode = nodes.find(n => n.id === firstEdge.target);
                            const tgtPort = tgtNode?.data.inputs?.find(p => p.name === firstEdge.targetHandle);
                            const sliceWidth = tgtPort ? tgtPort.width : 1;
                            dynamicOutputs.push({
                                name: handleName,
                                width: sliceWidth,
                                msb: Math.min(inferredInWidth - 1, currentLsb + sliceWidth - 1),
                                lsb: currentLsb
                            });
                            currentLsb += sliceWidth;
                        } else {
                            const existingPort = node.data.outputs?.[idx];
                            dynamicOutputs.push({
                                name: existingPort?.name || handleName,
                                width: existingPort?.width || 1,
                                msb: existingPort?.msb ?? currentLsb,
                                lsb: existingPort?.lsb ?? currentLsb
                            });
                            currentLsb += (existingPort?.width || 1);
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

            // ---------- BUNDLER (new, input‑preserving) ----------
            if (node.data.isBundler) {
                const inputs = node.data.inputs || [];
                let totalWidth = 0;
                inputs.forEach(p => {
                    totalWidth += (p.width || 1);
                });
                if (totalWidth < 1) totalWidth = 1;

                const currentOutputs = node.data.outputs || [];
                const newOutputs = currentOutputs.length > 0
                    ? [{ ...currentOutputs[0], width: totalWidth, msb: totalWidth - 1, lsb: 0 }]
                    : [{ name: 'out', width: totalWidth, msb: totalWidth - 1, lsb: 0 }];

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
    }, [edges, setNodes]);

    /* ============================================================
       14. GLOW EFFECT (FOR EDGES)
       ============================================================ */
    const [hoveredNetSource, setHoveredNetSource] = useState(null);
    const [glowingNodeId, setGlowingNodeId] = useState(null);

    useEffect(() => {
        setEdges(eds => {
            let changed = false;
            const updated = eds.map(e => {
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

    /* ============================================================
       15. CANVAS INTERACTIONS (CONNECT, CLICK, RECONNECT)
       ============================================================ */
    const onConnect = useCallback((params) => {
        recordHistory();
        let sourceNode = nodes.find(n => n.id === params.source);
        let targetNode = nodes.find(n => n.id === params.target);
        const isSourceOutput = (sourceNode?.data.outputs || []).some(p => p.name === params.sourceHandle);
        const isTargetInput = (targetNode?.data.inputs || []).some(p => p.name === params.targetHandle);
        let normParams = { ...params };
        if (!isSourceOutput && !isTargetInput) {
            const isSourceInput = (sourceNode?.data.inputs || []).some(p => p.name === params.sourceHandle);
            const isTargetOutput = (targetNode?.data.outputs || []).some(p => p.name === params.targetHandle);
            if (isSourceInput && isTargetOutput) {
                normParams = { source: params.target, sourceHandle: params.targetHandle, target: params.source, targetHandle: params.sourceHandle };
                sourceNode = nodes.find(n => n.id === normParams.source);
                targetNode = nodes.find(n => n.id === normParams.target);
            }
        }
        const finalSrcPort = (sourceNode?.data.outputs || []).find(p => p.name === normParams.sourceHandle);
        const finalTgtPort = (targetNode?.data.inputs || []).find(p => p.name === normParams.targetHandle);
        if (!finalSrcPort || !finalTgtPort) {
            console.warn("Invalid net connection blocked.");
            return;
        }
        const srcCompoundKey = `${normParams.source}__${normParams.sourceHandle}`;
        const tgtCompoundKey = `${normParams.target}__${normParams.targetHandle}`;
        setExposedPorts(prev => {
            const next = { ...prev };
            delete next[srcCompoundKey];
            delete next[tgtCompoundKey];
            return next;
        });
        setNodes(nds => nds.map(n => {
            if (n.id === normParams.source || n.id === normParams.target) {
                const newExposed = { ...(n.data.exposedPorts || {}) };
                delete newExposed[normParams.sourceHandle];
                delete newExposed[normParams.targetHandle];
                return { ...n, data: { ...n.data, exposedPorts: newExposed } };
            }
            return n;
        }));
        const portWidth = Math.min(finalSrcPort.width, finalTgtPort.width);
        const newEdge = { ...normParams, id: `e-${normParams.source}-${normParams.sourceHandle}-${normParams.target}-${normParams.targetHandle}`, type: 'smart', data: { bitWidth: portWidth } };
        setEdges(eds => addEdge(newEdge, eds));
    }, [nodes, setEdges, recordHistory]);

    const onReconnect = useCallback((oldEdge, newConnection) => {
        recordHistory();
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    }, [setEdges, recordHistory]);

    const onNodeClick = useCallback((event, node) => {
        if (event.target?.closest?.('.react-flow__handle')) return;
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setTraceGlowingEdgeId(null);
        setModalTab('properties');
        setActiveModal({ type: 'node', id: node.id });
        const modalWidth = 500;
        const mouseX = event.clientX;
        const targetX = (mouseX + modalWidth + 20 > window.innerWidth)
            ? Math.max(20, mouseX - modalWidth - 20)
            : mouseX + 20;
        setModalPos({
            x: targetX,
            y: Math.max(20, Math.min(event.clientY - 100, window.innerHeight - 540))
        });
    }, [nodes]);

    const onEdgeClick = useCallback((event, edge) => {
        setSelectedEdgeId(edge.id);
        setSelectedNodeId(null);
        setTraceGlowingEdgeId(null);
        setGlowingNet({ source: edge.source, sourceHandle: edge.sourceHandle });
        setModalTab('properties');
        setActiveModal({ type: 'edge', id: edge.id });
        const modalWidth = 380;
        const mouseX = event.clientX;
        const targetX = (mouseX + modalWidth + 20 > window.innerWidth)
            ? Math.max(20, mouseX - modalWidth - 20)
            : mouseX + 20;
        setModalPos({
            x: targetX,
            y: Math.max(20, Math.min(event.clientY - 100, window.innerHeight - 540))
        });
    }, [edges]);

    const onPaneClick = useCallback((event) => {
        if (event.target?.closest?.('.react-flow__handle')) return;
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setTraceGlowingEdgeId(null);
    }, []);

    /* ============================================================
       16. SELECTED NODE / EDGE HELPERS
       ============================================================ */
    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
    const selectedEdge = useMemo(() => edges.find(e => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

    /* ============================================================
       17. PORT & NODE UPDATE FUNCTIONS
       ============================================================ */
    const changeEdgeBitWidth = (delta) => {
        if (!selectedEdgeId) return;
        recordHistory();
        setEdges(eds => eds.map(e => e.id === selectedEdgeId ? { ...e, data: { ...e.data, bitWidth: Math.max(1, Math.min(128, (e.data?.bitWidth || 1) + delta)) } } : e));
    };

    const updateTieoff = (nodeId, portName, val) => {
        recordHistory();
        setNodes(nds => nds.map(n => {
            if (n.id !== nodeId) return n;
            const newTieoffs = { ...(n.data.tieoffs || {}) };
            if (!val.trim()) delete newTieoffs[portName];
            else newTieoffs[portName] = val;
            return { ...n, data: { ...n.data, tieoffs: newTieoffs } };
        }));
    };

    const toggleAutoRoute = (nodeId, portName) => {
        recordHistory();
        setNodes(nds => nds.map(n => {
            if (n.id !== nodeId) return n;
            const newAutoRoute = { ...(n.data.autoRoute || {}) };
            if (newAutoRoute[portName]) delete newAutoRoute[portName];
            else newAutoRoute[portName] = true;
            return { ...n, data: { ...n.data, autoRoute: newAutoRoute } };
        }));
    };

    const toggleExposePort = (nodeId, portName, portRef, isInput) => {
        recordHistory();
        setExposedPorts(prev => {
            const key = `${nodeId}__${portName}`;
            const next = { ...prev };
            if (next[key]) delete next[key];
            else next[key] = { nodeId, portName, width: portRef.width, msb: portRef.msb, lsb: portRef.lsb, isInput };
            return next;
        });
        setNodes(nds => nds.map(n => {
            if (n.id !== nodeId) return n;
            const newExposed = { ...(n.data.exposedPorts || {}) };
            if (newExposed[portName]) delete newExposed[portName];
            else newExposed[portName] = true;
            return { ...n, data: { ...n.data, exposedPorts: newExposed } };
        }));
    };

    const togglePortSwap = () => {
        if (!selectedNodeId) return;
        recordHistory();
        setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, portsSwapped: !n.data.portsSwapped } } : n));
    };

    const updateSelectedNode = (field, value) => {
        if (!selectedNodeId) return;
        const nodeToUpdate = nodes.find(n => n.id === selectedNodeId);
        if (!nodeToUpdate) return;

        if (field === 'inputs' || field === 'outputs') {
            const parsed = parsePorts(value);
            // Determine the other port list
            const currentInputs = field === 'inputs' ? parsed : (nodeToUpdate.data.inputs || []);
            const currentOutputs = field === 'outputs' ? parsed : (nodeToUpdate.data.outputs || []);
            const error = validatePorts(currentInputs, currentOutputs);
            if (error) {
                showError(error);
                return; // Block the update
            }
        }
        recordHistory();
        const oldModuleName = nodeToUpdate.data.moduleName;
        const newValue = field.includes('puts') ? parsePorts(value) : value;
        const newModuleName = field === 'moduleName' ? value.trim() : oldModuleName;
        const newInputs = field === 'inputs' ? newValue : (nodeToUpdate.data.inputs || []);
        const newOutputs = field === 'outputs' ? newValue : (nodeToUpdate.data.outputs || []);

        setCustomCodes(prev => {
            const next = { ...prev };
            let baseCode = next[oldModuleName];
            if (!baseCode) {
                const pd = [];
                (nodeToUpdate.data.inputs || []).forEach(p => pd.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
                (nodeToUpdate.data.outputs || []).forEach(p => pd.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
                baseCode = `module ${oldModuleName} (\n${pd.join(',\n')}\n);\n\n// Write internal design logic here\n\nendmodule\n`;
            }
            const portDecls = [];
            newInputs.forEach(p => portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
            newOutputs.forEach(p => portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
            const newSignature = `module ${newModuleName} (\n${portDecls.join(',\n')}\n);`;
            const updatedCode = baseCode.replace(/module\s+\w+\s*\([\s\S]*?\);/, newSignature);
            if (field === 'moduleName' && oldModuleName !== newModuleName) next[newModuleName] = updatedCode;
            else next[oldModuleName] = updatedCode;
            return next;
        });
        if (field === 'inputs' || field === 'outputs') setNodes(nds => nds.map(n => n.data.moduleName === oldModuleName ? { ...n, data: { ...n.data, [field]: newValue } } : n));
        else setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: newModuleName } } : n));
    };

    /* ============================================================
       18. CODE EDITOR (RTL & TESTBENCH)
       ============================================================ */
    const currentModuleCode = useMemo(() => {
        if (!selectedNode) return '';
        const mName = selectedNode.data.moduleName;
        if (customCodes[mName] !== undefined) return customCodes[mName];
        let code = `module ${mName} (\n`;
        const portDecls = [];
        (selectedNode.data.inputs || []).forEach(p => { portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`); });
        (selectedNode.data.outputs || []).forEach(p => { portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`); });
        code += portDecls.join(',\n') + `\n);\n\n// Write internal design logic here\n\nendmodule\n`;
        return code;
    }, [selectedNode, customCodes]);

    const handleCodeChange = (e) => {
        if (!selectedNode) return;
        const mName = selectedNode.data.moduleName;
        setCustomCodes(prev => ({ ...prev, [mName]: e.target.value }));
    };

    const structuralVerilogFull = useMemo(() => {
        let code = `// ============================================================\n// Structural Flat Top Module\n// ============================================================\n\nmodule top_module (\n  input wire clk,\n  input wire rst_n`;
        const exposedKeys = Object.keys(exposedPorts);
        const validExposedKeys = exposedKeys.filter(key => {
            const p = exposedPorts[key];
            const node = nodes.find(n => n.id === p.nodeId);
            return !(p.isInput && node?.data.autoRoute?.[p.portName]);
        });
        if (validExposedKeys.length > 0) {
            code += `,\n`;
            const ioLines = validExposedKeys.map(key => {
                const port = exposedPorts[key];
                const node = nodes.find(n => n.id === port.nodeId);
                const prefix = node ? node.data.instanceName : 'unknown';
                const wDecl = port.width > 1 ? `[${port.msb !== undefined ? port.msb : port.width - 1}:${port.lsb !== undefined ? port.lsb : 0}] ` : '';
                const ioType = port.isInput ? 'input wire' : 'output wire';
                return `  ${ioType} ${wDecl}${prefix}_${port.portName}`;
            });
            code += ioLines.join(',\n') + `\n`;
        } else { code += `\n`; }
        code += `);\n\n`;
        const internalWireDecls = [];
        nodes.forEach((node) => {
            if (!node.data.outputs) return;
            (node.data.outputs || []).forEach((p) => {
                const hasEdges = edges.some(e => e.source === node.id && e.sourceHandle === p.name);
                const exposedKey = `${node.id}__${p.name}`;
                const isExposed = !!exposedPorts[exposedKey];
                if (hasEdges && !isExposed) {
                    const wDecl = p.width > 1 ? `[${p.msb}:${p.lsb}] ` : '';
                    internalWireDecls.push(`  wire ${wDecl}w_${node.id}_${p.name};`);
                }
            });
        });
        if (internalWireDecls.length > 0) {
            code += `  // Internal Routing Nets\n`;
            code += internalWireDecls.join('\n') + `\n\n`;
        }
        const splitterAssigns = [];
        nodes.forEach((node) => {
            if (node.data.isSplitter) {
                const inputEdge = edges.find(e => e.target === node.id);
                const sourceBusNet = inputEdge ? `w_${inputEdge.source}_${inputEdge.sourceHandle}` : "bus_in";
                (node.data.outputs || []).forEach((outP, idx) => {
                    const hasEdge = edges.some(e => e.source === node.id && e.sourceHandle === outP.name);
                    const bitRange = outP.width > 1 ? `[${outP.msb}:${outP.lsb}]` : `[${outP.lsb}]`;
                    if (hasEdge) {
                        splitterAssigns.push(`  assign w_${node.id}_${outP.name} = ${sourceBusNet}${bitRange}; // Structural Split Mapping`);
                    } else {
                        splitterAssigns.push(`  // wire w_${node.id}_${outP.name} = ${sourceBusNet}${bitRange}; // Floating Split Slice`);
                    }
                });
            }
            if (node.data.isBundler) {
                const outputPort = (node.data.outputs || [])[0];
                const hasOutEdge = edges.some(e => e.source === node.id && e.sourceHandle === outputPort?.name);
                if (hasOutEdge) {
                    const bundledNets = [...(node.data.inputs || [])].reverse().map(inP => {
                        const driverEdge = edges.find(e => e.target === node.id && e.targetHandle === inP.name);
                        return driverEdge ? `w_${driverEdge.source}_${driverEdge.sourceHandle}` : `${inP.width}'bz`;
                    });
                    splitterAssigns.push(`  assign w_${node.id}_${outputPort.name} = { ${bundledNets.join(', ')} }; // Structural Bundle Packing`);
                }
            }
        });
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
                (node.data.inputs || []).forEach(p => {
                    const e = edges.find(ed => ed.target === node.id && ed.targetHandle === p.name);
                    const exposedKey = `${node.id}__${p.name}`;
                    const tieoff = node.data.tieoffs?.[p.name];
                    const autoRoute = node.data.autoRoute?.[p.name];
                    if (e) {
                        const srcNode = nodes.find(n => n.id === e.source);
                        const srcExposedKey = `${e.source}__${e.sourceHandle}`;
                        if (exposedPorts[srcExposedKey] && srcNode) maps.push(`    .${p.name}(${srcNode.data.instanceName}_${e.sourceHandle})`);
                        else maps.push(`    .${p.name}(w_${e.source}_${e.sourceHandle})`);
                    } else if (autoRoute) maps.push(`    .${p.name}(${p.name})`);
                    else if (exposedPorts[exposedKey]) maps.push(`    .${p.name}(${node.data.instanceName}_${p.name})`);
                    else if (tieoff) maps.push(`    .${p.name}(${tieoff})`);
                    else maps.push(`    .${p.name}(${p.width}'bz)`);
                });
            }
            if (node.data.outputs) {
                (node.data.outputs || []).forEach(p => {
                    const hasEdges = edges.some(ed => ed.source === node.id && ed.sourceHandle === p.name);
                    const exposedKey = `${node.id}__${p.name}`;
                    if (exposedPorts[exposedKey]) maps.push(`    .${p.name}(${node.data.instanceName}_${p.name})`);
                    else if (hasEdges) maps.push(`    .${p.name}(w_${node.id}_${p.name})`);
                    else maps.push(`    .${p.name}()`);
                });
            }
            code += maps.join(',\n') + `\n  );\n\n`;
        });
        code += `endmodule\n\n`;
        const seen = new Set();
        nodes.forEach((node) => {
            const mName = node.data.moduleName;
            if (seen.has(mName)) return;
            seen.add(mName);
            if (customCodes[mName] !== undefined) code += `// --- Core Compute Definition: ${mName} ---\n` + customCodes[mName] + `\n\n`;
        });
        return code;
    }, [nodes, edges, customCodes, exposedPorts]);

    const testbenchCodeFull = useMemo(() => {
        let code = `// ============================================================\n// Structural Flat Top Module - Auto-Generated Testbench\n// ============================================================\n\n\`timescale 1ns / 1ps\n\nmodule top_module_tb();\n\n  reg clk;\n  reg rst_n;\n\n`;
        const validExposedKeys = Object.keys(exposedPorts).filter(key => {
            const p = exposedPorts[key];
            const node = nodes.find(n => n.id === p.nodeId);
            return !(p.isInput && node?.data.autoRoute?.[p.portName]);
        });
        const mappedInputs = [];
        const mappedOutputs = [];
        validExposedKeys.forEach(key => {
            const port = exposedPorts[key];
            const node = nodes.find(n => n.id === port.nodeId);
            const prefix = node ? node.data.instanceName : 'unknown';
            const wDecl = port.width > 1 ? `[${port.msb !== undefined ? port.msb : port.width - 1}:${port.lsb !== undefined ? port.lsb : 0}] ` : '';
            const netName = `${prefix}_${port.portName}`;
            if (port.isInput) {
                code += `  reg ${wDecl}${netName};\n`;
                mappedInputs.push({ name: netName, width: port.width });
            } else {
                code += `  wire ${wDecl}${netName};\n`;
                mappedOutputs.push(netName);
            }
        });
        code += `\n  top_module uut (\n    .clk(clk),\n    .rst_n(rst_n)`;
        validExposedKeys.forEach(key => {
            const port = exposedPorts[key];
            const node = nodes.find(n => n.id === port.nodeId);
            const prefix = node ? node.data.instanceName : 'unknown';
            const netName = `${prefix}_${port.portName}`;
            code += `,\n    .${netName}(${netName})`;
        });
        code += `\n  );\n\n  initial begin\n    clk = 0;\n    forever #5 clk = ~clk;\n  end\n\n  initial begin\n    rst_n = 0;\n`;
        mappedInputs.forEach(inputObj => {
            code += `    ${inputObj.name} = ${inputObj.width}'b0;\n`;
        });
        code += `\n    #100;\n    rst_n = 1;\n    #20;\n\n`;
        if (mappedInputs.length > 0) {
            code += `    // --- Test Pattern Cycle A ---\n`;
            mappedInputs.forEach((inputObj, idx) => {
                const val = inputObj.width > 1 ? `${inputObj.width}'hAA` : `1'b1`;
                code += `    ${inputObj.name} = ${val};\n`;
            });
            code += `    #40;\n\n    // --- Test Pattern Cycle B ---\n`;
            mappedInputs.forEach((inputObj, idx) => {
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
    }, [exposedPorts, nodes]);

    const handleCopyCode = () => {
        const codeToCopy = topViewMode === 'testbench' ? testbenchCodeFull : structuralVerilogFull;
        navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /* ============================================================
       19. FILE OPERATIONS (SAVE / LOAD)
       ============================================================ */
    const handleSaveWorkspace = () => {
        const defaultName = `rtl_schematic_backup_${Date.now().toString().slice(-5)}`;
        setProposedFileName(defaultName);
        setShowSaveModal(true);
    };

    const executeActualDownload = (fileNameString) => {
        const cleanFileName = fileNameString.trim() || `rtl_schematic_backup_${Date.now().toString().slice(-5)}`;
        const finalDownloadName = cleanFileName.endsWith('.json') ? cleanFileName : `${cleanFileName}.json`;
        const dataToSave = { version: '1.0.0', nodes, edges, customCodes, exposedPorts, theme };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', finalDownloadName);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setShowSaveModal(false);
    };

    const handleLoadWorkspace = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedWorkspace = JSON.parse(e.target?.result);
                if (parsedWorkspace.nodes && parsedWorkspace.edges) {
                    recordHistory();
                    setNodes(parsedWorkspace.nodes);
                    setEdges(parsedWorkspace.edges);
                    setCustomCodes(parsedWorkspace.customCodes || {});
                    setExposedPorts(parsedWorkspace.exposedPorts || {});
                    if (parsedWorkspace.theme) setTheme(parsedWorkspace.theme);
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    setGlowingNet(null);
                } else alert('Invalid architecture file layout structure.');
            } catch (err) { alert('Failed parsing structural graph workspace architecture config file payload.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleClearAll = () => {
        recordHistory();
        setNodes([]);
        setEdges([]);
        setExposedPorts({});
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setShowClearModal(false);
    };

    /* ============================================================
       20. MODULE CREATION (CUSTOM & PREBUILT)
       ============================================================ */
    const [newModuleName, setNewModuleName] = useState('alu');
    const [newInputs, setNewInputs] = useState('a[15:0], b[15:0], op[3:0]');
    const [newOutputs, setNewOutputs] = useState('res[15:0], zero');

    const createBlock = (ev) => {
        ev.preventDefault();
        const cleanName = newModuleName.trim();
        if (!cleanName) return;

        if (nodes.some(n => n.data.moduleName === cleanName)) {
            showError(`A module named '${cleanName}' already exists. Module names must be unique.`);
            return;
        }

        const parsedInputs = parsePorts(newInputs);
        const parsedOutputs = parsePorts(newOutputs);

        // --- NEW: Validate duplicate port names ---
        const error = validatePorts(parsedInputs, parsedOutputs);
        if (error) {
            showError(error);
            return;
        }
        recordHistory();

        const initialAutoRoute = {};
        parsedInputs.forEach(p => { if (p.name === 'clk' || p.name === 'rst_n') initialAutoRoute[p.name] = true; });
        const projectedPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        const spawnPos = getSmartSpawnPosition(nodes, projectedPosition.x - 90, projectedPosition.y - 60);
        const instanceId = `u_${cleanName}_${Date.now().toString().slice(-4)}`;


        setNodes(nds => nds.concat({
            id: instanceId,
            type: 'hardware',
            position: spawnPos,
            data: {
                moduleName: cleanName,
                instanceName: instanceId,
                theme,
                inputs: parsedInputs,
                outputs: parsePorts(newOutputs),
                autoRoute: initialAutoRoute,
                portsSwapped: false,
                tieoffs: {},
                exposedPorts: {},
            },
        }));
    };

    const spawnPrebuilt = (key) => {
        recordHistory();
        const conf = STANDARD_LIBRARY[key];
        let counter = 0;
        let newModuleName = `${key}_${counter}`;
        while (nodes.some(n => n.data.moduleName === newModuleName)) { counter++; newModuleName = `${key}_${counter}`; }
        const instanceId = `u_${newModuleName}_${Date.now().toString().slice(-4)}`;
        const nodeType = conf.type || 'hardware';
        const parsedInputs = parsePorts(conf.inputs);
        const parsedOutputs = parsePorts(conf.outputs);
        const initialAutoRoute = {};
        parsedInputs.forEach(p => { if (p.name === 'clk' || p.name === 'rst_n') initialAutoRoute[p.name] = true; });
        const projectedPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        const spawnPos = getSmartSpawnPosition(nodes, projectedPosition.x - 30, projectedPosition.y - 30);
        setNodes(nds => nds.concat({
            id: instanceId,
            type: nodeType,
            position: spawnPos,
            data: {
                moduleName: newModuleName,
                instanceName: instanceId,
                theme,
                inputs: parsedInputs,
                outputs: parsedOutputs,
                autoRoute: initialAutoRoute,
                gateShape: conf.gateShape,
                isSplitter: conf.isSplitter,
                isBundler: conf.isBundler,
                portsSwapped: false,
                tieoffs: {},
                exposedPorts: {},
            },
        }));
        if (nodeType === 'splitter') {
            setCustomCodes(prev => ({
                ...prev,
                [newModuleName]: `// Structural Cell [${newModuleName}] handled via Top inline vector slice assignments.`
            }));
            return;
        }
        setCustomCodes(prev => {
            if (prev[newModuleName] !== undefined) return prev;
            let code = `module ${newModuleName} (\n`;
            const portDecls = [];
            parsedInputs.forEach(p => portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
            parsedOutputs.forEach(p => portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
            code += portDecls.join(',\n') + `\n);\n\n${conf.code}\n\nendmodule\n`;
            return { ...prev, [newModuleName]: code };
        });
    };

    /* ============================================================
       21. LAYOUT & SEARCH / TRACE HELPERS
       ============================================================ */
    const arrangeTopologicalLayout = () => {
        if (nodes.length === 0) return;
        recordHistory();
        const adj = {};
        const inDegree = {};
        const nodeColumn = {};
        nodes.forEach(n => {
            adj[n.id] = [];
            inDegree[n.id] = 0;
            nodeColumn[n.id] = 0;
        });
        edges.forEach(e => {
            if (adj[e.source] && adj[e.target] !== undefined) {
                adj[e.source].push(e.target);
                inDegree[e.target]++;
            }
        });
        const queue = [];
        nodes.forEach(n => {
            if (inDegree[n.id] === 0) {
                queue.push(n.id);
            }
        });
        while (queue.length > 0) {
            const u = queue.shift();
            const currentLayer = nodeColumn[u];
            adj[u].forEach(v => {
                nodeColumn[v] = Math.max(nodeColumn[v], currentLayer + 1);
                inDegree[v]--;
                if (inDegree[v] === 0) {
                    queue.push(v);
                }
            });
        }
        const columnGroups = {};
        Object.entries(nodeColumn).forEach(([id, col]) => {
            if (!columnGroups[col]) columnGroups[col] = [];
            columnGroups[col].push(id);
        });
        const startX = 60;
        const startY = 100;
        const columnSpacing = 280;
        const rowSpacing = 160;
        setNodes(currentNodes => {
            return currentNodes.map(node => {
                const col = nodeColumn[node.id] ?? 0;
                const colNodes = columnGroups[col] || [node.id];
                const rowIndex = colNodes.indexOf(node.id);
                return {
                    ...node,
                    position: {
                        x: startX + col * columnSpacing,
                        y: startY + rowIndex * rowSpacing
                    }
                };
            });
        });
        setTimeout(() => {
            fitView({ duration: 500, padding: 0.2 });
        }, 50);
    };

    const moduleSearchResults = useMemo(() => {
        if (!moduleSearchQuery.trim()) return [];
        const q = moduleSearchQuery.toLowerCase();
        return nodes.filter(n => n.data.moduleName?.toLowerCase().includes(q) || n.data.instanceName?.toLowerCase().includes(q));
    }, [moduleSearchQuery, nodes]);

    const jumpToNode = useCallback((node) => {
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setCenter(node.position.x + 90, node.position.y + 60, { zoom: 1.2, duration: 500 });
        setSearchHighlightIds(new Set([node.id]));
        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, isDrcFlashing: true } } : n));
        setTimeout(() => {
            setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, isDrcFlashing: false } } : n));
        }, 1600);
    }, [setCenter, setNodes]);

    const handleModuleSearchKey = (e) => {
        if (moduleSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setModuleSearchFocusIdx(i => Math.min(i + 1, moduleSearchResults.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setModuleSearchFocusIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter') { jumpToNode(moduleSearchResults[moduleSearchFocusIdx]); }
        if (e.key === 'Escape') { setModuleSearchQuery(''); setSearchHighlightIds(new Set()); }
    };

    const buildHierarchyResult = (query) => {
        const q = query.toLowerCase().trim();
        if (!q) { setHierarchyResults(null); return; }
        const matchedNodes = nodes.filter(n => n.data.moduleName?.toLowerCase().includes(q) || n.data.instanceName?.toLowerCase().includes(q));
        if (matchedNodes.length === 0) { setHierarchyResults([]); return; }
        const results = matchedNodes.map(node => {
            const drivers = edges.filter(e => e.target === node.id).map(e => {
                const srcNode = nodes.find(n => n.id === e.source);
                const w = (srcNode?.data.outputs || []).find(p => p.name === e.sourceHandle)?.width || e.data?.bitWidth || 1;
                return { edgeId: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, srcModuleName: srcNode?.data.moduleName || '?', srcInstanceName: srcNode?.data.instanceName || '?', bitWidth: w };
            });
            const fanout = edges.filter(e => e.source === node.id).map(e => {
                const tgtNode = nodes.find(n => n.id === e.target);
                const w = (tgtNode?.data.inputs || []).find(p => p.name === e.targetHandle)?.width || e.data?.bitWidth || 1;
                return { edgeId: e.id, targetNodeId: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, tgtModuleName: tgtNode?.data.moduleName || '?', tgtInstanceName: tgtNode?.data.instanceName || '?', bitWidth: w };
            });
            const fanoutByPort = {};
            fanout.forEach(f => { if (!fanoutByPort[f.sourceHandle]) fanoutByPort[f.sourceHandle] = []; fanoutByPort[f.sourceHandle].push(f); });
            const unconnectedInputs = (node.data.inputs || []).filter(p => !edges.some(e => e.target === node.id && e.targetHandle === p.name) && !node.data.autoRoute?.[p.name] && !node.data.tieoffs?.[p.name]);
            return { node, drivers, fanoutByPort, unconnectedInputs };
        });
        setHierarchyResults(results);
        setHierarchyExpanded({});
    };

    const highlightNetPath = (edgeId, nodeId) => {
        setSearchHighlightIds(new Set([nodeId]));
        setSelectedEdgeId(edgeId);
        setSelectedNodeId(null);
        setGlowingNet(null);
        setTraceGlowingEdgeId(edgeId);
        setEdges(eds => eds.map(e =>
            e.id === edgeId
                ? { ...e, selected: true, data: { ...e.data, isFlashing: true } }
                : { ...e, selected: false, data: { ...e.data, isFlashing: false } }
        ));
        setTimeout(() => {
            setEdges(eds => eds.map(e =>
                e.id === edgeId ? { ...e, data: { ...e.data, isFlashing: false } } : e
            ));
        }, 1600);
        const n = nodes.find(nd => nd.id === nodeId);
        if (n) setCenter(n.position.x + 90, n.position.y + 60, { zoom: 1.1, duration: 400 });
    };

    /* ============================================================
       22. TOP SYMBOL RENDERER
       ============================================================ */
    const renderTopSymbol = () => {
        const inputs = Object.values(exposedPorts).filter(p => p.isInput).map(p => {
            const node = nodes.find(n => n.id === p.nodeId);
            return { name: `${node ? node.data.instanceName : 'u'}_${p.portName}`, width: p.width, msb: p.msb, lsb: p.lsb };
        });
        const outputs = Object.values(exposedPorts).filter(p => !p.isInput).map(p => {
            const node = nodes.find(n => n.id === p.nodeId);
            return { name: `${node ? node.data.instanceName : 'u'}_${p.portName}`, width: p.width, msb: p.msb, lsb: p.lsb };
        });
        const usesClk = nodes.some(n => (n.data.autoRoute || {})['clk']);
        const usesRst = nodes.some(n => (n.data.autoRoute || {})['rst_n']);
        if (usesClk) inputs.unshift({ name: 'clk', width: 1 });
        if (usesRst) inputs.unshift({ name: 'rst_n', width: 1 });
        const isDark = theme === 'dark';
        const panelBg = isDark ? '#000000' : '#f9fafb';
        const cardBg = isDark ? '#050505' : '#ffffff';
        const cardBorder = isDark ? '#333333' : '#cbd5e1';
        const textPrimary = isDark ? '#ffffff' : '#111827';
        const textSecondary = isDark ? '#888888' : '#6b7280';
        const textPort = isDark ? '#e2e8f0' : '#374151';
        const buttonStyle = { background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: 'pointer', borderRadius: '4px', padding: '4px 10px', fontSize: '14px', fontFamily: 'monospace', lineHeight: 1 };
        return (
            <div style={{ height: '100%', width: '100%', background: panelBg, position: 'relative' }}>
                <TransformWrapper initialScale={1} minScale={0.2} maxScale={4} wheel={{ step: 0.009, smoothStep: 0.001, disabled: false }} centerOnInit={true} limitToBounds={false}>
                    {({ zoomIn, zoomOut, resetTransform, state }) => (
                        <>
                            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, display: 'flex', gap: '6px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '6px', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                                <button onClick={() => zoomIn()} style={buttonStyle}>+</button>
                                <button onClick={() => zoomOut()} style={buttonStyle}>-</button>
                                <button onClick={() => resetTransform()} style={buttonStyle}>⟲</button>
                                <div style={{ color: textSecondary, fontSize: '11px', alignSelf: 'center', fontFamily: 'monospace', minWidth: '45px', textAlign: 'center' }}>{Math.round(state.scale * 100)}%</div>
                            </div>
                            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '8px', minWidth: '220px', padding: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', fontFamily: 'monospace', userSelect: 'none' }}>
                                    <div style={{ borderBottom: `1px solid ${cardBorder}`, paddingBottom: '8px', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: textPrimary }}>top_module</div>
                                        <div style={{ fontSize: '11px', color: textSecondary }}>system_top</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                                            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginBottom: '2px' }}>INPUTS</div>
                                            {inputs.map((p, idx) => (
                                                <div key={`top_in_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '11px', color: textPort, whiteSpace: 'nowrap' }}>{p.width > 1 ? `${p.name}[${p.msb ?? p.width - 1}:${p.lsb ?? 0}]` : p.name}</span>
                                                </div>
                                            ))}
                                            {inputs.length === 0 && <span style={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>None</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '2px' }}>OUTPUTS</div>
                                            {outputs.map((p, idx) => (
                                                <div key={`top_out_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: 'row-reverse' }}>
                                                    <div style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '11px', color: textPort, whiteSpace: 'nowrap' }}>{p.width > 1 ? `${p.name}[${p.msb ?? p.width - 1}:${p.lsb ?? 0}]` : p.name}</span>
                                                </div>
                                            ))}
                                            {outputs.length === 0 && <span style={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>None</span>}
                                        </div>
                                    </div>
                                </div>
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>
        );
    };

    /* ============================================================
       23. MODAL DRAG HANDLING
       ============================================================ */
    const handleModalDragStart = (e) => {
        if (e.target.closest('input, textarea, button, select')) return;
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: modalPos.x,
            initialY: modalPos.y
        };
        document.addEventListener('mousemove', handleModalDragMove);
        document.addEventListener('mouseup', handleModalDragEnd);
    };

    const handleModalDragMove = (e) => {
        if (!dragStartRef.current) return;
        const { startX, startY, initialX, initialY } = dragStartRef.current;
        setModalPos({
            x: initialX + (e.clientX - startX),
            y: initialY + (e.clientY - startY)
        });
    };

    const handleModalDragEnd = () => {
        dragStartRef.current = null;
        document.removeEventListener('mousemove', handleModalDragMove);
        document.removeEventListener('mouseup', handleModalDragEnd);
    };

    /* ============================================================
       24. STYLES
       ============================================================ */
    const s = getStyles(t, leftCollapsed, rightCollapsed, leftWidth, rightWidth, draggingLeft || draggingRight);
    const toolbarBtn = {
        ...s.iconBtn,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        borderRadius: '8px',
        fontWeight: 500,
        fontSize: '13px',
        transition: 'all .2s ease',
        cursor: 'pointer',
        border: '1px solid transparent',
        background: 'transparent',
        color: t.textHeading,
    };

    /* ============================================================
       25. KEYBOARD SHORTCUT STYLE
       ============================================================ */
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
        boxShadow: `0 2px 0 ${t.borderStrong}`
    };

    /* ============================================================
       26. RENDER
       ============================================================ */
    return (
        <>
            <style>{`

            @keyframes sidebarFloat {
                0%, 100% {
                    transform: translateY(-50%) translateY(0) scale(1);
                }
                50% {
                    transform: translateY(-50%) translateY(-4px) scale(1.04);
                }
            }

            @keyframes sidebarGlow {
                0%, 100% {
                    box-shadow: 
                        0 0 8px rgba(96, 165, 250, 0.15),
                        0 0 20px rgba(96, 165, 250, 0.05);
                }
                50% {
                    box-shadow: 
                        0 0 16px rgba(96, 165, 250, 0.5),
                        0 0 40px rgba(96, 165, 250, 0.2),
                        0 0 80px rgba(96, 165, 250, 0.08);
                }
            }

            @keyframes sidebarArrow {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(3px); }
            }

            .sidebar-expand-btn {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: none;
                background: transparent;
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                animation: 
                    sidebarFloat 2.8s ease-in-out infinite,
                    sidebarGlow 2.8s ease-in-out infinite;
            }

            .sidebar-expand-btn:hover {
                transform: translateY(-50%) scale(1.15) !important;
                color: var(--primary);
                background: var(--bg-hover);
                box-shadow: 
                    0 0 24px var(--glow-color),
                    0 0 60px var(--glow-color-soft) !important;
                animation-play-state: paused;
            }

            .sidebar-expand-btn:hover svg {
                animation: sidebarArrow 0.6s ease-in-out infinite;
                filter: drop-shadow(0 0 6px var(--glow-color));
            }

            /* Light theme overrides */
            .sidebar-expand-btn.light {
                --glow-color: rgba(37, 99, 235, 0.5);
                --glow-color-soft: rgba(37, 99, 235, 0.15);
                --bg-hover: rgba(37, 99, 235, 0.08);
                --text-secondary: #64748b;
                --primary: #2563eb;
            }

            .sidebar-expand-btn.dark {
                --glow-color: rgba(96, 165, 250, 0.6);
                --glow-color-soft: rgba(96, 165, 250, 0.2);
                --bg-hover: rgba(96, 165, 250, 0.12);
                --text-secondary: #94a3b8;
                --primary: #60a5fa;
            }
            
            @keyframes helpGlow {
                0%,100% {
                    background: rgba(59,130,246,0.08);
                    border-color: rgba(59,130,246,0.22);
                    transform: scale(1);
                }

                50% {
                    background: rgba(59,130,246,0.16);
                    border-color: rgba(59,130,246,0.38);
                    transform: scale(1.03);
                }
            }
        `}</style>

            <div style={s.app}>
                {/* HEADER */}
                <div style={s.header}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <AppLogo size={70} />
                        <div
                            style={{
                                ...s.headerTitle,
                                marginLeft: "4px",
                                fontSize: "32px",
                                fontFamily: "monospace",
                                fontWeight: 300,
                                letterSpacing: "0.02em",
                                WebkitFontSmoothing: "antialiased",
                                MozOsxFontSmoothing: "grayscale",
                            }}
                        >
                            Axon{" "}
                            <span
                                style={{
                                    background: "linear-gradient(90deg, #6D28D9, #2563EB)",
                                    backgroundClip: "text",
                                    WebkitBackgroundClip: "text",
                                    fontWeight: 550,
                                    color: "transparent",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                Interlink
                            </span>

                        </div>

                    </div>
                    <div style={s.headerActions}>
                        <span style={s.badge}>{nodes.length} blocks</span>
                        <span style={s.badge}>{edges.length} wires</span>
                        {warnings.length > 0 && (
                            <span style={{
                                ...s.badge,
                                background: t.warnBg,
                                color: t.warn,
                                border: `1px solid ${t.warnBorder}`,
                            }}>
                                ⚠ {warnings.length} Alerts
                            </span>
                        )}

                        {/* Undo */}
                        <button
                            onClick={undo}
                            disabled={past.length === 0}
                            style={{
                                ...toolbarBtn,
                                opacity: past.length === 0 ? 0.4 : 1,
                                cursor: past.length === 0 ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (past.length > 0) {
                                    e.currentTarget.style.background = t.bgTertiary;
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${t.shadow}`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            title="Undo (Ctrl+Z)"
                        >
                            <IconArrowBackUp size={15} />
                            Undo
                        </button>

                        {/* Redo */}
                        <button
                            onClick={redo}
                            disabled={future.length === 0}
                            style={{
                                ...toolbarBtn,
                                opacity: future.length === 0 ? 0.4 : 1,
                                cursor: future.length === 0 ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (future.length > 0) {
                                    e.currentTarget.style.background = t.bgTertiary;
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${t.shadow}`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            title="Redo (Ctrl+Y)"
                        >
                            <IconArrowForwardUp size={15} />
                            Redo
                        </button>

                        {/* Save Work */}
                        <button
                            onClick={handleSaveWorkspace}
                            style={{
                                ...toolbarBtn,
                                borderColor: t.primary,
                                color: t.primary,
                                fontWeight: 600,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.primary;
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = `0 4px 14px ${t.primary}40`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = t.primary;
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <IconSave size={15} />
                            Save Work
                        </button>

                        {/* Load File */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                ...toolbarBtn,
                                borderColor: t.borderStrong,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.bgTertiary;
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            }}
                        >
                            <IconFolder size={15} />
                            Load File
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleLoadWorkspace} accept=".json" style={{ display: 'none' }} />

                        {/* Help (with glow) */}
                        <button
                            onClick={() => setShowHelp(true)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.animationPlayState = 'paused';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
                                e.currentTarget.style.boxShadow = `0 0 20px ${helpColors.glow}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.animationPlayState = 'running';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            style={{
                                ...toolbarBtn,
                                padding: '7px 14px',
                                borderRadius: '10px',
                                border: `1px solid ${helpColors.border}`,
                                background: helpColors.bg,
                                color: helpColors.text,
                                fontWeight: 600,
                                animation: 'helpGlow 1.5s ease-in-out infinite',
                                transition: 'transform .2s ease, box-shadow .2s ease',
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M9.1 9a3 3 0 1 1 5.3 2c-.7.7-1.4 1.2-1.4 2.5" />
                                <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
                            </svg>
                            Help
                        </button>

                        {/* Clear All */}
                        <button
                            onClick={() => setShowClearModal(true)}
                            style={{
                                ...toolbarBtn,
                                color: t.danger,
                                borderColor: t.danger,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.danger;
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = `0 4px 14px ${t.danger}50`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = t.danger;
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <IconTrash size={15} />
                            Clear All
                        </button>

                        {/* Auto Layout */}
                        <button
                            onClick={arrangeTopologicalLayout}
                            style={{
                                ...toolbarBtn,
                                color: theme === 'dark' ? '#60a5fa' : '#2563eb',
                                borderColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
                                fontWeight: 600,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = theme === 'dark' ? '#3b82f6' : '#2563eb';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = `0 4px 14px ${theme === 'dark' ? '#3b82f6' : '#2563eb'}50`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = theme === 'dark' ? '#60a5fa' : '#2563eb';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            title="Auto Layout"
                        >
                            <IconHierarchy2 size={15} />
                            Auto Layout
                        </button>

                        {/* Theme toggle */}
                        <button
                            onClick={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))}
                            style={{
                                ...toolbarBtn,
                                padding: '7px 12px',
                                borderColor: t.borderStrong,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.bgTertiary;
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            }}
                        >
                            {theme === 'light' ? <FaMoon size={14} /> : <FaSun size={14} />}
                            {theme === 'light' ? ' Dark' : ' Light'}
                        </button>
                    </div>
                </div>

                {/* HELP MODAL */}
                {showHelp && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
                        <div style={{ background: t.bgSecondary, border: `2px solid ${theme === 'dark' ? '#09ff00' : '#ff0000'}`, borderRadius: '12px', padding: '24px', maxWidth: '1000px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', color: t.textHeading, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                                <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><IconHelp size={20} /> App Keyboard Shortcuts & Help</h2>
                                <button onClick={() => setShowHelp(false)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', padding: '4px', display: 'flex' }}><IconX size={20} /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', boxSizing: 'border-box', scrollbarColor: theme === 'dark' ? '#555555 #111111' : '#bcbcbc #f1f5f9', scrollbarWidth: 'thin' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', fontSize: '13px', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '20px' }}>
                                    <kbd style={kbdStyle}>F</kbd> <span>Fit view to canvas completely</span>
                                    <kbd style={kbdStyle}>Ctrl + F</kbd> <span>Focus Module Search bar</span>
                                    <kbd style={kbdStyle}>H</kbd> <span>Open Hierarchy & Net Trace</span>
                                    <kbd style={kbdStyle}>Esc</kbd> <span>Clear node/wire selection</span>
                                    <kbd style={kbdStyle}>Space</kbd> <span>Center selected block</span>
                                    <kbd style={kbdStyle}>Ctrl + A</kbd> <span>Select all modules & nets</span>
                                    <kbd style={kbdStyle}>Del</kbd> <span>Delete selected item</span>
                                    <kbd style={kbdStyle}>Ctrl + Z / Y</kbd> <span>Undo / Redo</span>
                                    <kbd style={kbdStyle}>Ctrl + S</kbd> <span>Save the design</span>
                                </div>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Port Status Warnings & Notifications</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '14px', alignItems: 'center', fontSize: '13px', color: t.textSecondary, borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '20px' }}>
                                    <IconAlert color="#ef4444" size={16} /> <span><strong>Floating Input:</strong> Input is unconnected and un-tied.</span>
                                    <IconCircleSlash color="#9ca3af" size={16} /> <span><strong>Unused Output:</strong> Output is not driving any internal net or exposed.</span>
                                    <IconZap color="#ef4444" size={16} /> <span><strong>Multiple Drivers:</strong> Input is driven by more than 1 connected wire.</span>
                                    <IconActivity color="#f59e0b" size={16} /> <span><strong>Width Mismatch:</strong> Bus width conflict between source/target routing.</span>
                                </div>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Architectural Schematic Rules</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: t.textSecondary, lineHeight: '1.5', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '20px' }}>
                                    <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', borderLeft: `3px solid ${t.primary}` }}>
                                        <strong style={{ color: t.textHeading, display: 'block', marginBottom: '2px' }}>1. Valid Routing Connections:</strong> Standard structural wiring must strictly flow from an <strong>Output Port (Driver)</strong> to an <strong>Input Port (Load)</strong>. Point-to-point bridging between two input ports or two output ports is strictly blocked by the layout canvas engine.
                                    </div>
                                    <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', borderLeft: `3px solid #f59e0b` }}>
                                        <strong style={{ color: t.textHeading, display: 'block', marginBottom: '2px' }}>2. Mutual Exclusion (Wiring vs. Promotion):</strong> To prevent hardware short-circuits and maintain stable boundary contracts, <strong>only floating ports</strong> can be promoted to the top-level module.
                                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                            <li>Connecting a wire to a promoted floating port will <em>automatically demote</em> it back to an internal net.</li>
                                            <li>Wired ports will have their top-level promotion checkboxes disabled in the properties sidebar panel.</li>
                                        </ul>
                                    </div>
                                    <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', borderLeft: `3px solid #10b981` }}>
                                        <strong style={{ color: t.textHeading, display: 'block', marginBottom: '2px' }}>3. Constant Tie-offs & Floating Inputs:</strong> Any input port left floating (unwired and unpromoted) will generate a synthesis warning flag (<code>Floating input</code>) and map to a high-impedance state (<code>'bz</code>) in the final flat structural Verilog output file. Use the properties panel to assign explicit static logic tie-offs (e.g., <code>1'b0</code>, <code>1'b1</code>).
                                    </div>
                                </div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Smart Net Tracing</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: t.textSecondary, lineHeight: 1.5, paddingBottom: '4px' }}>
                                    Click on any routing wire on the canvas. All wires connected to the same source output driver will <strong>glow</strong> automatically to easily trace multi-fanout data paths!
                                </p>
                                <h3 style={{ margin: '20px 0 12px 0', fontSize: '15px', borderTop: `1px solid ${t.border}`, paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <IconZap color="#f59e0b" size={16} /> Pro-Tips & Hardware Design Patterns
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: t.textSecondary, lineHeight: '1.5' }}>
                                    <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', border: `1px dashed ${t.borderStrong}` }}>
                                        <span style={{ color: t.primary, fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚘. Pattern A: Monitoring or Promoting an Internal Net</span>
                                        Since the engine strictly forbids promoting an already wired port to prevent driver conflicts, you can easily tap into any internal connection using an inline **Buffer (`buff`)** stage:
                                        <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                                            <li>Disconnect the wire driving your target load input.</li>
                                            <li>Route that driver net into the input (<code>a</code>) of a new <code>buff</code> block.</li>
                                            <li>Connect the buffer output (<code>y</code>) back to your original target load input.</li>
                                            <li>Because the buffer's output port is now driving a net, you can drop a second parallel branch from it, leave it floating, and safely **Promote** that floating branch to the top-level module as an external monitor pin!</li>
                                        </ol>
                                    </div>
                                    <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', border: `1px dashed ${t.borderStrong}` }}>
                                        <span style={{ color: '#10b981', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚘. Pattern B: Isolating Synchronous Clock Domains</span>
                                        When designing complex sequential circuits, avoid manual network daisy-chaining for your clock tracks. Use the **Global Domain Auto-Routing** checkboxes in the layout properties sidebar panel to automatically hook standard ports named <code>clk</code> or <code>rst_n</code> directly to the system root boundary, keeping your schematic clear of cross-canvas routing lines.
                                    </div>
                                    <div style={{ background: t.bg, padding: '10px 14px', borderRadius: '6px', border: `1px dashed ${t.borderStrong}` }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚘. Pattern C: Resolving Bus Width Mismatches</span>
                                        If your canvas triggers a yellow <code>Width Mismatch</code> alert on an active net path, it means your source and target vector arrays don't match in size. Select the mismatched edge wire directly on the canvas to open its properties, where you can manually force an explicit override bit-width constraint (up to 128 bits) to resolve compile-time array truncation.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTEXTUAL MODAL (NODE / EDGE CONFIG) */}
                {activeModal.type && (() => {
                    const isNode = activeModal.type === 'node';
                    const targetId = activeModal.id;
                    if (isNode) {
                        const node = nodes.find(n => n.id === targetId);
                        if (!node) return null;
                        const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);
                        const currentPorts = node.data.isSplitter ? (node.data.outputs || []) : (node.data.inputs || []);
                        return (
                            <div
                                onMouseDown={handleModalDragStart}
                                style={{
                                    position: 'fixed',
                                    top: `${modalPos.y}px`,
                                    left: `${modalPos.x}px`,
                                    width: '480px',
                                    zIndex: 99999,
                                    background: t.bgSecondary,
                                    color: t.textHeading,
                                    cursor: 'grab',
                                    border: `2px solid ${theme === 'dark' ? "rgba(0, 27, 233, 0.87)" : t.borderStrong}`,
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: theme === 'dark' ? `0 20px 40px rgba(0,0,0,0.6)` : '0 20px 40px rgba(0,0,0,0.15)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: '520px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', userSelect: 'none' }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: theme === 'dark' ? '#fff' : '#111827' }}>
                                        <IconBox size={15} /> Configure: {node.data.moduleName}
                                    </h3>
                                    <button onClick={() => setActiveModal({ type: null, id: null })} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer' }}><IconX size={16} /></button>
                                </div>
                                {!isSplitterOrBundler && (
                                    <div style={{ display: 'flex', gap: '4px', background: t.bgTertiary, padding: '4px', borderRadius: '8px', marginBottom: '14px', userSelect: 'none' }}>
                                        <button onClick={() => setModalTab('properties')} style={{
                                            flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer',
                                            background: modalTab === 'properties' ? t.bgSecondary : 'transparent',
                                            color: modalTab === 'properties' ? t.textHeading : t.textSecondary,
                                            transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                                <circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="20" cy="14" r="2" />
                                            </svg>
                                            Properties
                                        </button>
                                        <button onClick={() => setModalTab('code')} style={{
                                            flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer',
                                            background: modalTab === 'code' ? t.bgSecondary : 'transparent',
                                            color: modalTab === 'code' ? t.textHeading : t.textSecondary,
                                            transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line>
                                            </svg>
                                            RTL Code Editor
                                        </button>
                                    </div>
                                )}
                                <div style={{
                                    height: '320px',
                                    overflowY: 'auto',
                                    paddingRight: '4px',
                                    scrollbarWidth: 'thin',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    scrollbarColor: theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6'
                                }}>
                                    {isSplitterOrBundler ? (
                                        <>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: t.primary, fontFamily: 'monospace', background: t.bg, padding: '5px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, alignSelf: 'flex-start' }}>
                                                Type: {node.data.isSplitter ? 'Bus Fracture Splitter' : 'Vector Merger Bundler'}
                                            </div>
                                            <div style={s.formGroup}>
                                                <label style={s.label}>Number of Bit Slices (N)</label>
                                                <input type="number" min="1" max="16" value={currentPorts.length} style={{ ...s.input, width: '70px' }} onChange={(e) => {
                                                    const count = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                                                    recordHistory();
                                                    const newPorts = Array.from({ length: count }, (_, i) => ({
                                                        name: node.data.isSplitter ? `out${i}` : `in${i}`,
                                                        width: 2, msb: 1, lsb: 0
                                                    }));
                                                    setNodes(nds => nds.map(n => n.id === targetId ? {
                                                        ...n, data: { ...n.data, inputs: node.data.isSplitter ? [{ name: 'in', width: 8, msb: 7, lsb: 0 }] : newPorts, outputs: node.data.isSplitter ? newPorts : [{ name: 'out', width: 8, msb: 7, lsb: 0 }] }
                                                    } : n));
                                                }} />
                                            </div>
                                            <div style={s.formGroup}>
                                                {/* <label style={s.label}>Slice Bit Allocations Map</label> */}
                                                <div style={{ fontSize: '15px', color: '#ffffff', marginBottom: '6px', fontFamily: 'monospace' }}>
                                                    {node.data.isSplitter
                                                        ? 'Atmost 16 Outputs...'
                                                        : 'Atmost 16 Inputs...'}
                                                </div>
                                                <div style={{ fontSize: '15px', color: '#06ffb4', marginBottom: '6px', fontFamily: 'monospace' }}>
                                                    {node.data.isSplitter
                                                        ? 'Note:- outN...out0 -> [MSB...LSB]'
                                                        : 'Note:- inN...in0 -> [MSB...LSB]'}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {currentPorts.map((port, idx) => {
                                                        const portLabel = getPortLabel(port);
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{
                                                                    fontSize: '12px',
                                                                    fontFamily: 'monospace',
                                                                    color: t.textSecondary,
                                                                    minWidth: '70px',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {node.data.isSplitter ? `out${idx}` : `in${idx}`} {portLabel}
                                                                </span>
                                                                <input
                                                                    style={{ ...s.input, flex: 1, padding: '4px 8px', fontSize: '12px' }}
                                                                    defaultValue={portLabel}
                                                                    placeholder="e.g. in[3:0]"
                                                                    onBlur={(e) => {
                                                                        const parsed = parsePorts(e.target.value);
                                                                        if (parsed && parsed.length > 0) {
                                                                            recordHistory();
                                                                            setNodes(nds => nds.map(n => {
                                                                                if (n.id !== targetId) return n;
                                                                                const updated = [...currentPorts];
                                                                                updated[idx] = {
                                                                                    name: parsed[0].name,
                                                                                    width: parsed[0].width,
                                                                                    msb: parsed[0].msb,
                                                                                    lsb: parsed[0].lsb
                                                                                };
                                                                                return {
                                                                                    ...n,
                                                                                    data: {
                                                                                        ...n.data,
                                                                                        inputs: n.data.isSplitter ? n.data.inputs : updated,
                                                                                        outputs: n.data.isSplitter ? updated : n.data.outputs
                                                                                    }
                                                                                };
                                                                            }));
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div style={{ ...s.formGroup, marginTop: '4px' }}>
                                                <label style={s.label}>Top-Level I/O Exposure</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: t.bg, padding: '8px', borderRadius: '6px', border: `1px solid ${t.borderStrong}` }}>
                                                    {currentPorts.map((p) => {
                                                        const key = `${node.id}__${p.name}`;
                                                        const isInput = !node.data.isSplitter;
                                                        const isPortWired = isInput ? edges.some(e => e.target === node.id && e.targetHandle === p.name) : edges.some(e => e.source === node.id && e.sourceHandle === p.name);
                                                        return (
                                                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: isPortWired ? 'not-allowed' : 'pointer', opacity: isPortWired ? 0.5 : 1 }}>
                                                                <input type="checkbox" checked={!!exposedPorts[key]} onChange={() => toggleExposePort(node.id, p.name, p, isInput)} disabled={isPortWired} />
                                                                Promote <code>{p.name}</code> to top {isPortWired && '(Wired)'}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    ) : modalTab === 'properties' ? (
                                        <>
                                            <div style={s.formGroup}><label style={s.label}>Module Type Name</label><input style={s.input} value={node.data.moduleName} onChange={(e) => updateSelectedNode('moduleName', e.target.value)} /></div>
                                            <div style={s.formGroup}><label style={s.label}>Ports Input Vector String</label><input style={s.input} defaultValue={(node.data.inputs || []).map(p => getPortLabel(p)).join(', ')} onBlur={(e) => updateSelectedNode('inputs', e.target.value)} /></div>
                                            <div style={s.formGroup}><label style={s.label}>Ports Output Vector String</label><input style={s.input} defaultValue={(node.data.outputs || []).map(p => getPortLabel(p)).join(', ')} onBlur={(e) => updateSelectedNode('outputs', e.target.value)} /></div>
                                            <div style={s.formGroup}>
                                                <label style={s.label}>Layout Symmetry Placement</label>
                                                <button type="button" onClick={(e) => { togglePortSwap(); e.currentTarget.style.transform = 'scale(0.94)'; setTimeout(() => { if (e.currentTarget) e.currentTarget.style.transform = 'scale(1)'; }, 80); }} style={{ ...s.smallBtn, background: t.bgTertiary, width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600, transition: 'transform 0.1s ease, background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = t.borderStrong} onMouseLeave={(e) => e.currentTarget.style.background = t.bgTertiary}>⮂ Flip Ports</button>
                                            </div>
                                            <div style={s.formGroup}>
                                                <label style={s.label}>Top-Level I/O Exposure</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: t.bg, padding: '8px', borderRadius: '6px', border: `1px solid ${t.borderStrong}` }}>
                                                    <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600 }}>Inputs</div>
                                                    {(node.data.inputs || []).map(p => {
                                                        const key = `${node.id}__${p.name}`;
                                                        const isAutoRouted = node.data.autoRoute?.[p.name];
                                                        const isPortWired = edges.some(e => e.target === node.id && e.targetHandle === p.name);
                                                        const isDisabled = isAutoRouted || isPortWired;
                                                        return (
                                                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}>
                                                                <input type="checkbox" checked={!!exposedPorts[key]} onChange={() => toggleExposePort(node.id, p.name, p, true)} disabled={isDisabled} />
                                                                Promote <code>{p.name}</code> to top {isPortWired && '(Wired)'}
                                                            </label>
                                                        );
                                                    })}
                                                    <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600, marginTop: '4px' }}>Outputs</div>
                                                    {(node.data.outputs || []).map(p => {
                                                        const key = `${node.id}__${p.name}`;
                                                        const isPortWired = edges.some(e => e.source === node.id && e.sourceHandle === p.name);
                                                        return (
                                                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: isPortWired ? 'not-allowed' : 'pointer', opacity: isPortWired ? 0.5 : 1 }}>
                                                                <input type="checkbox" checked={!!exposedPorts[key]} onChange={() => toggleExposePort(node.id, p.name, p, false)} disabled={isPortWired} />
                                                                Promote <code>{p.name}</code> to top {isPortWired && '(Wired)'}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ ...s.formGroup, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                                            <label style={s.label}>Behavioral RTL Code Implementation</label>
                                            <div style={{
                                                flex: 1,
                                                marginTop: '4px',
                                                minHeight: '220px',
                                                borderRadius: '6px',
                                                overflow: 'auto',
                                                background: t.codeBg,
                                                border: `1px solid ${t.borderStrong}`
                                            }}>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr',
                                                    gridTemplateRows: 'auto'
                                                }}>
                                                    <pre
                                                        style={{
                                                            gridArea: '1/1',
                                                            margin: 0,
                                                            padding: '12px',
                                                            fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                                            fontSize: '12px',
                                                            lineHeight: '1.5',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-all',
                                                            background: 'transparent',
                                                            color: 'inherit',
                                                            pointerEvents: 'none',
                                                            overflow: 'visible'
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: highlightVerilogCode(currentModuleCode + '\n', theme) }}
                                                    />
                                                    <textarea
                                                        value={currentModuleCode}
                                                        onChange={handleCodeChange}
                                                        spellCheck="false"
                                                        style={{
                                                            gridArea: '1/1',
                                                            margin: 0,
                                                            padding: '12px',
                                                            fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                                            fontSize: '12px',
                                                            lineHeight: '1.5',
                                                            background: 'transparent',
                                                            color: 'transparent',
                                                            caretColor: theme === 'dark' ? '#ffffff' : '#111827',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-all',
                                                            resize: 'none',
                                                            border: 'none',
                                                            outline: 'none',
                                                            boxSizing: 'border-box',
                                                            overflow: 'hidden',
                                                            width: '100%',
                                                            height: 'auto'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${t.border}`, userSelect: 'none' }}>
                                    <button onClick={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; setTimeout(() => { recordHistory(); setNodes(n => n.filter(x => x.id !== targetId)); setActiveModal({ type: null, id: null }); setSelectedNodeId(null); }, 80); }} style={{ ...s.dangerBtn, transition: 'transform 0.1s ease, background-color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.danger}>Purge Block</button>
                                    <button onClick={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; setTimeout(() => { setActiveModal({ type: null, id: null }); }, 80); }} style={{ ...s.primaryBtn, margin: 0, padding: '6px 16px', transition: 'transform 0.1s ease, background-color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.primaryHover || '#1d4ed8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.primary}>Apply Changes</button>
                                </div>
                            </div>
                        );
                    } else {
                        const edge = edges.find(e => e.id === targetId);
                        if (!edge) return null;
                        return (
                            <div style={{ position: 'fixed', top: `${modalPos.y}px`, left: `${modalPos.x}px`, width: '360px', zIndex: 99999, background: t.bgSecondary, border: `2px solid ${theme === 'dark' ? t.primary : t.borderStrong}`, borderRadius: '12px', padding: '20px', color: t.textHeading, boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${t.border}`, paddingBottom: '8px', userSelect: 'none' }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: t.primary }}><IconTrace size={15} /> Net Trace Metrics</h3>
                                    <button onClick={() => setActiveModal({ type: null, id: null })} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer' }}><IconX size={16} /></button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={s.formGroup}>
                                        <label style={s.label}>Explicit Bus Width Constraint</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="number" min="1" max="128" value={edge.data?.bitWidth || 1} onChange={(e) => { const val = parseInt(e.target.value); if (val > 0 && val <= 128) { recordHistory(); setEdges(eds => eds.map(ed => ed.id === targetId ? { ...ed, data: { ...ed.data, bitWidth: val } } : ed)); } }} style={{ ...s.input, width: '70px', padding: '6px', textAlign: 'center' }} />
                                            <span style={{ fontSize: '12px', color: t.textSecondary }}>bits width array</span>
                                        </div>
                                    </div>
                                    <div style={s.formGroup}>
                                        <label style={s.label}>Net Highlighter Schematic Tint</label>
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                            {['#ef4444', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'].map(color => (
                                                <div key={color} onClick={() => { recordHistory(); setEdges(eds => eds.map(e => e.id === targetId ? { ...e, data: { ...e.data, color } } : e)); }} style={{ width: '24px', height: '24px', backgroundColor: color, borderRadius: '4px', cursor: 'pointer', border: edge.data?.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)' }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '10px', borderTop: `1px solid ${t.border}`, userSelect: 'none' }}>
                                    <button onClick={() => { setEdges(eds => eds.filter(e => e.id !== targetId)); setActiveModal({ type: null, id: null }); setGlowingNet(null); }} style={s.dangerBtn}>Sever Route</button>
                                    <button onClick={() => setActiveModal({ type: null, id: null })} style={{ ...s.primaryBtn, margin: 0, padding: '6px 16px' }}>Confirm</button>
                                </div>
                            </div>
                        );
                    }
                })()}

                {/* CLEAR MODAL */}
                {showClearModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.45)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#ef4444' : '#fca5a5'}`,
                            borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
                            color: theme === 'dark' ? '#ffffff' : '#111827',
                            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: t.danger, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <IconTrash size={16} /> Wipe Schematic Workspace?
                                </h3>
                                <button onClick={() => setShowClearModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}><IconX size={16} /></button>
                            </div>
                            <p style={{ fontSize: '12px', color: t.textSecondary, margin: '0 0 20px 0', lineHeight: '1.6' }}>
                                Are you absolutely sure you want to clear the entire canvas layout? This operation will **permanently delete** all instantiated hardware blocks, customized behavioural logic definitions, and structural net routing wires.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => setShowClearModal(false)} style={{ ...s.smallBtn, background: theme === 'dark' ? '#111111' : '#f1f5f9', color: t.text, border: `1px solid ${t.border}` }}>Cancel</button>
                                <button onClick={handleClearAll} style={{ ...s.smallBtn, background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 600, padding: '6px 16px', boxShadow: '0 2px 4px rgba(220,38,38,0.2)', cursor: 'pointer' }}>Clear Everything</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SAVE MODAL */}
                {showSaveModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.45)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                            border: `2px solid ${theme === 'dark' ? '#0b00d4' : '#483ff9'}`,
                            borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '90%',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                            color: theme === 'dark' ? '#ffffff' : '#111827',
                            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <IconSave size={16} /> Save Architecture Workspace
                                </h3>
                                <button onClick={() => setShowSaveModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}><IconX size={16} /></button>
                            </div>
                            <p style={{ fontSize: '12px', color: t.textSecondary, margin: '0 0 12px 0', lineHeight: '1.5' }}>
                                Your hardware blocks and wiring routes will be archived into a portable design payload config file.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>File Configuration Name</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input autoFocus value={proposedFileName} onChange={(e) => setProposedFileName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') executeActualDownload(proposedFileName); if (e.key === 'Escape') setShowSaveModal(false); }} style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: '48px', border: `1px solid ${theme === 'dark' ? '#333333' : '#cbd5e1'}`, backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc', color: theme === 'dark' ? '#ffffff' : '#111827' }} />
                                    <span style={{ position: 'absolute', right: '10px', fontSize: '12px', fontFamily: 'monospace', color: t.textMuted, pointerEvents: 'none' }}>.json</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => setShowSaveModal(false)} style={{ ...s.smallBtn, background: theme === 'dark' ? '#111111' : '#f1f5f9', color: t.text, border: `1px solid ${t.border}` }}>Cancel</button>
                                <button onClick={() => executeActualDownload(proposedFileName)} style={{ ...s.smallBtn, background: t.primary, color: '#ffffff', border: 'none', fontWeight: 600, padding: '6px 16px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>Confirm & Save</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* for duplicate variables and modules */}
                {errorModal.show && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.45)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#f87171' : '#fca5a5'}`,
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '420px',
                            width: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
                            color: theme === 'dark' ? '#ffffff' : '#111827',
                            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M12 9v4" />
                                        <path d="M12 17h.01" />
                                        <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                                    </svg>

                                    Port Name Conflict
                                </h3>
                                <button onClick={() => setErrorModal({ show: false, message: '' })} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                                    <IconX size={16} />
                                </button>
                            </div>
                            <div
                                style={{
                                    margin: '4px 0 22px',
                                    padding: '14px 16px',
                                    borderRadius: '10px',
                                    background: theme === 'dark'
                                        ? 'rgba(239,68,68,0.08)'
                                        : 'rgba(239,68,68,0.06)',
                                    border: `1px solid ${theme === 'dark'
                                        ? 'rgba(239,68,68,0.18)'
                                        : 'rgba(239,68,68,0.15)'
                                        }`,
                                    fontSize: '13px',
                                    lineHeight: 1.7,
                                    color: t.textHeading,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    letterSpacing: '0.15px',
                                    fontWeight: 450,
                                }}
                            >
                                {errorModal.message}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setErrorModal({ show: false, message: '' })} style={{
                                    ...s.smallBtn,
                                    background: t.primary,
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 600,
                                    padding: '6px 20px',
                                    cursor: 'pointer'
                                }}>
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN LAYOUT (LEFT + CANVAS + RIGHT) */}
                <div style={s.main} ref={mainRef}>
                    {/* LEFT PANEL */}
                    <div style={s.leftPanel}>
                        {leftCollapsed ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '14px', gap: '16px', height: '100%', boxSizing: 'border-box' }}>
                                <button
                                    onClick={() => {
                                        setLeftTab("library");
                                        setLeftCollapsed(false);
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "scale(1.12)";
                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(95, 7, 247, 0.7)";
                                        e.currentTarget.style.filter = "brightness(1.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                    style={{
                                        padding: "8px",
                                        borderRadius: "50%",
                                        cursor: "pointer",
                                        border: "none",
                                        background:
                                            leftTab === "library"
                                                ? "linear-gradient(90deg, #2563EB, #6D28D9)"
                                                : "transparent",
                                        color: leftTab === "library" ? "#fff" : t.textSecondary,
                                        transition: "all 0.2s ease",
                                    }}
                                    title="Library"
                                >
                                    <IconGrid size={18} />
                                </button>

                                <button
                                    onClick={() => {
                                        setLeftTab('search');
                                        setLeftCollapsed(false);
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "scale(1.12)";
                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(95, 7, 247, 0.7)";
                                        e.currentTarget.style.filter = "brightness(1.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        border: 'none',
                                        background:
                                            leftTab === "search"
                                                ? "linear-gradient(90deg, #2563EB, #6D28D9)"
                                                : "transparent", color: leftTab === 'search' ? '#fff' : t.textSecondary,
                                        transition: 'all 0.2s'
                                    }} title="Search">
                                    <IconSearch size={18} />
                                </button>

                                <button onClick={() => {
                                    setLeftTab('trace');
                                    setLeftCollapsed(false);
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "scale(1.12)";
                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                        e.currentTarget.style.filter = "brightness(1.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        border: 'none',
                                        background:
                                            leftTab === "trace"
                                                ? "linear-gradient(90deg, #2563EB, #6D28D9)"
                                                : "transparent", color: leftTab === 'trace' ? '#fff' : t.textSecondary, transition: 'all 0.2s'
                                    }} title="Trace">
                                    <IconTrace size={18} />
                                </button>
                                <button
                                    onClick={() => setLeftCollapsed(false)}
                                    className={`sidebar-expand-btn ${theme === "dark" ? "dark" : "light"}`}
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        transform: "translate(-50%, -50%)",
                                        width: "40px", // square width
                                        height: "40px", // square height
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: 0,
                                        background: "linear-gradient(90deg, #1179f9, #4a10fa)", // gradient background
                                        border: "none",
                                        borderRadius: "50%", // optional: rounded square
                                        cursor: "pointer",
                                        color: "#fff", // white icon/text
                                        transition: "all 0.3s ease",
                                    }}
                                    title="Expand panel"
                                >
                                    <IconChevronRight
                                        size={20}
                                        style={{
                                            transition: "transform 0.3s ease",
                                            transform: "translateX(1px)", // tiny offset for centering
                                        }}
                                    />
                                </button>

                            </div>
                        ) : (
                            <>
                                <div style={s.panelHeader}>
                                    <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                        {[
                                            ['library', <IconGrid key="lg" size={14} />, 'Library'],
                                            ['search', <IconSearch key="ls" size={14} />, 'Search'],
                                            ['trace', <IconTrace key="lt" size={14} />, 'Trace']
                                        ].map(([tab, icon, label]) => (
                                            <button key={tab} onClick={() => setLeftTab(tab)} title={label}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = "scale(1.12)";
                                                    e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                                    e.currentTarget.style.filter = "brightness(1.2)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = "scale(1)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                    e.currentTarget.style.filter = "brightness(1)";
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', fontSize: '12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 600,
                                                    background:
                                                        leftTab === tab
                                                            ? "linear-gradient(90deg, #2563EB, #6D28D9)"
                                                            : "transparent",
                                                    color: leftTab === tab ? '#fff' : t.textSecondary,
                                                    // marginRight: '10px'
                                                }}>
                                                {icon}
                                                <span style={{ display: leftWidth < 260 ? 'none' : 'inline' }}>{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setLeftCollapsed(true)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.12)";
                                            e.currentTarget.style.boxShadow = "0px 0px 20px rgba(95, 7, 247, 0.7)";
                                            e.currentTarget.style.filter = "brightness(1.08)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                            e.currentTarget.style.boxShadow = "none";
                                            e.currentTarget.style.filter = "brightness(1)";
                                        }}
                                        style={{
                                            ...s.iconBtn,
                                            marginLeft: "10px",
                                            // borderRadius: '40%',
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            // flexShrink: 0,
                                            background: "linear-gradient(90deg, #6e01dc, #23dcdc)", // gradient background
                                            color: "#fff", // ensure text/icon is visible
                                            border: "none",
                                            transition: "all 0.2s",
                                        }}
                                        title="Collapse"
                                    >
                                        <IconChevronLeft size={14} />
                                    </button>

                                </div>

                                {!leftCollapsed && leftTab === 'library' && (
                                    <div style={{ overflowY: 'auto', flex: 1 }}>
                                        <div style={s.panelSection}>
                                            <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>Standard Cell Library</div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                    <button onClick={() => setIsLibOpen(!isLibOpen)} style={{ ...s.input, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: theme === 'dark' ? '#050505' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#111827', border: `1px solid ${theme === 'dark' ? '#333333' : '#cbd5e1'}` }}>
                                                        <span>{selectedStandardBlock}</span>
                                                        <span style={{ marginLeft: '8px' }}>▼</span>
                                                    </button>
                                                    {isLibOpen && (
                                                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', background: theme === 'dark' ? '#0a0a0a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#333333' : '#cbd5e1'}`, borderRadius: '6px', zIndex: 1000, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
                                                            {Object.keys(STANDARD_LIBRARY).map((key) => (
                                                                <div key={key} onClick={() => { setSelectedStandardBlock(key); setIsLibOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontFamily: 'monospace', background: key === selectedStandardBlock ? (theme === 'dark' ? '#1a2744' : '#e0edff') : 'transparent', color: theme === 'dark' ? '#ffffff' : '#111827', borderBottom: `1px solid ${theme === 'dark' ? '#222222' : '#e5e7eb'}`, transition: 'background 0.1s' }} onMouseEnter={(e) => { e.currentTarget.style.background = theme === 'dark' ? '#1a1a2e' : '#f3f4f6'; }} onMouseLeave={(e) => { e.currentTarget.style.background = key === selectedStandardBlock ? (theme === 'dark' ? '#1a2744' : '#e0edff') : 'transparent'; }}>{key}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => spawnPrebuilt(selectedStandardBlock)}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = "scale(1.12)";
                                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                                        e.currentTarget.style.filter = "brightness(1.2)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = "scale(1)";
                                                        e.currentTarget.style.boxShadow = "none";
                                                        e.currentTarget.style.filter = "brightness(1)";
                                                    }}
                                                    style={{ ...s.smallBtn, color: '#fff', background: "linear-gradient(90deg, #d92828, #9225eb)", border: 'none', fontWeight: 800 }}>+ Add</button>
                                            </div>
                                        </div>
                                        <div style={s.divider} />
                                        <div style={s.panelSection}>
                                            <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>Custom Instantiation</div>
                                            <form onSubmit={createBlock} style={s.form}>
                                                <div style={s.formGroup}><label style={s.label}>Module Definition Name</label><input value={newModuleName} onChange={e => setNewModuleName(e.target.value)} style={s.input} /></div>
                                                <div style={s.formGroup}><label style={s.label}>Input Port List</label><input value={newInputs} onChange={e => setNewInputs(e.target.value)} style={s.input} /></div>
                                                <div style={s.formGroup}><label style={s.label}>Output Port List</label><input value={newOutputs} onChange={e => setNewOutputs(e.target.value)} style={s.input} /></div>
                                                <button type="submit"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = "scale(1.05)";
                                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                                        e.currentTarget.style.filter = "brightness(1.2)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = "scale(1)";
                                                        e.currentTarget.style.boxShadow = "none";
                                                        e.currentTarget.style.filter = "brightness(1)";
                                                    }}
                                                    style={{
                                                        ...s.primaryBtn, opacity: newModuleName.trim() ? 1 : 0.4, cursor: newModuleName.trim() ? 'pointer' : 'not-allowed', background:
                                                            newModuleName.trim()
                                                                ? "linear-gradient(90deg, #9c25eb, #d92828)"
                                                                : "transparent", color: '#fff', transition: 'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease', willChange: 'transform', fontWeight: 700
                                                    }}>Instantiate Hardware Block</button>
                                            </form>
                                        </div>
                                        <div style={s.divider} />
                                        <div style={s.panelSection}>
                                            <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>Design Rule Check (DRC)</div>
                                            {(() => {
                                                const activeAlerts = [];
                                                if (!nodes || !Array.isArray(nodes)) return null;
                                                nodes.forEach(node => {
                                                    if (!node || !node.data) return;
                                                    const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);
                                                    if (isSplitterOrBundler) return;
                                                    const nodeTieoffs = node.data.tieoffs || {};
                                                    const nodeAutoRoute = node.data.autoRoute || {};
                                                    const nodeInputs = node.data.inputs || [];
                                                    const nodeOutputs = node.data.outputs || [];
                                                    nodeInputs.forEach(port => {
                                                        if (!port || !port.name) return;
                                                        const safeEdges = edges || [];
                                                        const connected = safeEdges.filter(e => e && e.target === node.id && e.targetHandle === port.name);
                                                        const tieoff = nodeTieoffs[port.name];
                                                        const autoRoute = nodeAutoRoute[port.name];
                                                        const isExposed = exposedPorts && exposedPorts[`${node.id}__${port.name}`];
                                                        if (connected.length === 0 && !tieoff && !autoRoute && !isExposed) {
                                                            activeAlerts.push({ node, type: 'error', icon: <IconAlert color="#ef4444" size={14} />, text: `Floating Input: ${node.data.instanceName || 'Block'}.${port.name} is undriven.` });
                                                        }
                                                        if (connected.length > 1) {
                                                            activeAlerts.push({ node, type: 'error', icon: <IconZap color="#ef4444" size={14} />, text: `Bus Short: Multiple drivers connected to ${node.data.instanceName || 'Block'}.${port.name}.` });
                                                        }
                                                    });
                                                    nodeOutputs.forEach(port => {
                                                        if (!port || !port.name) return;
                                                        const safeEdges = edges || [];
                                                        const connected = safeEdges.filter(e => e && e.source === node.id && e.sourceHandle === port.name);
                                                        const isExposed = exposedPorts && exposedPorts[`${node.id}__${port.name}`];
                                                        if (connected.length === 0 && !isExposed) {
                                                            activeAlerts.push({ node, type: 'warn', icon: <IconCircleSlash color="#9ca3af" size={14} />, text: `Unused Output: ${node.data.instanceName || 'Block'}.${port.name} drops into a dead end.` });
                                                        }
                                                    });
                                                });
                                                const safeEdgesForMismatches = edges || [];
                                                safeEdgesForMismatches.forEach(edge => {
                                                    if (!edge || !edge.source || !edge.target) return;
                                                    const srcNode = nodes.find(n => n && n.id === edge.source);
                                                    const tgtNode = nodes.find(n => n && n.id === edge.target);
                                                    if (!srcNode || !tgtNode || !srcNode.data || !tgtNode.data) return;
                                                    const srcPort = (srcNode.data.outputs || []).find(p => p && p.name === edge.sourceHandle);
                                                    const tgtPort = (tgtNode.data.inputs || []).find(p => p && p.name === edge.targetHandle);
                                                    if (srcPort && tgtPort && srcPort.width !== tgtPort.width) {
                                                        activeAlerts.push({ node: tgtNode, edgeId: edge.id, type: 'mismatch', icon: <IconActivity color="#f59e0b" size={14} />, text: `Width Mismatch: ${srcNode.data.instanceName || 'u'}.${srcPort.name} (${srcPort.width}b) → ${tgtNode.data.instanceName || 'u'}.${tgtPort.name} (${tgtPort.width}b).` });
                                                    }
                                                });
                                                if (activeAlerts.length === 0) {
                                                    return <div style={{ ...s.emptyState, background: theme === 'dark' ? '#041e12' : '#f0fdf4', border: `1px dashed ${theme === 'dark' ? '#10b981' : '#bbf7d0'}`, color: theme === 'dark' ? '#34d399' : '#15803d' }}>✨ All clean! Netlist passes structural verification checks perfectly.</div>;
                                                }
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6' }}>
                                                        {activeAlerts.map((alert, idx) => {
                                                            if (!alert || !alert.node) return null;
                                                            return (
                                                                <div key={idx} onClick={() => {
                                                                    if (!alert || !alert.node) return;
                                                                    const targetNodeId = alert.node.id;
                                                                    setSelectedNodeId(targetNodeId);
                                                                    setSelectedEdgeId(alert.edgeId || null);
                                                                    const posX = alert.node.position?.x ?? 0;
                                                                    const posY = alert.node.position?.y ?? 0;
                                                                    if (alert.node.position) {
                                                                        setCenter(posX + 90, posY + 60, { zoom: 1.2, duration: 400 });
                                                                        setNodes(nds => nds.map(n => n.id === targetNodeId ? { ...n, data: { ...n.data, isDrcFlashing: true } } : n));
                                                                        setTimeout(() => {
                                                                            setNodes(nds => nds.map(n => n.id === targetNodeId ? { ...n, data: { ...n.data, isDrcFlashing: false } } : n));
                                                                        }, 1600);
                                                                    }
                                                                }} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '6px', cursor: 'pointer', background: theme === 'dark' ? '#0a0a0a' : '#f8fafc', border: `1px solid ${theme === 'dark' ? '#222222' : '#e5e7eb'}`, transition: 'all 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.borderColor = alert.type === 'error' ? '#ef4444' : '#f59e0b'; e.currentTarget.style.background = theme === 'dark' ? '#111111' : '#f1f5f9'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = theme === 'dark' ? '#222222' : '#e5e7eb'; e.currentTarget.style.background = theme === 'dark' ? '#0a0a0a' : '#f8fafc'; }}>
                                                                    <div style={{ marginTop: '2px', flexShrink: 0 }}>{alert.icon}</div>
                                                                    <div style={{ fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.4', color: alert.type === 'error' ? '#ef4444' : t.text }}>{alert.text}</div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                color: t.textSecondary,
                                                padding: '32px 20px',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <svg
                                                width="28"
                                                height="28"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={0.7}
                                            >
                                                <path d="M9 18l6-6-6-6" />
                                                <path d="M3 12h12" />
                                            </svg>

                                            <div style={{ fontSize: '14px', lineHeight: 1.5, fontFamily: 'monospace' }}>
                                                CLICK ON ANY MODULE OR WIRE TO VIEW OR EDIT ITS PROPERTIES.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!leftCollapsed && leftTab === 'search' && (
                                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={s.panelSection}>
                                            <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>Module Search</div>
                                            <div style={{ position: 'relative' }}>
                                                <input autoFocus ref={searchInputRef} value={moduleSearchQuery} onChange={e => { setModuleSearchQuery(e.target.value); setModuleSearchFocusIdx(0); setSearchHighlightIds(new Set()); }} onKeyDown={handleModuleSearchKey} placeholder="Search by module or instance name…" style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: moduleSearchQuery ? '28px' : '10px' }} />
                                                {moduleSearchQuery && <button onClick={() => { setModuleSearchQuery(''); setSearchHighlightIds(new Set()); }} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '14px', lineHeight: 1 }}>✕</button>}
                                            </div>
                                            {moduleSearchQuery.trim() && <div style={{ marginTop: '4px', fontSize: '11px', color: t.textMuted }}>{moduleSearchResults.length} result{moduleSearchResults.length !== 1 ? 's' : ''} · ↑↓ navigate · Enter to jump</div>}
                                        </div>
                                        {moduleSearchResults.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 14px 14px' }}>
                                                {moduleSearchResults.map((node, idx) => {
                                                    const isFocused = idx === moduleSearchFocusIdx;
                                                    const inputCount = (node.data.inputs || []).length;
                                                    const outputCount = (node.data.outputs || []).length;
                                                    const driverCount = edges.filter(e => e.target === node.id).length;
                                                    const fanoutCount = edges.filter(e => e.source === node.id).length;
                                                    return (
                                                        <div key={node.id} onClick={() => { setModuleSearchFocusIdx(idx); jumpToNode(node); }} style={{ padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${isFocused ? t.primary : t.border}`, background: isFocused ? (theme === 'dark' ? '#0a1628' : '#eff6ff') : t.bgTertiary, transition: 'border-color 0.12s, background 0.12s' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '12px', color: t.textHeading, fontFamily: 'monospace' }}>{node.data.moduleName}</div>
                                                                <div style={{ fontSize: '10px', color: '#10b981', background: theme === 'dark' ? '#052e1c' : '#d1fae5', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace' }}>⊞ Jump</div>
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: t.textSecondary, fontFamily: 'monospace', marginTop: '2px' }}>{node.data.instanceName}</div>
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: t.textMuted }}>
                                                                <span>↳ {inputCount}in / {outputCount}out</span>
                                                                <span style={{ color: driverCount > 0 ? '#10b981' : t.textMuted }}>▶ {driverCount} driver{driverCount !== 1 ? 's' : ''}</span>
                                                                <span style={{ color: fanoutCount > 0 ? '#f59e0b' : t.textMuted }}>⇥ {fanoutCount} fanout</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {moduleSearchQuery.trim() && moduleSearchResults.length === 0 && <div style={{ ...s.emptyState, margin: '0 14px' }}>No modules match <code style={{ fontFamily: 'monospace' }}>"{moduleSearchQuery}"</code></div>}
                                        {!moduleSearchQuery.trim() && <div style={{ ...s.emptyState, margin: '0 14px', lineHeight: 1.7 }}>Type a module or instance name to search.<br /><span style={{ color: t.textMuted, fontSize: '11px' }}>Results highlight & jump on canvas.</span></div>}
                                    </div>
                                )}

                                {!leftCollapsed && leftTab === 'trace' && (
                                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={s.panelSection}>
                                            <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>Hierarchy / Net Trace</div>
                                            <div style={{ position: 'relative' }}>
                                                <input ref={hierarchyInputRef} value={hierarchySearchQuery} onChange={e => { const val = e.target.value; setHierarchySearchQuery(val); buildHierarchyResult(val); }} onKeyDown={e => { if (e.key === 'Escape') { setHierarchySearchQuery(''); setHierarchyResults(null); } }} placeholder="Trace by module or instance…" style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: hierarchySearchQuery ? '28px' : '10px' }} />
                                                {hierarchySearchQuery && <button onClick={() => { setHierarchySearchQuery(''); setHierarchyResults(null); }} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '14px', lineHeight: 1 }}>✕</button>}
                                            </div>
                                            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '5px' }}>Shows drivers, fanout, and unconnected nets.</div>
                                        </div>
                                        {hierarchyResults === null && <div style={{ ...s.emptyState, margin: '0 14px', lineHeight: 1.7 }}>Enter a module name above to live trace.<br /><span style={{ fontSize: '11px', color: t.textMuted }}>Click any driver/fanout row to jump and highlight that net on canvas.</span></div>}
                                        {hierarchyResults !== null && hierarchyResults.length === 0 && <div style={{ ...s.emptyState, margin: '0 14px' }}>No modules found for <code>"{hierarchySearchQuery}"</code></div>}
                                        {hierarchyResults !== null && hierarchyResults.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 14px 14px' }}>
                                                {hierarchyResults.map(({ node, drivers, fanoutByPort, unconnectedInputs }) => {
                                                    const key = node.id;
                                                    const isOpen = !!hierarchyExpanded[key];
                                                    return (
                                                        <div key={key} style={{ border: `1px solid ${t.borderStrong}`, borderRadius: '7px', overflow: 'hidden', background: t.bgTertiary }}>
                                                            <div onClick={() => setHierarchyExpanded(p => ({ ...p, [key]: !p[key] }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', cursor: 'pointer', background: t.bgSecondary }}>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: '12px', color: t.textHeading, fontFamily: 'monospace' }}>{node.data.moduleName}</div>
                                                                    <div style={{ fontSize: '10px', color: t.textSecondary, fontFamily: 'monospace' }}>{node.data.instanceName}</div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '10px', color: '#10b981', background: theme === 'dark' ? '#052e1c' : '#d1fae5', padding: '1px 5px', borderRadius: '3px' }}>{drivers.length}▲</span>
                                                                    <span style={{ fontSize: '10px', color: '#f59e0b', background: theme === 'dark' ? '#1c1000' : '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>{Object.values(fanoutByPort).flat().length}▼</span>
                                                                    {unconnectedInputs.length > 0 && <span style={{ fontSize: '10px', color: '#ef4444', background: theme === 'dark' ? '#1c0000' : '#fee2e2', padding: '1px 5px', borderRadius: '3px' }}>⚠{unconnectedInputs.length}</span>}
                                                                    <span style={{ color: t.textMuted, fontSize: '12px' }}>{isOpen ? '▾' : '▸'}</span>
                                                                </div>
                                                            </div>
                                                            {isOpen && (
                                                                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {drivers.length > 0 && (
                                                                        <div>
                                                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>▲ Drivers (inputs)</div>
                                                                            {drivers.map(d => (
                                                                                <div key={d.edgeId} onClick={() => highlightNetPath(d.edgeId, d.sourceNodeId)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', marginBottom: '3px', borderRadius: '4px', cursor: 'pointer', background: t.bg, border: `1px solid ${t.border}`, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#111' : '#f0f4ff'} onMouseLeave={e => e.currentTarget.style.background = t.bg}>
                                                                                    <div><div style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textHeading }}>{d.srcInstanceName}<span style={{ color: t.textMuted }}>.{d.sourceHandle}</span></div><div style={{ fontSize: '10px', color: t.textMuted }}>→ .{d.targetHandle}</div></div>
                                                                                    <div style={{ fontSize: '10px', color: d.bitWidth > 1 ? '#6366f1' : t.textMuted, fontFamily: 'monospace' }}>{d.bitWidth > 1 ? `[${d.bitWidth - 1}:0]` : '1b'}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {Object.keys(fanoutByPort).length > 0 && (
                                                                        <div>
                                                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>▼ Fanout (outputs)</div>
                                                                            {Object.entries(fanoutByPort).map(([port, fans]) => (
                                                                                <div key={port} style={{ marginBottom: '6px' }}>
                                                                                    <div style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600, padding: '2px 0 4px 6px' }}>.{port} <span style={{ color: t.textMuted }}>({fans.length} load{fans.length !== 1 ? 's' : ''})</span></div>
                                                                                    {fans.map(f => (
                                                                                        <div key={f.edgeId} onClick={() => highlightNetPath(f.edgeId, f.targetNodeId)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', marginBottom: '3px', borderRadius: '4px', cursor: 'pointer', background: t.bg, border: `1px solid ${t.border}`, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#111' : '#fffbeb'} onMouseLeave={e => e.currentTarget.style.background = t.bg}>
                                                                                            <div><div style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textHeading }}>{f.tgtInstanceName}<span style={{ color: t.textMuted }}>.{f.targetHandle}</span></div></div>
                                                                                            <div style={{ fontSize: '10px', color: f.bitWidth > 1 ? '#6366f1' : t.textMuted, fontFamily: 'monospace' }}>{f.bitWidth > 1 ? `[${f.bitWidth - 1}:0]` : '1b'}</div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {unconnectedInputs.length > 0 && (
                                                                        <div>
                                                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠ Floating Inputs</div>
                                                                            {unconnectedInputs.map(p => (
                                                                                <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: '2px', borderRadius: '4px', background: theme === 'dark' ? '#1c0000' : '#fff5f5', border: `1px solid ${theme === 'dark' ? '#3a0000' : '#fca5a5'}` }}>
                                                                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ef4444' }}>.{p.name}</span>
                                                                                    <span style={{ fontSize: '10px', color: t.textMuted, fontFamily: 'monospace' }}>{p.width > 1 ? `${p.width}b` : '1b'} undriven</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {drivers.length === 0 && Object.keys(fanoutByPort).length === 0 && unconnectedInputs.length === 0 && <div style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic' }}>No connectivity data — module has no wired ports.</div>}
                                                                    <button onClick={() => { const targetNodeId = node.id; jumpToNode(node); setNodes(nds => nds.map(n => n.id === targetNodeId ? { ...n, data: { ...n.data, isDrcFlashing: true } } : n)); setTimeout(() => { setNodes(nds => nds.map(n => n.id === targetNodeId ? { ...n, data: { ...n.data, isDrcFlashing: false } } : n)); }, 1600); }} style={{ ...s.smallBtn, alignSelf: 'flex-start', fontSize: '11px', marginTop: '2px' }}>⊞ Jump to block</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* RESIZE HANDLE LEFT */}
                    {!leftCollapsed && <ResizeHandle onMouseDown={onMouseDownLeft} isDragging={draggingLeft} />}

                    {/* CANVAS */}
                    <div style={s.canvas}>
                        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onReconnect={onReconnect} onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onPaneClick={onPaneClick} onNodeDragStop={recordHistory} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView reconnectable="always" deleteKeyCode={null} connectionMode={ConnectionMode.Loose} style={{ backgroundColor: t.canvasBg }}>
                            <Background color={t.canvasDot} gap={24} size={1.5} />
                            <Controls position="bottom-left" style={{ background: '#050505', border: '1px solid #222222', borderRadius: '6px' }} />
                        </ReactFlow>
                    </div>

                    {/* RESIZE HANDLE RIGHT */}
                    {!rightCollapsed && <ResizeHandle onMouseDown={onMouseDownRight} isDragging={draggingRight} />}

                    {/* RIGHT PANEL */}
                    <div style={s.rightPanel}>
                        {rightCollapsed ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '14px', gap: '16px', height: '100%', boxSizing: 'border-box' }}>
                                <button onClick={() => {
                                    setTopViewMode('code');
                                    setRightCollapsed(false);
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "scale(1.12)";
                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                        e.currentTarget.style.filter = "brightness(1.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                    style={{
                                        padding: '10px', borderRadius: '50%', cursor: 'pointer', border: 'none',
                                        background: topViewMode === 'code'
                                            ? "linear-gradient(90deg, #2563EB, #6D28D9)"
                                            : "transparent", color: leftTab === 'trace' ? '#fff' : t.textSecondary,
                                        color: topViewMode === 'code' ? '#fff' : t.textSecondary,
                                        transition: 'all 0.2s'
                                    }} title="Code View">
                                    <IconCode size={18} />
                                </button>
                                <button onClick={() => {
                                    setTopViewMode('symbol');
                                    setRightCollapsed(false);
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "scale(1.12)";
                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                        e.currentTarget.style.filter = "brightness(1.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                    style={{
                                        padding: '8px', borderRadius: '50%',
                                        cursor: 'pointer', border: 'none',
                                        background: topViewMode === 'symbol'
                                            ? "linear-gradient(90deg, #2563EB, #6D28D9)"
                                            : "transparent", color: leftTab === 'trace' ? '#fff' : t.textSecondary,
                                        color: topViewMode === 'symbol' ? '#fff' : t.textSecondary,
                                        transition: 'all 0.2s'
                                    }} title="Block Diagram">
                                    <IconBox size={18} />
                                </button>
                                <button onClick={() => {
                                    setTopViewMode('testbench');
                                    setRightCollapsed(false);
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "scale(1.12)";
                                        e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                        e.currentTarget.style.filter = "brightness(1.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                    style={{
                                        padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none',
                                        background: topViewMode === 'testbench'
                                            ? "linear-gradient(90deg, #3b71e5, #5e12d9)"
                                            : "transparent", color: leftTab === 'trace' ? '#fff' : t.textSecondary,
                                        color: topViewMode === 'testbench' ? '#fff' : t.textSecondary, transition: 'all 0.2s'
                                    }} title="Testbench"><IconTerminal size={18} /></button>
                                <button
                                    onClick={() => setRightCollapsed(false)}
                                    className={`sidebar-expand-btn ${theme === "dark" ? "dark" : "light"}`}
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        transform: "translate(-50%, -50%)",
                                        width: "40px", // square width
                                        height: "40px", // square height
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: 0,
                                        background: "linear-gradient(90deg, #1179f9, #4a10fa)", // gradient background
                                        border: "none",
                                        borderRadius: "50%", // optional: rounded square
                                        cursor: "pointer",
                                        color: "#fff", // white icon/text
                                        transition: "all 0.3s ease",
                                    }}
                                    title="Expand panel"
                                >
                                    <IconChevronLeft
                                        size={20}
                                        style={{
                                            transition: "transform 0.3s ease",
                                            transform: "translateX(1px)", // tiny offset for centering
                                        }}
                                    />
                                </button>
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={s.panelHeader}>
                                    <span style={s.sectionTitle}>Complete Structural System Top Layout</span>
                                    <button onClick={() => setRightCollapsed(true)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.12)";
                                            e.currentTarget.style.boxShadow = "0px 0px 20px rgba(99, 7, 247, 0.7)";
                                            e.currentTarget.style.filter = "brightness(1.2)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                            e.currentTarget.style.boxShadow = "none";
                                            e.currentTarget.style.filter = "brightness(1)";
                                        }}
                                        style={s.iconBtn} title="Collapse"><IconChevronRight size={14} /></button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 12px', background: t.bgSecondary, borderBottom: `1px solid ${t.border}`, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                                    {(() => {
                                        const isTightSpace = rightWidth < 360;
                                        return (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <button onClick={() => setTopViewMode('code')}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "scale(1.05)";
                                                            // e.currentTarget.style.boxShadow = "0px 0px 20px rgba(255, 255, 255, 0.7)";
                                                            e.currentTarget.style.filter = "brightness(1.2)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "scale(1)";
                                                            e.currentTarget.style.boxShadow = "none";
                                                            e.currentTarget.style.filter = "brightness(1)";
                                                        }}
                                                        style={{ ...(topViewMode === 'code' ? s.tabBtnActive : s.tabBtnInactive), display: 'flex', marginRight: '10px', alignItems: 'center', justifyContent: 'center', marginLeft: '10px', padding: '6px 8px', minWidth: isTightSpace ? '36px' : 'auto' }} title="Code View">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                                                        {!isTightSpace && <span style={{ marginLeft: '4px', whiteSpace: 'nowrap' }}>Code</span>}
                                                    </button>
                                                    <button onClick={() => setTopViewMode('symbol')}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "scale(1.05)";
                                                            // e.currentTarget.style.boxShadow = "0px 0px 10px rgba(116, 70, 189, 0.4)";
                                                            e.currentTarget.style.filter = "brightness(1.2)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "scale(1)";
                                                            e.currentTarget.style.boxShadow = "none";
                                                            e.currentTarget.style.filter = "brightness(1)";
                                                        }}
                                                        style={{ ...(topViewMode === 'symbol' ? s.tabBtnActive : s.tabBtnInactive), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px', minWidth: isTightSpace ? '36px' : 'auto', marginRight: '10px' }} title="Block Diagram">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                                        {!isTightSpace && <span style={{ marginLeft: '4px', whiteSpace: 'nowrap' }}>Block Diagram</span>}
                                                    </button>
                                                    <button onClick={() => setTopViewMode('testbench')}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "scale(1.12)";
                                                            e.currentTarget.style.filter = "brightness(1.2)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "scale(1)";
                                                            e.currentTarget.style.boxShadow = "none";
                                                            e.currentTarget.style.filter = "brightness(1)";
                                                        }}
                                                        style={{ ...(topViewMode === 'testbench' ? s.tabBtnActive : s.tabBtnInactive), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px', minWidth: isTightSpace ? '36px' : 'auto' }} title="Testbench">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                                                        {!isTightSpace && <span style={{ marginLeft: '4px', whiteSpace: 'nowrap' }}>TB Template</span>}
                                                    </button>
                                                </div>
                                                {(topViewMode === 'code' || topViewMode === 'testbench') && (
                                                    <button onClick={handleCopyCode} style={{ ...s.smallBtn, background: copied ? '#10b981' : t.primary, color: '#fff', border: 'none', transition: 'background 0.2s', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', height: '28px', width: '34px', borderRadius: '6px' }} title={copied ? "Copied!" : "Copy Code"}>
                                                        {copied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="7" y="6" width="12" height="15" rx="3" ry="3"></rect><path d="M4 14V7a4 4 0 0 1 4-4h7" strokeLinecap="round"></path></svg>}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    {topViewMode === 'code' ? (
                                        <pre style={s.codeBlock} dangerouslySetInnerHTML={{ __html: highlightVerilogCode(structuralVerilogFull, theme) }} />
                                    ) : topViewMode === 'testbench' ? (
                                        <pre style={s.codeBlock} dangerouslySetInnerHTML={{ __html: highlightVerilogCode(testbenchCodeFull, theme) }} />
                                    ) : (
                                        renderTopSymbol()
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
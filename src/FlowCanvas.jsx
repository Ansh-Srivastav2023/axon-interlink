import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { addEdge, useNodesState, useEdgesState, useReactFlow, reconnectEdge, ConnectionMode } from '@xyflow/react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { ResizeHandle, SmartEdge, LeftPanel, Canvas, RightPanel } from './edges';
import { GateNode, HardwareNode, SplitterNode } from './nodes'

import { themes } from './styles';
import getStyles from './styles/getStyles';
import { STANDARD_LIBRARY, parsePorts, getPortLabel, getSmartSpawnPosition, validatePorts } from './utils/hardwareutils';

import {
    // IconX, IconBox, IconTrace
} from './styles';

import { highlightVerilogCode } from './verilog-code/verilogEdits';
import Header from './utils/Header';
import { HelpModal, ClearModal, SaveModal, ErrorModal, ContextualModal } from './modals';

import { useFileOperations, useHistory } from './hooks';

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
    const [leftWidth, setLeftWidth] = useState(350);
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

    const [customCodes, setCustomCodes] = useState({});
    const [exposedPorts, setExposedPorts] = useState({});


    /* ============================================================
       4. LEFT PANEL TABS & SEARCH / TRACE STATE
       ============================================================ */
    const [moduleSearchQuery, setModuleSearchQuery] = useState('');
    const [moduleSearchFocusIdx, setModuleSearchFocusIdx] = useState(0);
    const [setSearchHighlightIds] = useState(new Set());

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
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });
    const showError = (message) => {
        setErrorModal({ show: true, message });
    };


    /* ============================================================
       7. UNDO / REDO
       ============================================================ */
    const {
        past, future, recordHistory, undo, redo,
    } = useHistory({
        nodes, edges, customCodes, exposedPorts, setNodes, setEdges, setCustomCodes, setExposedPorts, setSelectedNodeId, setSelectedEdgeId, setGlowingNet,
    });


    /* ============================================================
       8. REFS FOR INPUT FOCUS
       ============================================================ */
    const searchInputRef = useRef(null);
    const hierarchyInputRef = useRef(null);


    /* ============================================================
       9. KEYBOARD SHORTCUTS
       ============================================================ */

    const handleSaveWorkspace = () => {
        const defaultName = `rtl_schematic_backup_${Date.now().toString().slice(-5)}`;
        setProposedFileName(defaultName);
        setShowSaveModal(true);
    };

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
            setNodes(nds => nds.filter(n => !n.selected));
            setEdges(eds => eds.filter(e => !e.selected && e.source !== nodeId && e.target !== nodeId));
            setExposedPorts(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (next[key].nodeId === nodeId) delete next[key];
                });
                return next;
            });
            setSelectedNodeId(null);
        }
        if (edgeId) {
            recordHistory();
            setEdges(eds => eds.filter(e => !e.selected));
            setSelectedEdgeId(null);
            setGlowingNet(null);
        }
    }, [
        recordHistory,
        setNodes,
        setEdges,
        setExposedPorts,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet
    ]);


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

            const key = e.key;

            if (key === 'Delete' || key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            }

            if (key === 'Escape') {
                e.preventDefault();
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setGlowingNet(null);
                setNodes(nds => nds.map(n => ({ ...n, selected: false })));
                setEdges(eds => eds.map(e => ({ ...e, selected: false })));
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
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        handleDelete,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
        setNodes,
        setEdges,
        setActiveModal,
        setShowHelp,
        setShowSaveModal,
        setShowClearModal,
        setErrorModal
    ]);


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

    const computedEdges = useMemo(() => {
        return edges.map(e => {
            const srcNode = nodes.find(n => n.id === e.source);
            const tgtNode = nodes.find(n => n.id === e.target);
            const srcPort = (srcNode?.data.outputs || []).find(p => p.name === e.sourceHandle) ||
                (srcNode?.data.inputs || []).find(p => p.name === e.sourceHandle);
            const tgtPort = (tgtNode?.data.inputs || []).find(p => p.name === e.targetHandle) ||
                (tgtNode?.data.outputs || []).find(p => p.name === e.targetHandle);
            const sourceWidth = srcPort?.width || 1;
            const targetWidth = tgtPort?.width || 1;
            const nativeWidth = e.data?.bitWidth || sourceWidth;
            const allowedMaxWidth = Math.min(sourceWidth, targetWidth);
            const configuredWidth = Math.min(nativeWidth, allowedMaxWidth);
            const warning = checkEdgeWarnings(e, nodes);
            return { ...e, type: 'smart', data: { ...e.data, warning, bitWidth: Math.max(1, configuredWidth) } };
        });
    }, [edges, nodes, checkEdgeWarnings]);

    const warnings = useMemo(() => {
        return computedEdges.map(e => ({ id: e.id, msg: e.data?.warning })).filter(w => w.msg);
    }, [computedEdges]);


    /* ============================================================
       13. DYNAMIC SPLITTER / BUNDLER AUTO‑INFERENCE
       ============================================================ */
    useEffect(() => {
        let nodesChanged = false;
        const updatedNodes = nodes.map(node => {
            if (node.type !== 'splitter') return node;

            // Skip if user has manually overridden
            if (node.data._manualOverride) return node;

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
    }, [edges, setNodes, nodes]);


    /* ============================================================
       14. GLOW EFFECT (FOR EDGES)
       ============================================================ */
    const [hoveredNetSource] = useState(null);
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
    }, [nodes, setNodes, setEdges, recordHistory]);

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
        const modalHeight = 580;
        const x = Math.max(10, Math.min(event.clientX - 240, window.innerWidth - modalWidth - 10));
        const y = Math.max(10, Math.min(event.clientY - 80, window.innerHeight - modalHeight - 10));
        setModalPos({ x, y });
    }, [setSelectedNodeId, setSelectedEdgeId]);

    const onEdgeClick = useCallback((event, edge) => {
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
    }, [setSelectedEdgeId, setSelectedNodeId]);

    const onPaneClick = useCallback((event) => {
        if (event.target?.closest?.('.react-flow__handle')) return;
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setTraceGlowingEdgeId(null);
    }, [setSelectedNodeId, setSelectedEdgeId]);


    /* ============================================================
       16. SELECTED NODE / EDGE HELPERS
       ============================================================ */
    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);


    /* ============================================================
       17. PORT & NODE UPDATE FUNCTIONS
       ============================================================ */

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
            const currentInputs = field === 'inputs' ? parsed : (nodeToUpdate.data.inputs || []);
            const currentOutputs = field === 'outputs' ? parsed : (nodeToUpdate.data.outputs || []);
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
                (node.data.outputs || []).forEach((outP) => {
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

    const {
        executeActualDownload,
        handleLoadWorkspace,
        handleClearAll,
    } = useFileOperations({
        nodes, edges, customCodes, exposedPorts,
        theme, recordHistory, setNodes, setEdges,
        setCustomCodes, setExposedPorts, setSelectedNodeId,
        setSelectedEdgeId, setGlowingNet, setTheme, setShowSaveModal, setShowClearModal,
    });


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
        }));
        if (nodeType === 'splitter') {
            setCustomCodes(prev => ({
                ...prev,
                [newModuleName]: `// Structural Cell [${newModuleName}] handled via Top inline vector slice assignments.`
            }));
            return;
        }
        setCustomCodes(prev => {
            const portDecls = [];
            parsedInputs.forEach(p => portDecls.push(`  input wire ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
            parsedOutputs.forEach(p => portDecls.push(`  output logic ${p.width > 1 ? `[${p.msb}:${p.lsb}] ` : ''}${p.name}`));
            let code = `module ${newModuleName} (\n${portDecls.join(',\n')}\n);\n\n${conf.code}\n\nendmodule\n`;
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
    }, [setCenter, setNodes, setSearchHighlightIds, setSelectedNodeId, setSelectedEdgeId, setGlowingNet]);

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
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 600,
        border: `1px solid ${t.border}`,
        borderRadius: '10px',
        background: `linear-gradient(180deg, ${t.bgSecondary} 0%, ${t.bgTertiary} 100%)`,
        color: t.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        minHeight: '34px',
        boxSizing: 'border-box',
        backdropFilter: 'blur(8px)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px ${t.shadow}`,
        width: 'auto',  // override iconBtn
        height: 'auto'  // override iconBtn
    }


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
        <div style={s.app}>
            {/* HEADER */}
            <Header s={s} theme={theme} t={t} nodes={nodes} warnings={warnings} edges={edges} undo={undo} toolbarBtn={toolbarBtn} past={past} redo={redo} future={future} handleLoadWorkspace={handleLoadWorkspace} handleSaveWorkspace={handleSaveWorkspace} fileInputRef={fileInputRef} setShowClearModal={setShowClearModal} setShowHelp={setShowHelp} setTheme={setTheme} helpColors={helpColors} arrangeTopologicalLayout={arrangeTopologicalLayout} />

            {/* CONTEXTUAL MODAL (NODE / EDGE CONFIG) */}
            <ContextualModal activeModal={activeModal} modalPos={modalPos} nodes={nodes} edges={edges} theme={theme} t={t} s={s} modalTab={modalTab} setModalTab={setModalTab} exposedPorts={exposedPorts} currentModuleCode={currentModuleCode} handleModalDragStart={handleModalDragStart} setActiveModal={setActiveModal} updateSelectedNode={updateSelectedNode} togglePortSwap={togglePortSwap} toggleExposePort={toggleExposePort} handleCodeChange={handleCodeChange} getPortLabel={getPortLabel} parsePorts={parsePorts} recordHistory={recordHistory} setNodes={setNodes} setEdges={setEdges} setSelectedNodeId={setSelectedNodeId} setSelectedEdgeId={setSelectedEdgeId} setGlowingNet={setGlowingNet} highlightVerilogCode={highlightVerilogCode} />

            {/* CLEAR MODAL */}
            <ClearModal showClearModal={showClearModal} theme={theme} setShowClearModal={setShowClearModal} t={t} handleClearAll={handleClearAll} s={s} />

            {/* SAVE MODAL */}
            <SaveModal theme={theme} setShowSaveModal={setShowSaveModal} setProposedFileName={setProposedFileName} proposedFileName={proposedFileName} executeActualDownload={executeActualDownload} showSaveModal={showSaveModal} t={t} s={s} />

            {/* HELP MODAL */}
            <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} t={t} theme={theme} kbdStyle={kbdStyle} />

            {/* ERROR MODAL */}
            <ErrorModal errorModal={errorModal} theme={theme} setErrorModal={setErrorModal} t={t} s={s} />

            {/* MAIN LAYOUT */}
            <div style={s.main} ref={mainRef}>
                <LeftPanel leftCollapsed={leftCollapsed} setLeftTab={setLeftTab} setLeftCollapsed={setLeftCollapsed} leftTab={leftTab} theme={theme} t={t} s={s} leftWidth={leftWidth} setIsLibOpen={setIsLibOpen} createBlock={createBlock} setSelectedStandardBlock={setSelectedStandardBlock} spawnPrebuilt={spawnPrebuilt} selectedStandardBlock={selectedStandardBlock} setSelectedEdgeId={setSelectedEdgeId} setSelectedNodeId={setSelectedNodeId} isLibOpen={isLibOpen} newModuleName={newModuleName} setNewModuleName={setNewModuleName} setNewInputs={setNewInputs} setNewOutputs={setNewOutputs} nodes={nodes} edges={edges} newInputs={newInputs} newOutputs={newOutputs} exposedPorts={exposedPorts} setCenter={setCenter} setNodes={setNodes} searchInputRef={searchInputRef} moduleSearchQuery={moduleSearchQuery} setModuleSearchFocusIdx={setModuleSearchFocusIdx} jumpToNode={jumpToNode} setSearchHighlightIds={setSearchHighlightIds} setModuleSearchQuery={setModuleSearchQuery} handleModuleSearchKey={handleModuleSearchKey} moduleSearchResults={moduleSearchResults} moduleSearchFocusIdx={moduleSearchFocusIdx} hierarchyExpanded={hierarchyExpanded} hierarchyResults={hierarchyResults} setHierarchyExpanded={setHierarchyExpanded} setHierarchyResults={setHierarchyResults} setHierarchySearchQuery={setHierarchySearchQuery} hierarchySearchQuery={hierarchySearchQuery} hierarchyInputRef={hierarchyInputRef} highlightNetPath={highlightNetPath} buildHierarchyResult={buildHierarchyResult} />
                {!leftCollapsed && <ResizeHandle onMouseDown={onMouseDownLeft} isDragging={draggingLeft} />}
                <Canvas nodes={nodes} edges={edges} onNodeClick={onNodeClick} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onReconnect={onReconnect} onEdgeClick={onEdgeClick} onPaneClick={onPaneClick} edgeTypes={edgeTypes} nodeTypes={nodeTypes} recordHistory={recordHistory} ConnectionMode={ConnectionMode} t={t} s={s} />
                {!rightCollapsed && <ResizeHandle onMouseDown={onMouseDownRight} isDragging={draggingRight} />}
                <RightPanel s={s} setTopViewMode={setTopViewMode} setRightCollapsed={setRightCollapsed} rightCollapsed={rightCollapsed} topViewMode={topViewMode} t={t} theme={theme} renderTopSymbol={renderTopSymbol} structuralVerilogFull={structuralVerilogFull} testbenchCodeFull={testbenchCodeFull} copied={copied} handleCopyCode={handleCopyCode} rightWidth={rightWidth} />
            </div>
        </div>
    );
}
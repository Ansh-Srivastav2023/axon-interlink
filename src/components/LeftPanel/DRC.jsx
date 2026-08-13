// src/components/LeftPanel/DRC.jsx
import { useState } from 'react';
import { IconAlert, IconZap, IconCircleSlash, IconActivity } from '../../styles';
import { getEdgeEffectiveWidths, getSourceSlice, getTargetSlice, rangesOverlap } from '../../utils/edgeSlices';

const DRC = ({ nodes, edges, exposedPorts, theme, t, s, setSelectedNodeId, setSelectedEdgeId, setCenter, setNodes, performanceMode = false }) => {
    const [runSnapshot, setRunSnapshot] = useState(null);

    if (!nodes || !Array.isArray(nodes)) return null;
    const runIsCurrent =
        runSnapshot?.nodes === nodes &&
        runSnapshot?.edges === edges &&
        runSnapshot?.exposedPorts === exposedPorts;

    if (performanceMode && !runIsCurrent) {
        return (
            <div
                style={{
                    ...s.emptyState,
                    textAlign: 'left',
                    background: theme === 'dark' ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.12)',
                    border: `1px dashed ${theme === 'dark' ? 'rgba(245,158,11,0.35)' : 'rgba(217,119,6,0.35)'}`,
                    color: t.textSecondary,
                    lineHeight: 1.5,
                }}
            >
                <div style={{ color: '#f59e0b', fontWeight: 800, marginBottom: '6px' }}>
                    DRC paused for performance mode
                </div>
                <div style={{ marginBottom: '10px' }}>
                    Large designs skip continuous full-design DRC. Run it when you need a fresh check.
                </div>
                <button
                    type="button"
                    onClick={() => setRunSnapshot({ nodes, edges, exposedPorts })}
                    style={{
                        ...s.smallBtn,
                        borderColor: 'rgba(245,158,11,0.45)',
                        color: '#f59e0b',
                    }}
                >
                    Run DRC
                </button>
            </div>
        );
    }

    const activeAlerts = [];
    const safeEdges = edges || [];
    const instanceNameOwners = new Map();

    nodes.forEach((node) => {
        const instanceName = node?.data?.instanceName;
        if (!instanceName) return;
        if (!instanceNameOwners.has(instanceName)) {
            instanceNameOwners.set(instanceName, node);
            return;
        }
        activeAlerts.push({
            node,
            type: 'error',
            icon: <IconZap color="#ef4444" size={14} />,
            text: `Duplicate Instance Name: '${instanceName}' is used by multiple blocks. Generated Verilog requires unique instance names.`,
        });
    });

    safeEdges.forEach((edge) => {
        if (!edge) return;
        const srcNode = nodes.find((node) => node?.id === edge.source);
        const tgtNode = nodes.find((node) => node?.id === edge.target);
        if (!srcNode || !tgtNode) {
            activeAlerts.push({
                node: srcNode || tgtNode || nodes[0],
                edgeId: edge.id,
                type: 'error',
                icon: <IconAlert color="#ef4444" size={14} />,
                text: `Invalid Edge: '${edge.id || 'unnamed edge'}' references a missing block.`,
            });
            return;
        }
        const srcPort = (srcNode.data?.outputs || []).find((port) => port?.name === edge.sourceHandle);
        const tgtPort = (tgtNode.data?.inputs || []).find((port) => port?.name === edge.targetHandle);
        if (!srcPort || !tgtPort) {
            activeAlerts.push({
                node: tgtNode,
                edgeId: edge.id,
                type: 'error',
                icon: <IconAlert color="#ef4444" size={14} />,
                text: `Invalid Edge Port: '${edge.id || 'unnamed edge'}' references a port that no longer exists.`,
            });
        }
    });

    const topPortDirections = new Map();
    Object.values(exposedPorts || {}).forEach((port) => {
        if (!port) return;
        const topName = port.externalName || port.portName;
        const direction = port.isInput ? 'input' : 'output';
        const previous = topPortDirections.get(topName);
        if (previous && previous.direction !== direction) {
            const node = nodes.find((candidate) => candidate?.id === port.nodeId) || previous.node;
            activeAlerts.push({
                node,
                type: 'error',
                icon: <IconZap color="#ef4444" size={14} />,
                text: `Top Port Conflict: '${topName}' is exposed as both input and output.`,
            });
        } else {
            topPortDirections.set(topName, {
                direction,
                node: nodes.find((candidate) => candidate?.id === port.nodeId),
            });
        }
    });

    // Step 1: Check each node's ports
    nodes.forEach((node) => {
        if (!node || !node.data) return;
        const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);
        if (isSplitterOrBundler) return;

        const nodeTieoffs = node.data.tieoffs || {};
        const nodeAutoRoute = node.data.autoRoute || {};
        const nodeInputs = node.data.inputs || [];
        const nodeOutputs = node.data.outputs || [];

        nodeInputs.forEach((port) => {
            if (!port || !port.name) return;
            const connected = safeEdges.filter(
                (e) => e && e.target === node.id && e.targetHandle === port.name
            );
            const tieoff = nodeTieoffs[port.name];
            const autoRoute = nodeAutoRoute[port.name];
            const isExposed = exposedPorts && exposedPorts[`${node.id}__${port.name}`];

            if (connected.length > 0 && tieoff) {
                activeAlerts.push({
                    node,
                    type: 'error',
                    icon: <IconZap color="#ef4444" size={14} />,
                    text: `Input Conflict: ${node.data.instanceName || 'Block'}.${port.name} is wired and tied to ${tieoff}.`,
                });
            }
            if (connected.length > 0 && autoRoute) {
                activeAlerts.push({
                    node,
                    type: 'error',
                    icon: <IconZap color="#ef4444" size={14} />,
                    text: `Input Conflict: ${node.data.instanceName || 'Block'}.${port.name} is wired and auto-routed.`,
                });
            }

            if (connected.length === 0 && !tieoff && !autoRoute && !isExposed) {
                activeAlerts.push({
                    node,
                    type: 'error',
                    icon: <IconAlert color="#ef4444" size={14} />,
                    text: `Floating Input: ${node.data.instanceName || 'Block'}.${port.name} is undriven.`,
                });
            }
            if (connected.length > 1) {
                const slices = connected.map((edge) => getTargetSlice(edge, port));
                const hasFullPortDriver = slices.some((slice) => !slice);
                const hasOverlap = slices.some((slice, sliceIndex) =>
                    slices.some((otherSlice, otherIndex) => sliceIndex !== otherIndex && rangesOverlap(slice, otherSlice))
                );
                if (hasFullPortDriver || hasOverlap) {
                    activeAlerts.push({
                        node,
                        type: 'error',
                        icon: <IconZap color="#ef4444" size={14} />,
                        text: `Bus Short: Multiple drivers overlap on ${node.data.instanceName || 'Block'}.${port.name}.`,
                    });
                }
            }
            if (connected.length > 0 && port.width > 1) {
                const coveredBits = new Set();
                connected.forEach((edge) => {
                    const slice = getTargetSlice(edge, port) || { lsb: 0, msb: port.width - 1 };
                    for (let bit = slice.lsb; bit <= slice.msb; bit += 1) coveredBits.add(bit);
                });
                if (coveredBits.size < port.width) {
                    activeAlerts.push({
                        node,
                        edgeId: connected[0]?.id,
                        type: 'warn',
                        icon: <IconActivity color="#f59e0b" size={14} />,
                        text: `Partial Input: ${node.data.instanceName || 'Block'}.${port.name} drives ${coveredBits.size}/${port.width} bits. Unwired bits stay high-Z.`,
                    });
                }
            }
        });

        nodeOutputs.forEach((port) => {
            if (!port || !port.name) return;
            const connected = safeEdges.filter(
                (e) => e && e.source === node.id && e.sourceHandle === port.name
            );
            const isExposed = exposedPorts && exposedPorts[`${node.id}__${port.name}`];
            if (connected.length === 0 && !isExposed) {
                activeAlerts.push({
                    node,
                    type: 'warn',
                    icon: <IconCircleSlash color="#9ca3af" size={14} />,
                    text: `Unused Output: ${node.data.instanceName || 'Block'}.${port.name} drops into a dead end.`,
                });
            }
        });
    });

    // Step 2: Width mismatches
    const safeEdgesForMismatches = edges || [];
    safeEdgesForMismatches.forEach((edge) => {
        if (!edge || !edge.source || !edge.target) return;
        const srcNode = nodes.find((n) => n && n.id === edge.source);
        const tgtNode = nodes.find((n) => n && n.id === edge.target);
        if (!srcNode || !tgtNode || !srcNode.data || !tgtNode.data) return;

        const srcPort = (srcNode.data.outputs || []).find(
            (p) => p && p.name === edge.sourceHandle
        );
        const tgtPort = (tgtNode.data.inputs || []).find(
            (p) => p && p.name === edge.targetHandle
        );
        const sourceSlice = getSourceSlice(edge, srcPort);
        const targetSlice = getTargetSlice(edge, tgtPort);
        if (edge.data?.sourceSlice && !sourceSlice) {
            activeAlerts.push({
                node: srcNode,
                edgeId: edge.id,
                type: 'error',
                icon: <IconAlert color="#ef4444" size={14} />,
                text: `Invalid Slice: ${srcNode.data.instanceName || 'u'}.${srcPort.name} source slice is outside the port range.`,
            });
            return;
        }
        if (edge.data?.targetSlice && !targetSlice) {
            activeAlerts.push({
                node: tgtNode,
                edgeId: edge.id,
                type: 'error',
                icon: <IconAlert color="#ef4444" size={14} />,
                text: `Invalid Slice: ${tgtNode.data.instanceName || 'u'}.${tgtPort.name} target slice is outside the port range.`,
            });
            return;
        }

        const { sourceWidth, targetWidth } = getEdgeEffectiveWidths(edge, srcPort, tgtPort);
        if (srcPort && tgtPort && sourceWidth !== targetWidth) {
            activeAlerts.push({
                node: tgtNode,
                edgeId: edge.id,
                type: 'mismatch',
                icon: <IconActivity color="#f59e0b" size={14} />,
                text: `Width Mismatch: ${srcNode.data.instanceName || 'u'}.${srcPort.name} (${srcPort.width}b) → ${tgtNode.data.instanceName || 'u'}.${tgtPort.name} (${tgtPort.width}b).`,
            });
        }
    });

    // Render
    if (activeAlerts.length === 0) {
        return (
            <div
                style={{
                    ...s.emptyState,
                    background: theme === 'dark' ? '#041e12' : '#f0fdf4',
                    border: `1px dashed ${theme === 'dark' ? '#10b981' : '#bbf7d0'}`,
                    color: theme === 'dark' ? '#34d399' : '#15803d',
                    fontFamily: 'monospace'
                }}
            >
                ✨ All clean! Netlist passes structural verification checks perfectly.
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '4px',
                scrollbarWidth: 'thin',
                scrollbarColor:
                    theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6',
            }}
        >
            {activeAlerts.map((alert, idx) => {
                if (!alert || !alert.node) return null;
                const targetNodeId = alert.node.id;

                const handleAlertClick = () => {
                    setSelectedNodeId(targetNodeId);
                    setSelectedEdgeId(alert.edgeId || null);
                    if (alert.node.position) {
                        const posX = alert.node.position.x ?? 0;
                        const posY = alert.node.position.y ?? 0;
                        setCenter(posX + 90, posY + 60, { zoom: 1.2, duration: 400 });
                        setNodes((nds) =>
                            nds.map((n) =>
                                n.id === targetNodeId
                                    ? { ...n, data: { ...n.data, isDrcFlashing: true } }
                                    : n
                            )
                        );
                        setTimeout(() => {
                            setNodes((nds) =>
                                nds.map((n) =>
                                    n.id === targetNodeId
                                        ? { ...n, data: { ...n.data, isDrcFlashing: false } }
                                        : n
                                )
                            );
                        }, 1600);
                    }
                };

                const borderColor = alert.type === 'error' ? '#ef4444' : '#f59e0b';
                return (
                    <div
                        key={idx}
                        onClick={handleAlertClick}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.6)',
                            border: `1px solid ${theme === 'dark' ? '#222222' : '#e5e7eb'}`,
                            transition: 'all 0.15s ease',
                            backdropFilter: 'blur(4px)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = borderColor;
                            e.currentTarget.style.background =
                                theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                                theme === 'dark' ? '#222222' : '#e5e7eb';
                            e.currentTarget.style.background =
                                theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.6)';
                        }}
                    >
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                            {alert.icon}
                        </div>
                        <div
                            style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                lineHeight: '1.4',
                                color: alert.type === 'error' ? '#ef4444' : t.text,
                            }}
                        >
                            {alert.text}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DRC;

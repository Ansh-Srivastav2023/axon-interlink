import {
    IconAlert, IconZap, IconCircleSlash, IconActivity,
    IconGrid, IconSearch, IconTrace,
    IconChevronRight, IconChevronLeft,
} from '../styles';
import { STANDARD_LIBRARY } from '../utils/hardwareutils';

// Tab configuration for header and collapsed icons
const TABS = [
    ['library', IconGrid, 'Library'],
    ['search', IconSearch, 'Search'],
    ['trace', IconTrace, 'Trace'],
];

// Reusable hover effects for buttons
const hoverScaleShadow = (e, scale = 1.12, shadowColor = 'rgba(99, 7, 247, 0.7)') => {
    e.currentTarget.style.transform = `scale(${scale})`;
    e.currentTarget.style.boxShadow = `0px 0px 20px ${shadowColor}`;
    e.currentTarget.style.filter = 'brightness(1.2)';
};

const unhoverScaleShadow = (e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.filter = 'brightness(1)';
};

const LeftPanel = ({
    leftCollapsed,
    setLeftTab,
    setLeftCollapsed,
    leftTab,
    theme,
    t,
    s,
    newInputs,
    newOutputs,
    leftWidth,
    setIsLibOpen,
    createBlock,
    setSelectedStandardBlock,
    spawnPrebuilt,
    selectedStandardBlock,
    setSelectedEdgeId,
    setSelectedNodeId,
    isLibOpen,
    newModuleName,
    setNewModuleName,
    setNewInputs,
    setNewOutputs,
    nodes,
    edges,
    exposedPorts,
    setCenter,
    setNodes,
    searchInputRef,
    moduleSearchQuery,
    setModuleSearchFocusIdx,
    jumpToNode,
    setSearchHighlightIds,
    setModuleSearchQuery,
    handleModuleSearchKey,
    moduleSearchResults,
    moduleSearchFocusIdx,
    hierarchyExpanded,
    hierarchyResults,
    setHierarchyExpanded,
    setHierarchyResults,
    setHierarchySearchQuery,
    hierarchySearchQuery,
    hierarchyInputRef,
    highlightNetPath,          // passed from parent
    buildHierarchyResult,
}) => {
    // ===== Collapsed view (icon bar) =====
    const renderCollapsed = () => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '14px',
                gap: '16px',
                height: '100%',
                boxSizing: 'border-box',
            }}
        >
            {TABS.map(([tab, Icon, label]) => (
                <button
                    key={tab}
                    onClick={() => {
                        setLeftTab(tab);
                        setLeftCollapsed(false);
                    }}
                    onMouseEnter={hoverScaleShadow}
                    onMouseLeave={unhoverScaleShadow}
                    style={{
                        padding: '8px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: 'none',
                        background:
                            leftTab === tab
                                ? 'linear-gradient(90deg, #2563EB, #6D28D9)'
                                : 'transparent',
                        color: leftTab === tab ? '#fff' : t.textSecondary,
                        transition: 'all 0.2s ease',
                    }}
                    title={label}
                >
                    <Icon size={18} />
                </button>
            ))}
            <button
                onClick={() => setLeftCollapsed(false)}
                className={`sidebar-expand-btn ${theme === 'dark' ? 'dark' : 'light'}`}
                style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: 0,
                    background: 'linear-gradient(90deg, #1179f9, #4a10fa)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.3s ease',
                }}
                title="Expand panel"
            >
                <IconChevronRight
                    size={20}
                    style={{
                        transition: 'transform 0.3s ease',
                        transform: 'translateX(1px)',
                    }}
                />
            </button>
        </div>
    );

    // ===== Expanded view header (tabs + collapse) =====
    const renderHeader = () => (
        <div style={s.panelHeader}>
            <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                {TABS.map(([tab, Icon, label]) => (
                    <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        title={label}
                        onMouseEnter={hoverScaleShadow}
                        onMouseLeave={unhoverScaleShadow}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            fontSize: '12px',
                            borderRadius: '5px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            background:
                                leftTab === tab
                                    ? 'linear-gradient(90deg, #2563EB, #6D28D9)'
                                    : 'transparent',
                            color: leftTab === tab ? '#fff' : t.textSecondary,
                        }}
                    >
                        <Icon size={14} />
                        <span style={{ display: leftWidth < 260 ? 'none' : 'inline' }}>
                            {label}
                        </span>
                    </button>
                ))}
            </div>
            <button
                onClick={() => setLeftCollapsed(true)}
                onMouseEnter={hoverScaleShadow}
                onMouseLeave={unhoverScaleShadow}
                style={{
                    ...s.iconBtn,
                    marginLeft: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(90deg, #6e01dc, #23dcdc)',
                    color: '#fff',
                    border: 'none',
                    transition: 'all 0.2s',
                }}
                title="Collapse"
            >
                <IconChevronLeft size={14} />
            </button>
        </div>
    );

    // ===== Design Rule Check (DRC) – extracted logic =====
    const renderDRC = () => {
        const activeAlerts = [];
        if (!nodes || !Array.isArray(nodes)) return null;

        nodes.forEach((node) => {
            if (!node || !node.data) return;
            const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);
            if (isSplitterOrBundler) return;

            const nodeTieoffs = node.data.tieoffs || {};
            const nodeAutoRoute = node.data.autoRoute || {};
            const nodeInputs = node.data.inputs || [];
            const nodeOutputs = node.data.outputs || [];
            const safeEdges = edges || [];

            nodeInputs.forEach((port) => {
                if (!port || !port.name) return;
                const connected = safeEdges.filter(
                    (e) => e && e.target === node.id && e.targetHandle === port.name
                );
                const tieoff = nodeTieoffs[port.name];
                const autoRoute = nodeAutoRoute[port.name];
                const isExposed = exposedPorts && exposedPorts[`${node.id}__${port.name}`];

                if (connected.length === 0 && !tieoff && !autoRoute && !isExposed) {
                    activeAlerts.push({
                        node,
                        type: 'error',
                        icon: <IconAlert color="#ef4444" size={14} />,
                        text: `Floating Input: ${node.data.instanceName || 'Block'}.${port.name} is undriven.`,
                    });
                }
                if (connected.length > 1) {
                    activeAlerts.push({
                        node,
                        type: 'error',
                        icon: <IconZap color="#ef4444" size={14} />,
                        text: `Bus Short: Multiple drivers connected to ${node.data.instanceName || 'Block'}.${port.name}.`,
                    });
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
            if (srcPort && tgtPort && srcPort.width !== tgtPort.width) {
                activeAlerts.push({
                    node: tgtNode,
                    edgeId: edge.id,
                    type: 'mismatch',
                    icon: <IconActivity color="#f59e0b" size={14} />,
                    text: `Width Mismatch: ${srcNode.data.instanceName || 'u'}.${srcPort.name} (${srcPort.width}b) → ${tgtNode.data.instanceName || 'u'}.${tgtPort.name} (${tgtPort.width}b).`,
                });
            }
        });

        if (activeAlerts.length === 0) {
            return (
                <div
                    style={{
                        ...s.emptyState,
                        background: theme === 'dark' ? '#041e12' : '#f0fdf4',
                        border: `1px dashed ${theme === 'dark' ? '#10b981' : '#bbf7d0'}`,
                        color: theme === 'dark' ? '#34d399' : '#15803d',
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
                                background: theme === 'dark' ? '#0a0a0a' : '#f8fafc',
                                border: `1px solid ${theme === 'dark' ? '#222222' : '#e5e7eb'}`,
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = borderColor;
                                e.currentTarget.style.background =
                                    theme === 'dark' ? '#111111' : '#f1f5f9';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                    theme === 'dark' ? '#222222' : '#e5e7eb';
                                e.currentTarget.style.background =
                                    theme === 'dark' ? '#0a0a0a' : '#f8fafc';
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

    // ===== Library tab content =====
    const renderLibrary = () => (
        <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Standard Cell Library
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <button
                            onClick={() => setIsLibOpen(!isLibOpen)}
                            style={{
                                ...s.input,
                                width: '100%',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: theme === 'dark' ? '#050505' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#111827',
                                border: `1px solid ${theme === 'dark' ? '#333333' : '#cbd5e1'}`,
                            }}
                        >
                            <span>{selectedStandardBlock}</span>
                            <span style={{ marginLeft: '8px' }}>▼</span>
                        </button>
                        {isLibOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                                    border: `1px solid ${theme === 'dark' ? '#333333' : '#cbd5e1'}`,
                                    borderRadius: '6px',
                                    zIndex: 1000,
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                                }}
                            >
                                {Object.keys(STANDARD_LIBRARY).map((key) => (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setSelectedStandardBlock(key);
                                            setIsLibOpen(false);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            background:
                                                key === selectedStandardBlock
                                                    ? theme === 'dark'
                                                        ? '#1a2744'
                                                        : '#e0edff'
                                                    : 'transparent',
                                            color: theme === 'dark' ? '#ffffff' : '#111827',
                                            borderBottom: `1px solid ${theme === 'dark' ? '#222222' : '#e5e7eb'}`,
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                                theme === 'dark' ? '#1a1a2e' : '#f3f4f6';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                                key === selectedStandardBlock
                                                    ? theme === 'dark'
                                                        ? '#1a2744'
                                                        : '#e0edff'
                                                    : 'transparent';
                                        }}
                                    >
                                        {key}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => spawnPrebuilt(selectedStandardBlock)}
                        onMouseEnter={hoverScaleShadow}
                        onMouseLeave={unhoverScaleShadow}
                        style={{
                            ...s.smallBtn,
                            color: '#fff',
                            background: 'linear-gradient(90deg, #d92828, #9225eb)',
                            border: 'none',
                            fontWeight: 800,
                        }}
                    >
                        + Add
                    </button>
                </div>
            </div>

            <div style={s.divider} />

            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Custom Instantiation
                </div>
                <form onSubmit={createBlock} style={s.form}>
                    <div style={s.formGroup}>
                        <label style={s.label}>Module Definition Name</label>
                        <input
                            value={newModuleName}
                            onChange={(e) => setNewModuleName(e.target.value)}
                            style={s.input}
                        />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Input Port List</label>
                        <input
                            value={newInputs}
                            onChange={(e) => setNewInputs(e.target.value)}
                            style={s.input}
                        />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Output Port List</label>
                        <input
                            value={newOutputs}
                            onChange={(e) => setNewOutputs(e.target.value)}
                            style={s.input}
                        />
                    </div>
                    <button
                        type="submit"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow =
                                '0px 0px 20px rgba(99, 7, 247, 0.7)';
                            e.currentTarget.style.filter = 'brightness(1.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.filter = 'brightness(1)';
                        }}
                        style={{
                            ...s.primaryBtn,
                            opacity: newModuleName.trim() ? 1 : 0.4,
                            cursor: newModuleName.trim() ? 'pointer' : 'not-allowed',
                            background: newModuleName.trim()
                                ? 'linear-gradient(90deg, #9c25eb, #d92828)'
                                : 'transparent',
                            color: '#fff',
                            transition:
                                'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease',
                            willChange: 'transform',
                            fontWeight: 700,
                        }}
                    >
                        Instantiate Hardware Block
                    </button>
                </form>
            </div>

            <div style={s.divider} />

            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Design Rule Check (DRC)
                </div>
                {renderDRC()}
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
    );

    // ===== Search tab content =====
    const renderSearch = () => (
        <div
            style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Module Search
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        autoFocus
                        ref={searchInputRef}
                        value={moduleSearchQuery}
                        onChange={(e) => {
                            setModuleSearchQuery(e.target.value);
                            setModuleSearchFocusIdx(0);
                            setSearchHighlightIds(new Set());
                        }}
                        onKeyDown={handleModuleSearchKey}
                        placeholder="Search by module or instance name…"
                        style={{
                            ...s.input,
                            width: '100%',
                            boxSizing: 'border-box',
                            paddingRight: moduleSearchQuery ? '28px' : '10px',
                        }}
                    />
                    {moduleSearchQuery && (
                        <button
                            onClick={() => {
                                setModuleSearchQuery('');
                                setSearchHighlightIds(new Set());
                            }}
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: t.textMuted,
                                fontSize: '14px',
                                lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
                {moduleSearchQuery.trim() && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: t.textMuted }}>
                        {moduleSearchResults.length} result
                        {moduleSearchResults.length !== 1 ? 's' : ''} · ↑↓ navigate · Enter to
                        jump
                    </div>
                )}
            </div>

            {moduleSearchResults.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '0 14px 14px',
                    }}
                >
                    {moduleSearchResults.map((node, idx) => {
                        const isFocused = idx === moduleSearchFocusIdx;
                        const inputCount = (node.data.inputs || []).length;
                        const outputCount = (node.data.outputs || []).length;
                        const driverCount = edges.filter(
                            (e) => e.target === node.id
                        ).length;
                        const fanoutCount = edges.filter(
                            (e) => e.source === node.id
                        ).length;

                        return (
                            <div
                                key={node.id}
                                onClick={() => {
                                    setModuleSearchFocusIdx(idx);
                                    jumpToNode(node);
                                }}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    border: `1px solid ${isFocused ? t.primary : t.border}`,
                                    background: isFocused
                                        ? theme === 'dark'
                                            ? '#0a1628'
                                            : '#eff6ff'
                                        : t.bgTertiary,
                                    transition: 'border-color 0.12s, background 0.12s',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            color: t.textHeading,
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        {node.data.moduleName}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: '#10b981',
                                            background:
                                                theme === 'dark' ? '#052e1c' : '#d1fae5',
                                            borderRadius: '3px',
                                            padding: '1px 5px',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        ⊞ Jump
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: t.textSecondary,
                                        fontFamily: 'monospace',
                                        marginTop: '2px',
                                    }}
                                >
                                    {node.data.instanceName}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '6px',
                                        fontSize: '10px',
                                        color: t.textMuted,
                                    }}
                                >
                                    <span>
                                        ↳ {inputCount}in / {outputCount}out
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                driverCount > 0 ? '#10b981' : t.textMuted,
                                        }}
                                    >
                                        ▶ {driverCount} driver
                                        {driverCount !== 1 ? 's' : ''}
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                fanoutCount > 0 ? '#f59e0b' : t.textMuted,
                                        }}
                                    >
                                        ⇥ {fanoutCount} fanout
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {moduleSearchQuery.trim() && moduleSearchResults.length === 0 && (
                <div style={{ ...s.emptyState, margin: '0 14px' }}>
                    No modules match <code style={{ fontFamily: 'monospace' }}>
                        "{moduleSearchQuery}"
                    </code>
                </div>
            )}
            {!moduleSearchQuery.trim() && (
                <div
                    style={{
                        ...s.emptyState,
                        margin: '0 14px',
                        lineHeight: 1.7,
                    }}
                >
                    Type a module or instance name to search.
                    <br />
                    <span style={{ color: t.textMuted, fontSize: '11px' }}>
                        Results highlight & jump on canvas.
                    </span>
                </div>
            )}
        </div>
    );

    // ===== Trace tab content =====
    const renderTrace = () => (
        <div
            style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Hierarchy / Net Trace
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        ref={hierarchyInputRef}
                        value={hierarchySearchQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setHierarchySearchQuery(val);
                            buildHierarchyResult(val);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setHierarchySearchQuery('');
                                setHierarchyResults(null);
                            }
                        }}
                        placeholder="Trace by module or instance…"
                        style={{
                            ...s.input,
                            width: '100%',
                            boxSizing: 'border-box',
                            paddingRight: hierarchySearchQuery ? '28px' : '10px',
                        }}
                    />
                    {hierarchySearchQuery && (
                        <button
                            onClick={() => {
                                setHierarchySearchQuery('');
                                setHierarchyResults(null);
                            }}
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: t.textMuted,
                                fontSize: '14px',
                                lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '5px' }}>
                    Shows drivers, fanout, and unconnected nets.
                </div>
            </div>

            {hierarchyResults === null && (
                <div
                    style={{
                        ...s.emptyState,
                        margin: '0 14px',
                        lineHeight: 1.7,
                    }}
                >
                    Enter a module name above to live trace.
                    <br />
                    <span style={{ fontSize: '11px', color: t.textMuted }}>
                        Click any driver/fanout row to jump and highlight that net on canvas.
                    </span>
                </div>
            )}

            {hierarchyResults !== null && hierarchyResults.length === 0 && (
                <div style={{ ...s.emptyState, margin: '0 14px' }}>
                    No modules found for <code>"{hierarchySearchQuery}"</code>
                </div>
            )}

            {hierarchyResults !== null && hierarchyResults.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '0 14px 14px',
                    }}
                >
                    {hierarchyResults.map(
                        ({ node, drivers, fanoutByPort, unconnectedInputs }) => {
                            const key = node.id;
                            const isOpen = !!hierarchyExpanded[key];

                            return (
                                <div
                                    key={key}
                                    style={{
                                        border: `1px solid ${t.borderStrong}`,
                                        borderRadius: '7px',
                                        overflow: 'hidden',
                                        background: t.bgTertiary,
                                    }}
                                >
                                    <div
                                        onClick={() =>
                                            setHierarchyExpanded((p) => ({
                                                ...p,
                                                [key]: !p[key],
                                            }))
                                        }
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '9px 12px',
                                            cursor: 'pointer',
                                            background: t.bgSecondary,
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    color: t.textHeading,
                                                    fontFamily: 'monospace',
                                                }}
                                            >
                                                {node.data.moduleName}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '10px',
                                                    color: t.textSecondary,
                                                    fontFamily: 'monospace',
                                                }}
                                            >
                                                {node.data.instanceName}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '5px',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '10px',
                                                    color: '#10b981',
                                                    background:
                                                        theme === 'dark'
                                                            ? '#052e1c'
                                                            : '#d1fae5',
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                }}
                                            >
                                                {drivers.length}▲
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '10px',
                                                    color: '#f59e0b',
                                                    background:
                                                        theme === 'dark'
                                                            ? '#1c1000'
                                                            : '#fef3c7',
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                }}
                                            >
                                                {Object.values(fanoutByPort)
                                                    .flat()
                                                    .length}
                                                ▼
                                            </span>
                                            {unconnectedInputs.length > 0 && (
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        color: '#ef4444',
                                                        background:
                                                            theme === 'dark'
                                                                ? '#1c0000'
                                                                : '#fee2e2',
                                                        padding: '1px 5px',
                                                        borderRadius: '3px',
                                                    }}
                                                >
                                                    ⚠{unconnectedInputs.length}
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    color: t.textMuted,
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {isOpen ? '▾' : '▸'}
                                            </span>
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                            }}
                                        >
                                            {drivers.length > 0 && (
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#10b981',
                                                            marginBottom: '4px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                        }}
                                                    >
                                                        ▲ Drivers (inputs)
                                                    </div>
                                                    {drivers.map((d) => (
                                                        <div
                                                            key={d.edgeId}
                                                            onClick={() =>
                                                                highlightNetPath(
                                                                    d.edgeId,
                                                                    d.sourceNodeId
                                                                )
                                                            }
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent:
                                                                    'space-between',
                                                                padding: '5px 8px',
                                                                marginBottom: '3px',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                background: t.bg,
                                                                border: `1px solid ${t.border}`,
                                                                transition:
                                                                    'background 0.1s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background =
                                                                    theme === 'dark'
                                                                        ? '#111'
                                                                        : '#f0f4ff';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background =
                                                                    t.bg;
                                                            }}
                                                        >
                                                            <div>
                                                                <div
                                                                    style={{
                                                                        fontSize: '11px',
                                                                        fontFamily:
                                                                            'monospace',
                                                                        color: t
                                                                            .textHeading,
                                                                    }}
                                                                >
                                                                    {d.srcInstanceName}
                                                                    <span
                                                                        style={{
                                                                            color: t
                                                                                .textMuted,
                                                                        }}
                                                                    >
                                                                        .{d.sourceHandle}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        color: t
                                                                            .textMuted,
                                                                    }}
                                                                >
                                                                    → .{d.targetHandle}
                                                                </div>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: '10px',
                                                                    color:
                                                                        d.bitWidth > 1
                                                                            ? '#6366f1'
                                                                            : t.textMuted,
                                                                    fontFamily:
                                                                        'monospace',
                                                                }}
                                                            >
                                                                {d.bitWidth > 1
                                                                    ? `[${d.bitWidth - 1}:0]`
                                                                    : '1b'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {Object.keys(fanoutByPort).length > 0 && (
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#f59e0b',
                                                            marginBottom: '4px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                        }}
                                                    >
                                                        ▼ Fanout (outputs)
                                                    </div>
                                                    {Object.entries(fanoutByPort).map(
                                                        ([port, fans]) => (
                                                            <div
                                                                key={port}
                                                                style={{
                                                                    marginBottom: '6px',
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        color: '#f59e0b',
                                                                        fontFamily:
                                                                            'monospace',
                                                                        fontWeight: 600,
                                                                        padding: '2px 0 4px 6px',
                                                                    }}
                                                                >
                                                                    .{port}{' '}
                                                                    <span
                                                                        style={{
                                                                            color: t
                                                                                .textMuted,
                                                                        }}
                                                                    >
                                                                        ({fans.length} load
                                                                        {fans.length !== 1
                                                                            ? 's'
                                                                            : ''})
                                                                    </span>
                                                                </div>
                                                                {fans.map((f) => (
                                                                    <div
                                                                        key={f.edgeId}
                                                                        onClick={() =>
                                                                            highlightNetPath(
                                                                                f.edgeId,
                                                                                f
                                                                                    .targetNodeId
                                                                            )
                                                                        }
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems:
                                                                                'center',
                                                                            justifyContent:
                                                                                'space-between',
                                                                            padding: '5px 8px',
                                                                            marginBottom:
                                                                                '3px',
                                                                            borderRadius:
                                                                                '4px',
                                                                            cursor: 'pointer',
                                                                            background: t
                                                                                .bg,
                                                                            border: `1px solid ${t.border}`,
                                                                            transition:
                                                                                'background 0.1s',
                                                                        }}
                                                                        onMouseEnter={(
                                                                            e
                                                                        ) => {
                                                                            e.currentTarget.style.background =
                                                                                theme ===
                                                                                    'dark'
                                                                                    ? '#111'
                                                                                    : '#fffbeb';
                                                                        }}
                                                                        onMouseLeave={(
                                                                            e
                                                                        ) => {
                                                                            e.currentTarget.style.background =
                                                                                t.bg;
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <div
                                                                                style={{
                                                                                    fontSize:
                                                                                        '11px',
                                                                                    fontFamily:
                                                                                        'monospace',
                                                                                    color: t
                                                                                        .textHeading,
                                                                                }}
                                                                            >
                                                                                {f
                                                                                    .tgtInstanceName}
                                                                                <span
                                                                                    style={{
                                                                                        color: t
                                                                                            .textMuted,
                                                                                    }}
                                                                                >
                                                                                    .{f
                                                                                        .targetHandle}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                fontSize:
                                                                                    '10px',
                                                                                color:
                                                                                    f.bitWidth >
                                                                                        1
                                                                                        ? '#6366f1'
                                                                                        : t
                                                                                            .textMuted,
                                                                                fontFamily:
                                                                                    'monospace',
                                                                            }}
                                                                        >
                                                                            {f
                                                                                .bitWidth >
                                                                                1
                                                                                ? `[${f
                                                                                    .bitWidth -
                                                                                1}:0]`
                                                                                : '1b'}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {unconnectedInputs.length > 0 && (
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#ef4444',
                                                            marginBottom: '4px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                        }}
                                                    >
                                                        ⚠ Floating Inputs
                                                    </div>
                                                    {unconnectedInputs.map((p) => (
                                                        <div
                                                            key={p.name}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent:
                                                                    'space-between',
                                                                padding: '4px 8px',
                                                                marginBottom: '2px',
                                                                borderRadius: '4px',
                                                                background:
                                                                    theme === 'dark'
                                                                        ? '#1c0000'
                                                                        : '#fff5f5',
                                                                border: `1px solid ${theme === 'dark'
                                                                    ? '#3a0000'
                                                                    : '#fca5a5'
                                                                    }`,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: '11px',
                                                                    fontFamily:
                                                                        'monospace',
                                                                    color: '#ef4444',
                                                                }}
                                                            >
                                                                .{p.name}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: '10px',
                                                                    color: t.textMuted,
                                                                    fontFamily:
                                                                        'monospace',
                                                                }}
                                                            >
                                                                {p.width > 1
                                                                    ? `${p.width}b`
                                                                    : '1b'}{' '}
                                                                undriven
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {drivers.length === 0 &&
                                                Object.keys(fanoutByPort).length ===
                                                0 &&
                                                unconnectedInputs.length === 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            color: t.textMuted,
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        No connectivity data — module
                                                        has no wired ports.
                                                    </div>
                                                )}

                                            <button
                                                onClick={() => {
                                                    const targetNodeId = node.id;
                                                    jumpToNode(node);
                                                    setNodes((nds) =>
                                                        nds.map((n) =>
                                                            n.id === targetNodeId
                                                                ? {
                                                                    ...n,
                                                                    data: {
                                                                        ...n
                                                                            .data,
                                                                        isDrcFlashing:
                                                                            true,
                                                                    },
                                                                }
                                                                : n
                                                        )
                                                    );
                                                    setTimeout(() => {
                                                        setNodes((nds) =>
                                                            nds.map((n) =>
                                                                n.id === targetNodeId
                                                                    ? {
                                                                        ...n,
                                                                        data: {
                                                                            ...n
                                                                                .data,
                                                                            isDrcFlashing:
                                                                                false,
                                                                        },
                                                                    }
                                                                    : n
                                                            )
                                                        );
                                                    }, 1600);
                                                }}
                                                style={{
                                                    ...s.smallBtn,
                                                    alignSelf: 'flex-start',
                                                    fontSize: '11px',
                                                    marginTop: '2px',
                                                }}
                                            >
                                                ⊞ Jump to block
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );

    // ============================
    // Main render
    // ============================
    if (leftCollapsed) {
        return <div style={s.leftPanel}>{renderCollapsed()}</div>;
    }

    return (
        <div style={s.leftPanel}>
            {renderHeader()}
            {leftTab === 'library' && renderLibrary()}
            {leftTab === 'search' && renderSearch()}
            {leftTab === 'trace' && renderTrace()}
        </div>
    );
};

export default LeftPanel;
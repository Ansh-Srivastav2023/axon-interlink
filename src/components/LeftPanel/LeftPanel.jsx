import { TABS } from './constants';
import LibraryTab from './LibraryTab';
import SearchTab from './SearchTab';
import TraceTab from './TraceTab';
import HierarchyTab from './HierarchyTab';

const ActivityBar = ({ leftTab, setLeftTab, leftCollapsed, setLeftCollapsed, theme, t }) => {
    const isDark = theme === 'dark';
    const railBg = isDark ? '#18181b' : '#f8fafc';
    const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';
    const activeColor = isDark ? '#ffffff' : '#111827';
    const inactiveColor = isDark ? '#8b949e' : '#64748b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)';

    const itemStyle = (isActive) => ({
        position: 'relative',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 0,
        background: 'transparent',
        color: isActive ? activeColor : inactiveColor,
        cursor: 'pointer',
        transition: 'background 0.12s ease, color 0.12s ease',
        padding: 0,
    });

    const hoverHandlers = {
        onMouseEnter: (e) => {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.color = activeColor;
        },
        onMouseLeave: (e) => {
            const isActive = e.currentTarget.dataset.active === 'true';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = isActive ? activeColor : inactiveColor;
        },
    };

    return (
        <div
            style={{
                width: '48px',
                minWidth: '48px',
                height: '100%',
                background: railBg,
                borderRight: `1px solid ${borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
            }}
        >
            {TABS.map(([tab, Icon, label]) => {
                const isActive = leftTab === tab;
                return (
                    <button
                        key={tab}
                        type="button"
                        data-active={isActive}
                        title={label}
                        onClick={() => {
                            if (leftTab === tab && !leftCollapsed) {
                                setLeftCollapsed(true);
                            } else {
                                setLeftTab(tab);
                                setLeftCollapsed(false);
                            }
                        }}
                        style={itemStyle(isActive)}
                        {...hoverHandlers}
                    >
                        {isActive && (
                            <span
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '8px',
                                    bottom: '8px',
                                    width: '2px',
                                    borderRadius: '0 2px 2px 0',
                                    background: t.primary || '#3b82f6',
                                }}
                            />
                        )}
                        <Icon size={21} />
                    </button>
                );
            })}
        </div>
    );
};

const LeftPanel = ({
    leftCollapsed,
    setLeftCollapsed,
    leftTab,
    setLeftTab,
    theme,
    t,
    s,
    setIsLibOpen,
    isLibOpen,
    selectedStandardBlock,
    setSelectedStandardBlock,
    spawnPrebuilt,
    createBlock,
    newModuleName,
    setNewModuleName,
    newInputs,
    setNewInputs,
    newOutputs,
    setNewOutputs,
    nodes,
    edges,
    exposedPorts,
    setCenter,
    setNodes,
    searchInputRef,
    moduleSearchQuery,
    setModuleSearchQuery,
    moduleSearchResults,
    moduleSearchFocusIdx,
    setModuleSearchFocusIdx,
    jumpToNode,
    setSearchHighlightIds,
    handleModuleSearchKey,
    hierarchyInputRef,
    hierarchySearchQuery,
    setHierarchySearchQuery,
    hierarchyResults,
    setHierarchyResults,
    hierarchyExpanded,
    setHierarchyExpanded,
    buildHierarchyResult,
    highlightNetPath,
    setSelectedNodeId,
    setSelectedEdgeId,
    customCodes,
    getModuleCode,
    onSaveCode,
    onImportVerilogFiles,
    importStatus,
    onDeleteModuleFile,
    projectModel,
    onCreateCanvas,
    onOpenCanvas,
    onInstantiateCanvas,
    onPromoteCurrentCanvas,
    onDeleteCanvas,
}) => {
    const renderContent = () => {
        if (leftCollapsed) return null;

        if (leftTab === 'library') {
            return (
                <LibraryTab
                    theme={theme}
                    t={t}
                    s={s}
                    isLibOpen={isLibOpen}
                    setIsLibOpen={setIsLibOpen}
                    selectedStandardBlock={selectedStandardBlock}
                    setSelectedStandardBlock={setSelectedStandardBlock}
                    spawnPrebuilt={spawnPrebuilt}
                    newModuleName={newModuleName}
                    setNewModuleName={setNewModuleName}
                    newInputs={newInputs}
                    setNewInputs={setNewInputs}
                    newOutputs={newOutputs}
                    setNewOutputs={setNewOutputs}
                    createBlock={createBlock}
                    nodes={nodes}
                    edges={edges}
                    exposedPorts={exposedPorts}
                    setSelectedNodeId={setSelectedNodeId}
                    setSelectedEdgeId={setSelectedEdgeId}
                    setCenter={setCenter}
                    setNodes={setNodes}
                />
            );
        }

        if (leftTab === 'project') {
            return (
                <HierarchyTab
                    theme={theme}
                    t={t}
                    s={s}
                    projectModel={projectModel}
                    nodes={nodes}
                    edges={edges}
                    onCreateCanvas={onCreateCanvas}
                    onOpenCanvas={onOpenCanvas}
                    onInstantiateCanvas={onInstantiateCanvas}
                    onPromoteCurrentCanvas={onPromoteCurrentCanvas}
                    onDeleteCanvas={onDeleteCanvas}
                    customCodes={customCodes}
                    getModuleCode={getModuleCode}
                    onSaveCode={onSaveCode}
                    jumpToNode={jumpToNode}
                    onImportVerilogFiles={onImportVerilogFiles}
                    importStatus={importStatus}
                    onDeleteModuleFile={onDeleteModuleFile}
                />
            );
        }

        if (leftTab === 'search') {
            return (
                <SearchTab
                    theme={theme}
                    t={t}
                    s={s}
                    searchInputRef={searchInputRef}
                    moduleSearchQuery={moduleSearchQuery}
                    setModuleSearchQuery={setModuleSearchQuery}
                    moduleSearchResults={moduleSearchResults}
                    moduleSearchFocusIdx={moduleSearchFocusIdx}
                    setModuleSearchFocusIdx={setModuleSearchFocusIdx}
                    jumpToNode={jumpToNode}
                    setSearchHighlightIds={setSearchHighlightIds}
                    handleModuleSearchKey={handleModuleSearchKey}
                    edges={edges}
                />
            );
        }

        return (
            <TraceTab
                t={t}
                s={s}
                nodes={nodes}
                edges={edges}
                exposedPorts={exposedPorts}
                hierarchyInputRef={hierarchyInputRef}
                hierarchySearchQuery={hierarchySearchQuery}
                setHierarchySearchQuery={setHierarchySearchQuery}
                hierarchyResults={hierarchyResults}
                setHierarchyResults={setHierarchyResults}
                hierarchyExpanded={hierarchyExpanded}
                setHierarchyExpanded={setHierarchyExpanded}
                buildHierarchyResult={buildHierarchyResult}
                highlightNetPath={highlightNetPath}
                jumpToNode={jumpToNode}
                setNodes={setNodes}
            />
        );
    };

    return (
        <div style={s.leftPanel}>
            <ActivityBar
                leftTab={leftTab}
                setLeftTab={setLeftTab}
                leftCollapsed={leftCollapsed}
                setLeftCollapsed={setLeftCollapsed}
                theme={theme}
                t={t}
            />
            {!leftCollapsed && (
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {renderContent()}
                </div>
            )}
        </div>
    );
};

export default LeftPanel;

// src/components/LeftPanel/index.js
import CollapsedView from './CollapsedView';
import Header from './Header';
import LibraryTab from './LibraryTab';
import SearchTab from './SearchTab';
import TraceTab from './TraceTab';

const LeftPanel = ({
    leftCollapsed,
    setLeftCollapsed,
    leftWidth,
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
}) => {
    if (leftCollapsed) {
        return (
            <div style={s.leftPanel}>
                <CollapsedView
                    theme={theme}
                    setLeftTab={setLeftTab}
                    setLeftCollapsed={setLeftCollapsed}
                />
            </div>
        );
    }

    return (
        <div style={s.leftPanel}>
            <Header
                leftTab={leftTab}
                setLeftTab={setLeftTab}
                leftWidth={leftWidth}
                setLeftCollapsed={setLeftCollapsed}
                theme={theme}
                t={t}
                s={s}
            />

            {leftTab === 'library' && (
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
            )}

            {leftTab === 'search' && (
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
            )}

            {leftTab === 'trace' && (
                <TraceTab
                    theme={theme}
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
            )}
        </div>
    );
};

export default LeftPanel;
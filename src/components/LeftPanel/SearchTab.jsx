// src/components/LeftPanel/SearchTab.jsx

const SearchTab = ({
    t, s,
    searchInputRef,
    moduleSearchQuery, setModuleSearchQuery,
    moduleSearchResults,
    moduleSearchFocusIdx, setModuleSearchFocusIdx,
    jumpToNode,
    setSearchHighlightIds,
    handleModuleSearchKey,
    edges,
}) => {
    const safeEdges = edges || [];

    return (
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
                        {moduleSearchResults.length !== 1 ? 's' : ''} · ↑↓ navigate · Enter to jump
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
                        if (!node || !node.data) return null;
                        const isFocused = idx === moduleSearchFocusIdx;
                        const inputCount = (node.data.inputs || []).length;
                        const outputCount = (node.data.outputs || []).length;
                        const driverCount = safeEdges.filter(
                            (e) => e && e.target === node.id
                        ).length;
                        const fanoutCount = safeEdges.filter(
                            (e) => e && e.source === node.id
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
                                    border: `1px solid ${isFocused ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                                    background: isFocused
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
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
                                            background: 'rgba(16, 185, 129, 0.1)',
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
                                            color: driverCount > 0 ? '#10b981' : t.textMuted,
                                        }}
                                    >
                                        ▶ {driverCount} driver{driverCount !== 1 ? 's' : ''}
                                    </span>
                                    <span
                                        style={{
                                            color: fanoutCount > 0 ? '#f59e0b' : t.textMuted,
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
};

export default SearchTab;
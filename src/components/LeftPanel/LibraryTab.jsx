// src/components/LeftPanel/LibraryTab.jsx
import { STANDARD_LIBRARY } from '../../utils/hardwareutils';
import DRC from './DRC';

const LibraryTab = ({
    theme, t, s,
    isLibOpen, setIsLibOpen,
    selectedStandardBlock, setSelectedStandardBlock,
    spawnPrebuilt,
    newModuleName, setNewModuleName,
    newInputs, setNewInputs,
    newOutputs, setNewOutputs,
    createBlock,
    nodes, edges, exposedPorts,
    setSelectedNodeId, setSelectedEdgeId, setCenter, setNodes,
}) => {
    const isDark = theme === 'dark';

    // Professional neutral glass tokens
    const tokens = {
        bg: isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.65)',
        bgHover: isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        bgActive: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        borderHover: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        text: isDark ? 'rgba(244, 244, 245, 0.9)' : 'rgba(24, 24, 27, 0.9)',
        textSecondary: isDark ? 'rgba(244, 244, 245, 0.6)' : 'rgba(24, 24, 27, 0.6)',
        inputBg: isDark ? 'rgba(24, 24, 27, 0.5)' : 'rgba(255, 255, 255, 0.6)',
        dropdownBg: isDark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    };

    const glassInput = {
        ...s.input,
        background: tokens.inputBg,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        color: tokens.text,
        border: `1px solid ${tokens.border}`,
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
    };

    return (
        <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Standard Cell Library selector */}
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Standard Cell Library
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <button
                            onClick={() => setIsLibOpen(!isLibOpen)}
                            style={{
                                ...glassInput,
                                width: '100%',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '9px 12px',
                                fontSize: '13px',
                                fontWeight: 500,
                                borderRadius: '8px',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = tokens.bgHover;
                                e.currentTarget.style.borderColor = tokens.borderHover;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = tokens.inputBg;
                                e.currentTarget.style.borderColor = tokens.border;
                            }}
                        >
                            <span>{selectedStandardBlock}</span>
                            <span style={{ 
                                marginLeft: '8px', 
                                fontSize: '10px',
                                transform: isLibOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}>▼</span>
                        </button>
                        {isLibOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    maxHeight: '240px',
                                    overflowY: 'auto',
                                    background: tokens.dropdownBg,
                                    backdropFilter: 'blur(20px) saturate(180%)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: '8px',
                                    zIndex: 1000,
                                    boxShadow: isDark 
                                        ? '0 4px 12px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)'
                                        : '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
                                    padding: '4px',
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
                                            fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                                            fontWeight: key === selectedStandardBlock ? 600 : 500,
                                            background: key === selectedStandardBlock
                                                ? tokens.bgActive
                                                : 'transparent',
                                            color: tokens.text,
                                            borderRadius: '6px',
                                            transition: 'all 0.1s ease',
                                            marginBottom: '2px',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = key === selectedStandardBlock 
                                                ? tokens.bgActive 
                                                : tokens.bgHover;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = key === selectedStandardBlock 
                                                ? tokens.bgActive 
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
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '9px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '15px',
                            cursor: 'pointer',
                            border: "3px solid transparent",
                            backgroundImage: `linear-gradient(${t.bgSecondary}, ${t.bgSecondary}), linear-gradient(90deg, #c1067d, #4800ff)`,
                            backgroundOrigin: "border-box",
                            backgroundClip: "padding-box, border-box",
                            color: tokens.text,
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            outline: 'none',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: '1px',
                                borderRadius: '15px',
                                background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'} 0%, transparent 60%)`,
                                pointerEvents: 'none',
                            }}
                        />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: '16px', lineHeight: 1 }}>+</span>
                        <span style={{ position: 'relative', zIndex: 1 }}>Add</span>
                    </button>
                </div>
            </div>

            <div style={s.divider} />

            {/* Custom module instantiation form */}
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Custom Instantiation
                </div>
                <form onSubmit={createBlock} style={s.form}>
                    <div style={s.formGroup}>
                        <label style={{ ...s.label, color: tokens.textSecondary }}>Module Definition Name</label>
                        <input
                            value={newModuleName}
                            onChange={(e) => setNewModuleName(e.target.value)}
                            style={glassInput}
                        />
                    </div>
                    <div style={s.formGroup}>
                        <label style={{ ...s.label, color: tokens.textSecondary }}>Input Port List</label>
                        <input
                            value={newInputs}
                            onChange={(e) => setNewInputs(e.target.value)}
                            style={glassInput}
                        />
                    </div>
                    <div style={s.formGroup}>
                        <label style={{ ...s.label, color: tokens.textSecondary }}>Output Port List</label>
                        <input
                            value={newOutputs}
                            onChange={(e) => setNewOutputs(e.target.value)}
                            style={glassInput}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newModuleName.trim()}
                        style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '9px 16px',
                            fontSize: '14px',
                            fontWeight: 500,
                            letterSpacing: '-0.01em',
                            borderRadius: '20px',
                            
                            color: newModuleName.trim() 
                                ? (isDark ? 'rgba(245, 245, 245, 0.95)' : 'rgba(17, 17, 17, 0.95)')
                                : (isDark ? 'rgba(245, 245, 245, 0.35)' : 'rgba(17, 17, 17, 0.35)'),
                           
                            cursor: newModuleName.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            outline: 'none',
                            userSelect: 'none',
                            border: "3px solid transparent",
                            backgroundImage: `linear-gradient(${t.bgSecondary}, ${t.bgSecondary}), linear-gradient(90deg, #c1067d, #4800ff)`,
                            backgroundOrigin: "border-box",
                            backgroundClip: "padding-box, border-box",
                        }}
                        onMouseEnter={() => {
                            if (!newModuleName.trim()) return;}}
                        onMouseLeave={() => {
                            if (!newModuleName.trim()) return;
                            }}
                        onMouseDown={(e) => {
                            if (!newModuleName.trim()) return;
                            e.currentTarget.style.transform = 'scale(0.98)';
                            e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseUp={(e) => {
                            if (!newModuleName.trim()) return;
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.opacity = '1';
                        }}
                    >
                        <span style={{ position: 'relative', zIndex: 1, fontFamily: 'monospace' }}>
                            Instantiate Hardware Block
                        </span>
                    </button>
                </form>
            </div>

            <div style={s.divider} />

            {/* DRC section */}
            <div style={s.panelSection}>
                <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>
                    Design Rule Check (DRC)
                </div>
                <DRC
                    nodes={nodes}
                    edges={edges}
                    exposedPorts={exposedPorts}
                    theme={theme}
                    t={t}
                    s={s}
                    setSelectedNodeId={setSelectedNodeId}
                    setSelectedEdgeId={setSelectedEdgeId}
                    setCenter={setCenter}
                    setNodes={setNodes}
                />
            </div>

            {/* Footer hint */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: tokens.textSecondary,
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
                <div style={{ fontSize: '14px', lineHeight: 1.5, fontFamily: '"SF Mono", Menlo, Monaco, monospace' }}>
                    CLICK ON ANY MODULE OR WIRE TO VIEW OR EDIT ITS PROPERTIES.
                </div>
            </div>
        </div>
    );
};

export default LibraryTab;
import { useState, useMemo, useRef, useCallback } from 'react';
import { IconX } from '../../styles/icons'; // Ensure these or similar exist
import { useCodeEditor } from './useCodeEditor';

const FullCodeModal = ({
    fullCodeModalOpen,
    setFullCodeModalOpen,
    localCode,
    setLocalCode,
    t,
    theme,
    highlightVerilogCode,
    // nodes,
    // targetId,
    // onSaveCode,
    // instantiationQuantity,
    // setInstantiationQuantity,
}) => {
    const [cursorPos, setCursorPos] = useState(0);
    // const [showShortcuts, setShowShortcuts] = useState(false);
    
    // IDE Features State
    const [wordWrap, setWordWrap] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [findWidgetOpen, setFindWidgetOpen] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');

    // Autocomplete State
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Refs
    const lineNumRef = useRef(null);
    const codeAreaRef = useRef(null);
    const minimapRef = useRef(null);

    // Attach Editor Hook (Properly Destructured)
    const { handleKeyDown, updateSuggestions } = useCodeEditor(
        localCode,
        setLocalCode,
        suggestions,
        setSuggestions,
        suggestionIndex,
        setSuggestionIndex,
        setShowSuggestions,
        showSuggestions,
        setFindWidgetOpen,
        () => setWordWrap(prev => !prev)
    );

    // Sync Scrolling across Gutter, Editor, and Minimap
    const handleScroll = (e) => {
        const scrollTop = e.currentTarget.scrollTop;
        if (lineNumRef.current) lineNumRef.current.scrollTop = scrollTop;
        if (minimapRef.current) {
            // Scale minimap scroll (roughly 10% size ratio)
            minimapRef.current.scrollTop = scrollTop * 0.15;
        }
    };

    // Caret Tracking
    const handleSelect = useCallback((e) => {
        setCursorPos(e.target.selectionStart || 0);
    }, []);

    // Line and Column Calculation (Used for Status Bar & Suggestion Positioning)
    const lineCount = useMemo(() => localCode.split('\n').length, [localCode]);
    const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);
    
    const currentLine = useMemo(() => localCode.substring(0, cursorPos).split('\n').length, [localCode, cursorPos]);
    const currentCol = useMemo(() => cursorPos - (localCode.lastIndexOf('\n', cursorPos - 1) + 1), [localCode, cursorPos]);
    const activeLineTop = (currentLine - 1) * 22.4; 

    // Find Logic
    const handleFindNext = () => {
        if (!findText || !codeAreaRef.current) return;
        const textarea = codeAreaRef.current;
        const searchFrom = textarea.selectionEnd;
        let index = localCode.indexOf(findText, searchFrom);
        
        // Wrap around
        if (index === -1) index = localCode.indexOf(findText, 0);
        
        if (index !== -1) {
            textarea.focus();
            textarea.setSelectionRange(index, index + findText.length);
            setCursorPos(index + findText.length);
        }
    };

    const handleReplace = () => {
        if (!findText || !codeAreaRef.current) return;
        const textarea = codeAreaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // If current selection matches findText, replace it
        if (localCode.substring(start, end) === findText) {
            const newCode = localCode.substring(0, start) + replaceText + localCode.substring(end);
            setLocalCode(newCode);
            setTimeout(() => {
                textarea.setSelectionRange(start, start + replaceText.length);
                handleFindNext();
            }, 0);
        } else {
            handleFindNext();
        }
    };

    if (!fullCodeModalOpen) return null;

    // Theme Variables
    const editorBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const gutterBg = theme === 'dark' ? '#1e1e1e' : '#f3f3f3';
    const borderColor = theme === 'dark' ? '#3c3c3c' : '#e0e0e0';
    const textColor = theme === 'dark' ? '#d4d4d4' : '#1e1e1e';
    const lineNumberColor = theme === 'dark' ? '#858585' : '#858585';
    const activeLineColor = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const caretColor = theme === 'dark' ? '#aeafad' : '#000000';
    const lineHeight = 22.4;

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && setFullCodeModalOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setFullCodeModalOpen(false)}
            tabIndex={-1}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.6)', zIndex: 999999, display: 'flex',
                alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
            }}
        >
            <div
                style={{
                    width: '85vw', height: '85vh', background: t.bgSecondary,
                    borderRadius: '12px', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.5)', border: `1px solid ${borderColor}`,
                    overflow: 'hidden', position: 'relative',
                }}
            >
                {/* ---- IDE Title Bar ---- */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 16px', background: gutterBg, borderBottom: `1px solid ${borderColor}`, userSelect: 'none'
                }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontFamily: 'sans-serif', fontWeight: 500, color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Verilog IDE
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <button onClick={() => setWordWrap(!wordWrap)} style={{ background: 'none', border: 'none', color: wordWrap ? '#007acc' : lineNumberColor, cursor: 'pointer', fontSize: '12px' }}>
                            Alt+Z (Wrap)
                        </button>
                        <button onClick={() => setShowMinimap(!showMinimap)} style={{ background: 'none', border: 'none', color: showMinimap ? '#007acc' : lineNumberColor, cursor: 'pointer', fontSize: '12px' }}>
                            Minimap
                        </button>
                        <button onClick={() => setFindWidgetOpen(!findWidgetOpen)} style={{ background: 'none', border: 'none', color: lineNumberColor, cursor: 'pointer', fontSize: '12px' }}>
                            Ctrl+F
                        </button>
                        <button onClick={() => setFullCodeModalOpen(false)} style={{ background: 'none', border: 'none', color: lineNumberColor, cursor: 'pointer' }}>
                            <IconX size={16} />
                        </button>
                    </div>
                </div>

                {/* ---- Find & Replace Widget Overlay ---- */}
                {findWidgetOpen && (
                    <div style={{
                        position: 'absolute', top: '45px', right: '40px', width: '300px', background: theme === 'dark' ? '#252526' : '#fff',
                        border: `1px solid ${borderColor}`, borderRadius: '4px', padding: '8px', zIndex: 100,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input autoFocus placeholder="Find" value={findText} onChange={e => setFindText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFindNext()} style={{ flex: 1, padding: '4px 8px', background: theme === 'dark' ? '#3c3c3c' : '#eee', color: textColor, border: 'none', borderRadius: '4px' }} />
                            <button onClick={handleFindNext} style={{ background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}>Find</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input placeholder="Replace" value={replaceText} onChange={e => setReplaceText(e.target.value)} style={{ flex: 1, padding: '4px 8px', background: theme === 'dark' ? '#3c3c3c' : '#eee', color: textColor, border: 'none', borderRadius: '4px' }} />
                            <button onClick={handleReplace} style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}>Replace</button>
                        </div>
                    </div>
                )}

                {/* ---- Editor Body ---- */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: editorBg, position: 'relative' }}>
                    
                    {/* Gutter */}
                    <div ref={lineNumRef} style={{ width: '50px', background: gutterBg, borderRight: `1px solid ${borderColor}`, overflow: 'hidden', paddingTop: '16px', userSelect: 'none', flexShrink: 0 }}>
                        {lineNumbers.map((num) => (
                            <div key={num} style={{ height: `${lineHeight}px`, lineHeight: `${lineHeight}px`, paddingRight: '12px', fontSize: '13px', fontFamily: 'monospace', color: num === currentLine ? textColor : lineNumberColor, textAlign: 'right' }}>
                                {num}
                            </div>
                        ))}
                    </div>

                    {/* Main Code Area */}
                    <div onScroll={handleScroll} style={{ flex: 1, position: 'relative', overflow: 'auto', scrollbarWidth: 'thin' }}>
                        {/* Active Line Highlight */}
                        <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, height: `${lineHeight}px`, background: activeLineColor, transform: `translateY(${activeLineTop}px)`, pointerEvents: 'none', zIndex: 1 }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr', padding: '16px', minHeight: '100%', minWidth: wordWrap ? '100%' : 'max-content' }}>
                            {/* Syntax Background */}
                            <pre style={{
                                gridArea: '1 / 1', margin: 0, padding: 0, fontFamily: '"SF Mono", monospace', fontSize: '14px', lineHeight: '1.6',
                                whiteSpace: wordWrap ? 'pre-wrap' : 'pre', wordBreak: 'normal', color: textColor, pointerEvents: 'none', zIndex: 0
                            }} dangerouslySetInnerHTML={{ __html: highlightVerilogCode(localCode + '\n', theme) }} />

                            {/* Editing Textarea */}
                            <textarea
                                ref={codeAreaRef}
                                value={localCode}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const pos = e.target.selectionStart;
                                    setLocalCode(val);
                                    // Trigger suggestions AFTER state updates
                                    setTimeout(() => {
                                        setCursorPos(pos);
                                        updateSuggestions(val, pos);
                                    }, 0);
                                }}
                                onKeyDown={handleKeyDown}
                                onClick={handleSelect}
                                onKeyUp={handleSelect}
                                spellCheck="false"
                                style={{
                                    gridArea: '1 / 1', margin: 0, padding: 0, fontFamily: '"SF Mono", monospace', fontSize: '14px', lineHeight: '1.6',
                                    background: 'transparent', color: 'transparent', caretColor: caretColor,
                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre', wordBreak: 'normal', resize: 'none', border: 'none', outline: 'none', zIndex: 2
                                }}
                            />

                            {/* Autocomplete Dropdown (Using pure math to position) */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: activeLineTop + 38.4, // Active line + font height + padding
                                    left: currentCol * 8.4 + 16, // Avg char width + padding
                                    background: theme === 'dark' ? '#252526' : '#ffffff', border: `1px solid ${borderColor}`,
                                    borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxHeight: '200px',
                                    overflowY: 'auto', zIndex: 10, minWidth: '200px', fontFamily: '"SF Mono", monospace', fontSize: '13px',
                                }}>
                                    {suggestions.map((item, idx) => (
                                        <div
                                            key={item}
                                            style={{
                                                padding: '4px 12px', cursor: 'pointer', color: textColor,
                                                background: idx === suggestionIndex ? (theme === 'dark' ? '#094771' : '#d4e6f9') : 'transparent',
                                            }}
                                            onMouseEnter={() => setSuggestionIndex(idx)}
                                            onMouseDown={() => {
                                                const event = new KeyboardEvent('keydown', { key: 'Enter' });
                                                handleKeyDown({ ...event, currentTarget: codeAreaRef.current });
                                            }}
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Minimap */}
                    {showMinimap && (
                        <div ref={minimapRef} style={{ width: '120px', background: gutterBg, borderLeft: `1px solid ${borderColor}`, overflow: 'hidden', userSelect: 'none', flexShrink: 0, padding: '16px 8px' }}>
                            <pre style={{
                                margin: 0, fontFamily: '"SF Mono", monospace', fontSize: '3px', lineHeight: '1.4',
                                color: lineNumberColor, whiteSpace: 'pre', overflow: 'hidden', opacity: 0.7
                            }}>
                                {localCode}
                            </pre>
                        </div>
                    )}
                </div>

                {/* ---- Status Bar ---- */}
                <div style={{ height: '26px', background: gutterBg, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', fontSize: '12px', fontFamily: 'sans-serif', color: lineNumberColor, userSelect: 'none' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span>Ln {currentLine}, Col {currentCol + 1}</span>
                        <span>{suggestions.length > 0 ? `${suggestions.length} Suggestions` : 'Idle'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span>Alt+Shift+F to Format</span>
                        <span style={{ textTransform: 'uppercase' }}>Verilog</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullCodeModal;
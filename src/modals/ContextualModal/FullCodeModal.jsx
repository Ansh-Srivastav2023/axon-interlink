import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { IconX } from '../../styles/icons';
import { useCodeEditor } from './useCodeEditor';

const FullCodeModal = ({
  fullCodeModalOpen,
  setFullCodeModalOpen,
  localCode,
  setLocalCode,
  t,
  theme,
  highlightVerilogCode,
  nodes,
  targetId,
  onSaveCode,
  instantiationQuantity,
  setInstantiationQuantity,
}) => {
  const [cursorPos, setCursorPos] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });

  // Refs
  const lineNumRef = useRef(null);
  const codeAreaRef = useRef(null);

  // Attach the editor hook with all necessary parameters
  const handleKeyDown = useCodeEditor(
    localCode,
    setLocalCode,
    setSuggestions,
    suggestionIndex,
    setSuggestionIndex,
    setShowSuggestions,
    showSuggestions
  );

  // ---------- Suggestion position calculation ----------
  const updateSuggestionPosition = useCallback(() => {
    const textarea = codeAreaRef.current;
    if (!textarea) return;
    // Create a hidden span to measure the caret location
    const span = document.createElement('span');
    span.textContent = localCode.substring(0, cursorPos);
    span.style.position = 'absolute';
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'pre';
    span.style.fontFamily = '"SF Mono", Menlo, Monaco, "Courier New", monospace';
    span.style.fontSize = '14px';
    span.style.lineHeight = '1.6';
    document.body.appendChild(span);
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(span);
    // Position relative to the textarea's scroll container
    const containerRect = textarea.parentElement.getBoundingClientRect();
    setSuggestionPos({
      top: spanRect.top - containerRect.top + 20,
      left: spanRect.left - containerRect.left,
    });
  }, [localCode, cursorPos]);

  // ---------- Event handlers ----------
  const handleScroll = (e) => {
    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleSelect = useCallback(
    (e) => {
      const pos = e.target.selectionStart;
      setCursorPos(pos);
      if (showSuggestions) {
        setTimeout(() => updateSuggestionPosition(), 0);
      }
    },
    [showSuggestions, updateSuggestionPosition]
  );

  const handleKeyUp = useCallback(
    () => {
      if (showSuggestions) {
        setTimeout(() => updateSuggestionPosition(), 0);
      }
    },
    [showSuggestions, updateSuggestionPosition]
  );

  // Update position when code changes (typing)
  useEffect(() => {
    if (showSuggestions) {
      updateSuggestionPosition();
    }
  }, [localCode, showSuggestions, updateSuggestionPosition]);

  // Reset cursor and close suggestions on modal open
  useEffect(() => {
    if (fullCodeModalOpen && codeAreaRef.current) {
      const pos = codeAreaRef.current.selectionStart || 0;
      setCursorPos(pos);
      setShowSuggestions(false);
    }
  }, [fullCodeModalOpen]);

  // Close suggestions on blur
  useEffect(() => {
    const handleBlur = () => setShowSuggestions(false);
    const area = codeAreaRef.current;
    if (area) {
      area.addEventListener('blur', handleBlur);
      return () => area.removeEventListener('blur', handleBlur);
    }
  }, []);

  // ---------- Line numbers and cursor info ----------
  const lineCount = useMemo(() => localCode.split('\n').length, [localCode]);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount]
  );

  const currentLine = useMemo(
    () => localCode.substring(0, cursorPos).split('\n').length,
    [localCode, cursorPos]
  );
  const currentCol = useMemo(
    () => cursorPos - (localCode.lastIndexOf('\n', cursorPos - 1) + 1),
    [localCode, cursorPos]
  );
  const activeLineTop = (currentLine - 1) * 22.4; // 14px * 1.6 line-height

  if (!fullCodeModalOpen) return null;

  // ---------- Theme variables ----------
  const editorBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const gutterBg = theme === 'dark' ? '#1e1e1e' : '#f3f3f3';
  const borderColor = theme === 'dark' ? '#3c3c3c' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d4d4d4' : '#1e1e1e';
  const lineNumberColor = theme === 'dark' ? '#858585' : '#858585';
  const activeLineColor = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const statusBg = theme === 'dark' ? '#1e1e1e' : '#f3f3f3';
  const caretColor = theme === 'dark' ? '#aeafad' : '#000000';
  const lineHeight = 22.4;

  // ---------- Shortcuts data ----------
  const shortcuts = [
    { keys: 'Ctrl+Z / Cmd+Z', desc: 'Undo' },
    { keys: 'Ctrl+Y / Cmd+Y / Cmd+Shift+Z', desc: 'Redo' },
    { keys: 'Ctrl+D', desc: 'Duplicate current line' },
    { keys: 'Ctrl+Shift+K', desc: 'Delete current line' },
    { keys: 'Ctrl+/', desc: 'Toggle line comment' },
    { keys: 'Ctrl+Shift+/', desc: 'Toggle block comment' },
    { keys: 'Alt+↑ / Alt+↓', desc: 'Move line up/down' },
    { keys: 'Alt+Shift+↑ / Alt+Shift+↓', desc: 'Copy line up/down' },
    { keys: 'Tab / Shift+Tab', desc: 'Indent / Outdent (multi-line)' },
    { keys: 'Enter', desc: 'Smart Verilog indentation' },
    { keys: '(` { [ " \')', desc: 'Auto‑close brackets & quotes' },
    { keys: ') } ] " \'', desc: 'Overwrite closing bracket' },
    { keys: 'Ctrl+Space', desc: 'Force autocomplete suggestions' },
    { keys: '↑/↓, Enter, Esc', desc: 'Navigate/select/dismiss suggestions' },
  ];

  // ---------- Render ----------
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && setFullCodeModalOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setFullCodeModalOpen(false)}
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.6)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '75vw',
          height: '80vh',
          background: t.bgSecondary,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ---- Title Bar ---- */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            background: gutterBg,
            borderBottom: `1px solid ${borderColor}`,
            userSelect: 'none',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 500,
              color: textColor,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={t.primary || '#007acc'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            RTL Code Editor – Full View
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowShortcuts(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: lineNumberColor,
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
              title="Keyboard Shortcuts"
            >
              ?
            </button>
            <button
              onClick={() => setFullCodeModalOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: lineNumberColor,
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* ---- Editor Body ---- */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            background: editorBg,
            position: 'relative',
          }}
        >
          {/* Line Numbers Gutter */}
          <div
            ref={lineNumRef}
            style={{
              width: '50px',
              background: gutterBg,
              borderRight: `1px solid ${borderColor}`,
              overflow: 'hidden',
              paddingTop: '16px',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {lineNumbers.map((num) => (
              <div
                key={num}
                style={{
                  height: `${lineHeight}px`,
                  lineHeight: `${lineHeight}px`,
                  paddingLeft: '16px',
                  fontSize: '13px',
                  fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
                  color: lineNumberColor,
                  textAlign: 'right',
                  boxSizing: 'border-box',
                }}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Code Area */}
          <div
            onScroll={handleScroll}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: theme === 'dark' ? '#555 #1e1e1e' : '#c1c1c1 #f3f3f3',
            }}
          >
            {/* Active Line Highlight */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: 0,
                right: 0,
                height: `${lineHeight}px`,
                background: activeLineColor,
                transform: `translateY(${activeLineTop}px)`,
                pointerEvents: 'none',
                zIndex: 1,
                transition: 'transform 0.05s linear',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridTemplateRows: '1fr',
                width: 'max-content',
                minWidth: '100%',
                minHeight: '100%',
                padding: '16px',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {/* Syntax‑highlighted background (read‑only) */}
              <pre
                style={{
                  gridArea: '1 / 1',
                  margin: 0,
                  padding: 0,
                  fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre',
                  wordBreak: 'normal',
                  background: 'transparent',
                  color: textColor,
                  pointerEvents: 'none',
                  width: 'max-content',
                  minWidth: '100%',
                  zIndex: 0,
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightVerilogCode(localCode + '\n', theme),
                }}
              />

              {/* Invisible textarea for editing */}
              <textarea
                ref={codeAreaRef}
                value={localCode}
                onChange={(e) => {
                  setLocalCode(e.target.value);
                  setTimeout(() => {
                    const pos = e.target.selectionStart;
                    setCursorPos(pos);
                    if (showSuggestions) updateSuggestionPosition();
                  }, 0);
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onClick={handleSelect}
                onSelect={handleSelect}
                spellCheck="false"
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                style={{
                  gridArea: '1 / 1',
                  margin: 0,
                  padding: 0,
                  fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  background: 'transparent',
                  color: 'transparent',
                  caretColor: caretColor,
                  whiteSpace: 'pre',
                  wordBreak: 'normal',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: 'max-content',
                  minWidth: '100%',
                  height: '100%',
                  zIndex: 2,
                  overflow: 'hidden',
                }}
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: suggestionPos.top + 16,
                    left: suggestionPos.left + 16,
                    background: theme === 'dark' ? '#252526' : '#ffffff',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                    minWidth: '200px',
                    fontFamily: '"SF Mono", Menlo, Monaco, monospace',
                    fontSize: '13px',
                  }}
                >
                  {suggestions.map((item, idx) => (
                    <div
                      key={item}
                      style={{
                        padding: '4px 12px',
                        cursor: 'pointer',
                        background:
                          idx === suggestionIndex
                            ? theme === 'dark'
                              ? '#094771'
                              : '#d4e6f9'
                            : 'transparent',
                        color: textColor,
                      }}
                      onMouseEnter={() => setSuggestionIndex(idx)}
                      onMouseDown={() => {
                        // Simulate Enter selection
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
        </div>

        {/* ---- Status Bar ---- */}
        <div
          style={{
            height: '28px',
            background: statusBg,
            borderTop: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: lineNumberColor,
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Ln {currentLine}, Col {currentCol + 1}</span>
            <span>Spaces: 2</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Lines: {lineCount}</span>
            <span style={{ textTransform: 'uppercase' }}>Verilog</span>
          </div>
        </div>

        {/* ---- Action Buttons ---- */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '12px 20px',
            borderTop: `1px solid ${borderColor}`,
            background: t.bgSecondary,
          }}
        >
          <button
            onClick={() => setFullCodeModalOpen(false)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const targetNode = nodes.find((n) => n.id === targetId);
              if (targetNode && !targetNode.data.isSplitter && !targetNode.data.isBundler) {
                if (typeof onSaveCode === 'function') {
                  onSaveCode(targetId, targetNode.data.moduleName, localCode, instantiationQuantity);
                  setInstantiationQuantity(1);
                }
              }
              setFullCodeModalOpen(false);
            }}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              background: t.primary || '#007acc',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            Save & Close
          </button>
        </div>

        {/* ---- Shortcuts Reference Modal ---- */}
        {showShortcuts && (
          <div
            onClick={(e) => e.target === e.currentTarget && setShowShortcuts(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(2px)',
            }}
          >
            <div
              style={{
                background: t.bgSecondary,
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: textColor,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  ⌨️ Keyboard Shortcuts
                </h4>
                <button
                  onClick={() => setShowShortcuts(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: lineNumberColor,
                    cursor: 'pointer',
                  }}
                >
                  <IconX size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shortcuts.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background:
                        idx % 2 === 0
                          ? theme === 'dark'
                            ? '#2d2d2d'
                            : '#f3f3f3'
                          : 'transparent',
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: '13px',
                      color: textColor,
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {item.keys}
                    </span>
                    <span>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullCodeModal;
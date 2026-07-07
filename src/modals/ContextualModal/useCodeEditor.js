import { useCallback, useRef, useEffect } from 'react';

// ---------- Verilog/SystemVerilog keywords and snippets ----------
export const KEYWORDS = [
    'module', 'endmodule', 'always', 'assign', 'if', 'else', 'case', 'endcase',
    'generate', 'endgenerate', 'begin', 'end', 'for', 'function', 'endfunction',
    'task', 'endtask', 'fork', 'join', 'join_any', 'join_none', 'initial',
    'final', 'repeat', 'while', 'forever', 'wait', 'assert', 'assume', 'cover',
    'property', 'sequence', 'rand', 'randc', 'constraint', 'solve', 'inside',
    'dist', 'binsof', 'intersect', 'with', 'localparam', 'parameter', 'defparam',
    'input', 'output', 'inout', 'wire', 'reg', 'logic', 'int', 'integer', 'time',
    'real', 'realtime', 'shortint', 'longint', 'byte', 'bit', 'string',
    'enum', 'struct', 'union', 'packed', 'unpacked', 'typedef', 'import',
    'export', 'package', 'endpackage', 'interface', 'endinterface', 'modport',
    'clocking', 'endclocking', 'covergroup', 'endgroup', 'specify', 'endspecify'
];

export const SNIPPETS = {
    module: { template: `module \${1:name} (\n    \${2:ports}\n);\n    \nendmodule`, cursor: 7 },
    always: { template: `always @(*) begin\n    \nend`, cursor: 13 },
    if: { template: `if () begin\n    \nend else begin\n    \nend`, cursor: 4 },
    case: { template: `case ()\n    default: ;\nendcase`, cursor: 6 },
    for: { template: `for (int i=0; i<; i++) begin\n    \nend`, cursor: 16 }
};

// ---------- Auto-Formatter for Verilog ----------
export const formatVerilog = (code) => {
    const lines = code.split('\n');
    let indentLevel = 0;
    const tab = '    ';
    const increaseRegex = /\b(module|begin|case|generate|function|task|class|package)\b(?![_a-zA-Z0-9])/;
    const decreaseRegex = /\b(endmodule|end|endcase|endgenerate|endfunction|endtask|endclass|endpackage)\b(?![_a-zA-Z0-9])/;

    return lines.map(line => {
        let trimmed = line.trim();
        if (!trimmed) return '';

        // Lookahead for decrease to outdent the current line
        if (decreaseRegex.test(trimmed)) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        const formattedLine = tab.repeat(indentLevel) + trimmed;

        // Lookahead for increase to indent the NEXT line
        // We ensure we don't increase if a single line has both (e.g., `begin ... end`)
        const hasInc = increaseRegex.test(trimmed);
        const hasDec = decreaseRegex.test(trimmed);
        if (hasInc && !hasDec) {
            indentLevel++;
        }
        return formattedLine;
    }).join('\n');
};

// ---------- The Hook ----------
export const useCodeEditor = (
    localCode,
    setLocalCode,
    suggestions,
    setSuggestions,
    suggestionIndex,
    setSuggestionIndex,
    setShowSuggestions,
    showSuggestions,
    toggleFindWidget,
    toggleWordWrap
) => {
    const suggestionRef = useRef([]);
    useEffect(() => {
        suggestionRef.current = suggestions;
    }, [suggestions]);

    const getCurrentToken = (text, pos) => {
        let i = pos - 1;
        while (i >= 0 && /[a-zA-Z0-9_]/.test(text[i])) i--;
        return text.substring(i + 1, pos);
    };

    const findTokenStart = (text, pos) => {
        let i = pos - 1;
        while (i >= 0 && /[a-zA-Z_]/.test(text[i])) i--;
        return i + 1;
    };

    const getIndent = (text, pos) => {
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
        const line = text.substring(lineStart);
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    };

    // EXPORTED: Suggestion Updater for onChange
    const updateSuggestions = useCallback((text, pos) => {
        const token = getCurrentToken(text, pos);
        if (token && token.length >= 1) {
            const matches = [...KEYWORDS, ...Object.keys(SNIPPETS)].filter(item =>
                item.startsWith(token)
            );
            if (matches.length > 0) {
                setSuggestions(matches);
                setShowSuggestions(true);
                setSuggestionIndex(0);
                return;
            }
        }
        setShowSuggestions(false);
        setSuggestions([]);
    }, [setSuggestions, setShowSuggestions, setSuggestionIndex]);

    const handleKeyDown = useCallback(
        (e) => {
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentValue = localCode;

            if (!textarea._undoStack) textarea._undoStack = [];
            if (!textarea._redoStack) textarea._redoStack = [];

            const updateWithHistory = (oldVal, newVal, newStart, newEnd) => {
                textarea._undoStack.push({ value: oldVal, start, end });
                textarea._redoStack = [];
                setLocalCode(newVal);
                setTimeout(() => {
                    textarea.selectionStart = newStart;
                    textarea.selectionEnd = newEnd !== undefined ? newEnd : newStart;
                }, 0);
                setShowSuggestions(false);
            };

            // --- IDE Shortcuts ---
            // Format Document (Alt+Shift+F)
            if (e.altKey && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                const formatted = formatVerilog(currentValue);
                updateWithHistory(currentValue, formatted, start, end);
                return;
            }

            // Find Widget (Ctrl+F / Cmd+F)
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (toggleFindWidget) toggleFindWidget(true);
                return;
            }

            // Word Wrap (Alt+Z)
            if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                if (toggleWordWrap) toggleWordWrap();
                return;
            }

            // --- Suggestion Navigation ---
            if (showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                e.preventDefault();
                const maxIndex = suggestionRef.current.length - 1;
                if (maxIndex < 0) return;
                setSuggestionIndex((prev) => {
                    let newIdx = prev + (e.key === 'ArrowDown' ? 1 : -1);
                    if (newIdx < 0) newIdx = maxIndex;
                    if (newIdx > maxIndex) newIdx = 0;
                    return newIdx;
                });
                return;
            }

            if (showSuggestions && e.key === 'Enter') {
                const idx = suggestionIndex;
                const suggestions = suggestionRef.current;
                if (idx >= 0 && idx < suggestions.length) {
                    e.preventDefault();
                    const selected = suggestions[idx];
                    const tokenStart = findTokenStart(currentValue, start);

                    if (SNIPPETS[selected]) {
                        const snippet = SNIPPETS[selected];
                        const indent = getIndent(currentValue, start);
                        const lines = snippet.template.split('\n');
                        const indented = lines.map((line, i) => (i === 0 ? line : indent + line)).join('\n');
                        const before = currentValue.substring(0, tokenStart);
                        const after = currentValue.substring(start);
                        const newVal = before + indented + after;
                        updateWithHistory(currentValue, newVal, tokenStart + snippet.cursor);
                    } else {
                        const before = currentValue.substring(0, tokenStart);
                        const after = currentValue.substring(start);
                        const newVal = before + selected + after;
                        updateWithHistory(currentValue, newVal, tokenStart + selected.length);
                    }
                    return;
                }
            }

            if (showSuggestions && e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
                return;
            }

            // --- Standard Editor Operations ---

            // ---------- TAB / INDENT (Multi-line support) ----------
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const tab = '    '; // 4 spaces for indentation

                if (start !== end && currentValue.substring(start, end).includes('\n')) {
                    // Multi-line indent
                    const before = currentValue.substring(0, start);
                    const selected = currentValue.substring(start, end);
                    const after = currentValue.substring(end);
                    const lines = selected.split('\n');
                    const indented = lines.map((l) => (l === '' ? '' : tab + l)).join('\n');
                    const newVal = before + indented + after;
                    updateWithHistory(currentValue, newVal, start, start + indented.length);
                } else {
                    // Single-line indent
                    const newVal = currentValue.substring(0, start) + tab + currentValue.substring(end);
                    updateWithHistory(currentValue, newVal, start + tab.length);
                }
                return;
            }

            // ---------- SHIFT+TAB / OUTDENT (Multi-line support) ----------
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                if (start !== end && currentValue.substring(start, end).includes('\n')) {
                    const before = currentValue.substring(0, start);
                    const selected = currentValue.substring(start, end);
                    const after = currentValue.substring(end);
                    const lines = selected.split('\n');
                    const outdented = lines.map((l) => (l.startsWith('    ') ? l.substring(4) : (l.startsWith('  ') ? l.substring(2) : l))).join('\n');
                    const newVal = before + outdented + after;
                    updateWithHistory(currentValue, newVal, start, start + outdented.length);
                } else {
                    const textBefore = currentValue.substring(0, start);
                    const lineStart = textBefore.lastIndexOf('\n') + 1;
                    const lineText = currentValue.substring(lineStart);

                    if (lineText.startsWith('    ')) {
                        const newVal = currentValue.substring(0, lineStart) + lineText.substring(4);
                        const newPos = Math.max(lineStart, start - 4);
                        updateWithHistory(currentValue, newVal, newPos);
                    } else if (lineText.startsWith('  ')) {
                        const newVal = currentValue.substring(0, lineStart) + lineText.substring(2);
                        const newPos = Math.max(lineStart, start - 2);
                        updateWithHistory(currentValue, newVal, newPos);
                    }
                }
                return;
            }

            // ---------- SMART ENTER (Auto-Indentation) ----------
            if (e.key === 'Enter') {
                e.preventDefault();
                const textBefore = currentValue.substring(0, start);
                const lineStart = textBefore.lastIndexOf('\n') + 1;
                const currentLine = textBefore.substring(lineStart);

                // Grab the exact whitespace from the current line
                const indentMatch = currentLine.match(/^([ \t]*)/);
                let indent = indentMatch ? indentMatch[1] : '';
                const clean = currentLine.trim().toLowerCase();

                // Verilog block starters that require deeper indentation on the next line
                const increaseIndent = ['(', 'begin', 'generate', 'module', 'function', 'task', 'case', 'fork', 'class', 'package'];

                if (increaseIndent.some((kw) => clean.endsWith(kw))) {
                    indent += '    '; // Add 4 spaces of inner indent
                }

                const insert = '\n' + indent;
                const newVal = currentValue.substring(0, start) + insert + currentValue.substring(end);

                // --- Optional: Smart Outdent for 'end' ---
                // If you want to automatically close the bracket/end block, we can check the text after
                const textAfter = currentValue.substring(end).trimStart().toLowerCase();
                const outdentKeywords = ['end', 'endcase', 'endmodule', 'endfunction', 'endtask', 'endgenerate', 'join', ')'];

                if (outdentKeywords.some((kw) => textAfter.startsWith(kw))) {
                    const outdentedIndent = indent.substring(0, Math.max(0, indent.length - 4));
                    const finalInsert = '\n' + outdentedIndent;
                    const finalVal = currentValue.substring(0, start) + finalInsert + currentValue.substring(end);
                    updateWithHistory(currentValue, finalVal, start + finalInsert.length);
                } else {
                    updateWithHistory(currentValue, newVal, start + insert.length);
                }
                return;
            }

            // ---------- AUTO-CLOSE BRACKETS & QUOTES ----------
            const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
            if (pairs[e.key]) {
                e.preventDefault();
                const selected = currentValue.substring(start, end);
                const newVal = currentValue.substring(0, start) + e.key + selected + pairs[e.key] + currentValue.substring(end);
                updateWithHistory(currentValue, newVal, start + 1, start + 1 + selected.length);
                return;
            }

            // ---------- OVERWRITE CLOSING BRACKET ----------
            if ([')', '}', ']', '"', "'"].includes(e.key) && currentValue.charAt(end) === e.key) {
                e.preventDefault();
                const newVal = currentValue.substring(0, start) + currentValue.substring(end + 1);
                updateWithHistory(currentValue, newVal, start + 1);
                return;
            }
        },
        [localCode, setLocalCode, setSuggestionIndex, setShowSuggestions, suggestionIndex, showSuggestions, toggleFindWidget, toggleWordWrap]
    );

    // Return an OBJECT to be destructured in the Modal
    return { handleKeyDown, updateSuggestions };
};
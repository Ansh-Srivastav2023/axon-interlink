import { useCallback, useRef, useEffect } from 'react';

// Verilog/SystemVerilog keywords and snippets (exported for parent)
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
    module: {
        template: `module ${''} (\n    ${''}\n);\n    \nendmodule`,
        cursor: 7
    },
    always: {
        template: `always @(*) begin\n    ${''}\nend`,
        cursor: 13
    },
    if: {
        template: `if (${''}) begin\n    \nend else begin\n    \nend`,
        cursor: 4
    },
    case: {
        template: `case (${''})\n    default: ;\nendcase`,
        cursor: 6
    },
    generate: {
        template: `generate\n    ${''}\nendgenerate`,
        cursor: 8
    },
    for: {
        template: `for (${''}) begin\n    \nend`,
        cursor: 5
    },
    function: {
        template: `function ${''};\n    \nendfunction`,
        cursor: 9
    },
    task: {
        template: `task ${''};\n    \nendtask`,
        cursor: 5
    },
    fork: {
        template: `fork\n    ${''}\njoin`,
        cursor: 4
    },
    initial: {
        template: `initial begin\n    ${''}\nend`,
        cursor: 7
    }
};

export const useCodeEditor = (
    localCode,
    setLocalCode,
    suggestions,
    setSuggestions,
    suggestionIndex,
    setSuggestionIndex,
    setShowSuggestions,
    showSuggestions
) => {
    const suggestionRef = useRef([]);
    useEffect(() => {
        suggestionRef.current = suggestions;
    }, [suggestions]);

    // Helper to find token start (used for snippet insertion)
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

    const handleKeyDown = useCallback(
        (e) => {
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentValue = localCode;

            // Undo/redo stacks
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
                // Close suggestions after insertion
                setShowSuggestions(false);
                setSuggestions([]);
            };

            // Helper to get line range
            const getLineRange = (selStart, selEnd) => {
                const textBeforeStart = currentValue.substring(0, selStart);
                const lineStart = textBeforeStart.lastIndexOf('\n') + 1;
                const lineEnd = currentValue.indexOf('\n', selEnd);
                const actualEnd = lineEnd === -1 ? currentValue.length : lineEnd;
                return { lineStart, lineEnd: actualEnd };
            };

            const getLineContent = (lineStart, lineEnd) => currentValue.substring(lineStart, lineEnd);

            // ---------- Autocomplete handling ----------
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
                        setLocalCode(newVal);
                        const cursorPos = tokenStart + snippet.cursor + (lines.length > 1 ? indent.length : 0);
                        setTimeout(() => {
                            textarea.selectionStart = cursorPos;
                            textarea.selectionEnd = cursorPos;
                            textarea.focus();
                        }, 0);
                    } else {
                        const before = currentValue.substring(0, tokenStart);
                        const after = currentValue.substring(start);
                        const newVal = before + selected + after;
                        setLocalCode(newVal);
                        const cursorPos = tokenStart + selected.length;
                        setTimeout(() => {
                            textarea.selectionStart = cursorPos;
                            textarea.selectionEnd = cursorPos;
                            textarea.focus();
                        }, 0);
                    }
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setSuggestionIndex(0);
                    return;
                }
            }

            if (showSuggestions && e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
                setSuggestions([]);
                return;
            }

            // ---------- UNDO / REDO ----------
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                if (textarea._undoStack.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    const prev = textarea._undoStack.pop();
                    textarea._redoStack.push({ value: currentValue, start, end });
                    setLocalCode(prev.value);
                    setTimeout(() => {
                        textarea.selectionStart = prev.start;
                        textarea.selectionEnd = prev.end;
                    }, 0);
                    return;
                }
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                if (textarea._redoStack.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    const next = textarea._redoStack.pop();
                    textarea._undoStack.push({ value: currentValue, start, end });
                    setLocalCode(next.value);
                    setTimeout(() => {
                        textarea.selectionStart = next.start;
                        textarea.selectionEnd = next.end;
                    }, 0);
                    return;
                }
            }

            // ---------- DUPLICATE LINE (Ctrl+D) ----------
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                const line = getLineContent(lineStart, lineEnd);
                const newVal =
                    currentValue.substring(0, lineEnd) +
                    '\n' +
                    line +
                    currentValue.substring(lineEnd);
                const newPos = lineEnd + 1 + line.length;
                updateWithHistory(currentValue, newVal, newPos, newPos);
                return;
            }

            // ---------- DELETE LINE (Ctrl+Shift+K) ----------
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'k') {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                const actualEnd = lineEnd + (lineEnd < currentValue.length ? 1 : 0);
                let newVal =
                    currentValue.substring(0, lineStart) + currentValue.substring(actualEnd);
                if (lineStart > 0 && actualEnd >= currentValue.length) {
                    newVal = newVal.substring(0, newVal.length - 1);
                }
                updateWithHistory(currentValue, newVal, lineStart, lineStart);
                return;
            }

            // ---------- TOGGLE LINE COMMENT (Ctrl+/) ----------
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                const line = getLineContent(lineStart, lineEnd);
                const isCommented = line.trimStart().startsWith('//');
                let newVal, newCursor;
                if (isCommented) {
                    const trimmed = line.replace(/^(\s*)\/\/ ?/, '$1');
                    newVal = currentValue.substring(0, lineStart) + trimmed + currentValue.substring(lineEnd);
                    newCursor = start - (line.length - trimmed.length);
                } else {
                    const indent = line.match(/^(\s*)/)[1];
                    newVal =
                        currentValue.substring(0, lineStart) +
                        indent +
                        '// ' +
                        line.trimStart() +
                        currentValue.substring(lineEnd);
                    newCursor = start + (indent.length + 3);
                }
                updateWithHistory(currentValue, newVal, newCursor, newCursor);
                return;
            }

            // ---------- TOGGLE BLOCK COMMENT (Ctrl+Shift+/) ----------
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '/') {
                e.preventDefault();
                if (start !== end) {
                    const selected = currentValue.substring(start, end);
                    const isBlockCommented = selected.startsWith('/*') && selected.endsWith('*/');
                    let newVal, newStart, newEnd;
                    if (isBlockCommented) {
                        const inner = selected.substring(2, selected.length - 2).trim();
                        newVal = currentValue.substring(0, start) + inner + currentValue.substring(end);
                        newStart = start;
                        newEnd = start + inner.length;
                    } else {
                        newVal =
                            currentValue.substring(0, start) +
                            '/* ' +
                            selected +
                            ' */' +
                            currentValue.substring(end);
                        newStart = start + 3;
                        newEnd = newStart + selected.length;
                    }
                    updateWithHistory(currentValue, newVal, newStart, newEnd);
                } else {
                    const { lineStart, lineEnd } = getLineRange(start, end);
                    const line = getLineContent(lineStart, lineEnd);
                    const isCommented = line.trimStart().startsWith('/*') && line.trimEnd().endsWith('*/');
                    let newVal, newCursor;
                    if (isCommented) {
                        const inner = line.substring(line.indexOf('/*') + 2, line.lastIndexOf('*/')).trim();
                        newVal = currentValue.substring(0, lineStart) + inner + currentValue.substring(lineEnd);
                        newCursor = start - (line.length - inner.length);
                    } else {
                        newVal =
                            currentValue.substring(0, lineStart) +
                            '/* ' +
                            line.trim() +
                            ' */' +
                            currentValue.substring(lineEnd);
                        newCursor = start + 3;
                    }
                    updateWithHistory(currentValue, newVal, newCursor, newCursor);
                }
                return;
            }

            // ---------- MOVE LINE UP (Alt+↑) ----------
            if (e.altKey && e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                if (lineStart === 0) return;
                const prevLineEnd = currentValue.lastIndexOf('\n', lineStart - 1);
                const prevLineStart = prevLineEnd === -1 ? 0 : prevLineEnd + 1;
                const prevLine = getLineContent(prevLineStart, prevLineEnd === -1 ? lineStart - 1 : prevLineEnd);
                const currentLine = getLineContent(lineStart, lineEnd);
                const newVal =
                    currentValue.substring(0, prevLineStart) +
                    currentLine +
                    (lineStart > 0 ? '\n' : '') +
                    prevLine +
                    currentValue.substring(lineEnd);
                const newCursorStart = prevLineStart;
                const newCursorEnd = prevLineStart + currentLine.length;
                updateWithHistory(currentValue, newVal, newCursorStart, newCursorEnd);
                return;
            }

            // ---------- MOVE LINE DOWN (Alt+↓) ----------
            if (e.altKey && e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                const nextLineStart = currentValue.indexOf('\n', lineEnd) + 1;
                if (nextLineStart === 0) return;
                const nextLineEnd = currentValue.indexOf('\n', nextLineStart);
                const actualNextEnd = nextLineEnd === -1 ? currentValue.length : nextLineEnd;
                const currentLine = getLineContent(lineStart, lineEnd);
                const nextLine = getLineContent(nextLineStart, actualNextEnd);
                const newVal =
                    currentValue.substring(0, lineStart) +
                    nextLine +
                    (lineStart > 0 ? '\n' : '') +
                    currentLine +
                    currentValue.substring(actualNextEnd);
                const newCursorStart = lineStart + nextLine.length + (lineStart > 0 ? 1 : 0);
                const newCursorEnd = newCursorStart + currentLine.length;
                updateWithHistory(currentValue, newVal, newCursorStart, newCursorEnd);
                return;
            }

            // ---------- COPY LINE UP (Alt+Shift+↑) ----------
            if (e.altKey && e.shiftKey && e.key === 'ArrowUp') {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                const line = getLineContent(lineStart, lineEnd);
                const newVal =
                    currentValue.substring(0, lineStart) +
                    line +
                    '\n' +
                    currentValue.substring(lineStart);
                const newPos = lineStart + line.length + 1;
                updateWithHistory(currentValue, newVal, newPos, newPos);
                return;
            }

            // ---------- COPY LINE DOWN (Alt+Shift+↓) ----------
            if (e.altKey && e.shiftKey && e.key === 'ArrowDown') {
                e.preventDefault();
                const { lineStart, lineEnd } = getLineRange(start, end);
                const line = getLineContent(lineStart, lineEnd);
                const newVal =
                    currentValue.substring(0, lineEnd) +
                    '\n' +
                    line +
                    currentValue.substring(lineEnd);
                const newPos = lineEnd + 1 + line.length;
                updateWithHistory(currentValue, newVal, newPos, newPos);
                return;
            }

            // ---------- TAB / INDENT (multi-line support) ----------
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const tab = '  ';
                if (start !== end && currentValue.substring(start, end).includes('\n')) {
                    const before = currentValue.substring(0, start);
                    const selected = currentValue.substring(start, end);
                    const after = currentValue.substring(end);
                    const lines = selected.split('\n');
                    const indented = lines.map((l) => (l === '' ? '' : tab + l)).join('\n');
                    const newVal = before + indented + after;
                    const newStart = start;
                    const newEnd = start + indented.length;
                    updateWithHistory(currentValue, newVal, newStart, newEnd);
                } else {
                    const newVal = currentValue.substring(0, start) + tab + currentValue.substring(end);
                    updateWithHistory(currentValue, newVal, start + tab.length);
                }
                return;
            }

            // ---------- SHIFT+TAB / OUTDENT ----------
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                if (start !== end && currentValue.substring(start, end).includes('\n')) {
                    const before = currentValue.substring(0, start);
                    const selected = currentValue.substring(start, end);
                    const after = currentValue.substring(end);
                    const lines = selected.split('\n');
                    const outdented = lines.map((l) => (l.startsWith('  ') ? l.substring(2) : l)).join('\n');
                    const newVal = before + outdented + after;
                    const newStart = start;
                    const newEnd = start + outdented.length;
                    updateWithHistory(currentValue, newVal, newStart, newEnd);
                } else {
                    const textBefore = currentValue.substring(0, start);
                    const lineStart = textBefore.lastIndexOf('\n') + 1;
                    const lineText = currentValue.substring(lineStart);
                    if (lineText.startsWith('  ')) {
                        const newVal =
                            currentValue.substring(0, lineStart) + lineText.substring(2);
                        const newPos = Math.max(lineStart, start - 2);
                        updateWithHistory(currentValue, newVal, newPos, newPos);
                    }
                }
                return;
            }

            // ---------- AUTO-CLOSE BRACKETS & QUOTES ----------
            const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
            if (pairs[e.key]) {
                e.preventDefault();
                const selected = currentValue.substring(start, end);
                const newVal =
                    currentValue.substring(0, start) +
                    e.key +
                    selected +
                    pairs[e.key] +
                    currentValue.substring(end);
                const newStart = start + 1;
                const newEnd = newStart + selected.length;
                updateWithHistory(currentValue, newVal, newStart, newEnd);
                return;
            }

            // ---------- OVERWRITE CLOSING BRACKET ----------
            if ([')', '}', ']', '"', "'"].includes(e.key) && currentValue.charAt(end) === e.key) {
                e.preventDefault();
                const newVal = currentValue.substring(0, start) + currentValue.substring(end + 1);
                updateWithHistory(currentValue, newVal, start + 1, start + 1);
                return;
            }

            // ---------- SMART ENTER (Verilog indentation) ----------
            if (e.key === 'Enter') {
                e.preventDefault();
                const textBefore = currentValue.substring(0, start);
                const lineStart = textBefore.lastIndexOf('\n') + 1;
                const currentLine = textBefore.substring(lineStart);
                const indentMatch = currentLine.match(/^([ \t]*)/);
                let indent = indentMatch ? indentMatch[1] : '';
                const clean = currentLine.trim().toLowerCase();

                const increaseIndent = ['(', 'begin', 'generate', 'module', 'function', 'task', 'case', 'fork'];
                if (increaseIndent.some((kw) => clean.endsWith(kw))) {
                    indent += '  ';
                }

                const insert = '\n' + indent;
                const newVal = currentValue.substring(0, start) + insert + currentValue.substring(end);
                const newPos = start + insert.length;

                const textAfter = currentValue.substring(end).trimStart().toLowerCase();
                const outdentKeywords = ['end', 'endcase', 'endmodule', 'endfunction', 'endtask', 'endgenerate', 'join'];
                if (outdentKeywords.some((kw) => textAfter.startsWith(kw))) {
                    const outdentedIndent = indent.substring(0, Math.max(0, indent.length - 2));
                    const finalInsert = '\n' + outdentedIndent;
                    const finalVal = currentValue.substring(0, start) + finalInsert + currentValue.substring(end);
                    updateWithHistory(currentValue, finalVal, start + finalInsert.length);
                } else {
                    updateWithHistory(currentValue, newVal, newPos);
                }
                return;
            }

            // ---------- Everything else: let browser handle normally ----------
        },
        [localCode, setLocalCode, setSuggestions, setSuggestionIndex, setShowSuggestions, suggestionIndex, showSuggestions]
    );

    return handleKeyDown;
};
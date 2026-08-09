import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '../../styles/icons';
import { formatVerilog, KEYWORDS, SNIPPETS } from './useCodeEditor';

const VERILOG_OPERATORS = ['always', 'assign', 'begin', 'case', 'else', 'endmodule', 'endcase', 'for', 'if', 'input', 'logic', 'module', 'output', 'parameter', 'reg', 'wire'];

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getLineColumn = (text = '', cursor = 0) => {
    const beforeCursor = text.slice(0, cursor);
    const line = beforeCursor.split('\n').length;
    const column = cursor - beforeCursor.lastIndexOf('\n');
    return { line, column };
};

const getLineStart = (text, index) => text.lastIndexOf('\n', Math.max(0, index - 1)) + 1;

const getLineEnd = (text, index) => {
    const nextBreak = text.indexOf('\n', index);
    return nextBreak === -1 ? text.length : nextBreak;
};

const getSelectionLineRange = (text, start, end) => ({
    start: getLineStart(text, start),
    end: getLineEnd(text, end),
});

const isWordBoundary = (char) => !char || !/[a-zA-Z0-9_$]/.test(char);

const findAllMatches = (code, findText, { caseSensitive, wholeWord, regexMode }) => {
    if (!findText) return [];
    const flags = caseSensitive ? 'g' : 'gi';
    let regex;
    try {
        regex = new RegExp(regexMode ? findText : escapeRegExp(findText), flags);
    } catch {
        return [];
    }

    const matches = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
        if (match[0] === '') {
            regex.lastIndex += 1;
            continue;
        }
        const start = match.index;
        const end = start + match[0].length;
        if (!wholeWord || (isWordBoundary(code[start - 1]) && isWordBoundary(code[end]))) {
            matches.push({ start, end, text: match[0] });
        }
    }
    return matches;
};

const getTokenAt = (text, cursor) => {
    let start = cursor - 1;
    while (start >= 0 && /[a-zA-Z0-9_$]/.test(text[start])) start -= 1;
    const tokenStart = start + 1;
    return {
        token: text.slice(tokenStart, cursor),
        start: tokenStart,
    };
};

const collectCodeWords = (code) => {
    const words = new Set([...KEYWORDS, ...Object.keys(SNIPPETS)]);
    const moduleRegex = /\b(?:module|wire|reg|logic|input|output|inout)\b\s+(?:signed\s+)?(?:\[[^\]]+\]\s+)?([a-zA-Z_][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = moduleRegex.exec(code)) !== null) words.add(match[1]);
    return Array.from(words).sort((a, b) => a.localeCompare(b));
};

const replaceSelection = (code, start, end, insert) => ({
    code: code.slice(0, start) + insert + code.slice(end),
    cursorStart: start + insert.length,
    cursorEnd: start + insert.length,
});

const FullCodeModal = ({
    fullCodeModalOpen,
    setFullCodeModalOpen,
    localCode,
    setLocalCode,
    theme,
    highlightVerilogCode,
    editorTitle = 'Verilog IDE',
    onSave,
    saveLabel = 'Save',
    saveDisabled = false,
    hasUnsavedChanges = false,
}) => {
    const codeAreaRef = useRef(null);
    const lineNumRef = useRef(null);
    const minimapRef = useRef(null);
    const findInputRef = useRef(null);
    const goToInputRef = useRef(null);

    const [cursorPos, setCursorPos] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);
    const [wordWrap, setWordWrap] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [findWidgetOpen, setFindWidgetOpen] = useState(false);
    const [replaceExpanded, setReplaceExpanded] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [regexMode, setRegexMode] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [goToLineOpen, setGoToLineOpen] = useState(false);
    const [goToLineText, setGoToLineText] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Ready');

    const isDark = theme === 'dark';
    const editorBg = isDark ? '#0d1117' : '#ffffff';
    const sideBg = isDark ? '#010409' : '#f6f8fa';
    const titleBg = isDark ? '#161b22' : '#f6f8fa';
    const panelBg = isDark ? '#161b22' : '#ffffff';
    const borderColor = isDark ? '#30363d' : '#d0d7de';
    const textColor = isDark ? '#e6edf3' : '#24292f';
    const mutedColor = isDark ? '#7d8590' : '#6e7781';
    const accentColor = isDark ? '#2f81f7' : '#0969da';
    const activeLineColor = isDark ? 'rgba(56,139,253,0.10)' : 'rgba(9,105,218,0.08)';
    const selectionColor = isDark ? 'rgba(56,139,253,0.36)' : 'rgba(9,105,218,0.22)';
    const lineHeight = 22;
    const editorFontFamily = 'Consolas, "SF Mono", Menlo, Monaco, monospace';

    const lineCount = useMemo(() => Math.max(1, localCode.split('\n').length), [localCode]);
    const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);
    const { line: currentLine, column: currentCol } = useMemo(() => getLineColumn(localCode, cursorPos), [localCode, cursorPos]);
    const activeLineTop = (currentLine - 1) * lineHeight;
    const codeWords = useMemo(() => collectCodeWords(localCode), [localCode]);
    const findMatches = useMemo(
        () => findAllMatches(localCode, findText, { caseSensitive, wholeWord, regexMode }),
        [localCode, findText, caseSensitive, wholeWord, regexMode]
    );
    const currentMatchIndex = useMemo(() => {
        const selected = findMatches.findIndex((match) => match.start === cursorPos && match.end === selectionEnd);
        return selected >= 0 ? selected : findMatches.findIndex((match) => match.start >= cursorPos);
    }, [cursorPos, findMatches, selectionEnd]);
    const documentSymbols = useMemo(() => {
        const symbols = [];
        const moduleRegex = /\bmodule\s+([a-zA-Z_][a-zA-Z0-9_$]*)/g;
        let match;
        while ((match = moduleRegex.exec(localCode)) !== null) {
            symbols.push({ name: match[1], index: match.index });
        }
        return symbols;
    }, [localCode]);

    const editorTextStyle = {
        margin: 0,
        padding: 0,
        fontFamily: editorFontFamily,
        fontSize: '14px',
        lineHeight: `${lineHeight}px`,
        tabSize: 4,
        fontVariantLigatures: 'none',
        fontFeatureSettings: '"liga" 0, "calt" 0',
        whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
        wordBreak: wordWrap ? 'break-word' : 'normal',
        overflowWrap: wordWrap ? 'anywhere' : 'normal',
    };

    const setSelection = (start, end = start) => {
        requestAnimationFrame(() => {
            const textarea = codeAreaRef.current;
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(start, end);
            setCursorPos(start);
            setSelectionEnd(end);
        });
    };

    const applyEdit = (nextCode, nextStart, nextEnd = nextStart, message = 'Edited') => {
        setLocalCode(nextCode);
        setStatusMessage(message);
        setSelection(nextStart, nextEnd);
    };

    const requestClose = () => {
        if (hasUnsavedChanges && !window.confirm('Discard unsaved RTL changes?')) return;
        setFullCodeModalOpen(false);
    };

    const handleScroll = (event) => {
        const scrollTop = event.currentTarget.scrollTop;
        if (lineNumRef.current) lineNumRef.current.scrollTop = scrollTop;
        if (minimapRef.current) minimapRef.current.scrollTop = scrollTop * 0.14;
    };

    const syncCursor = (event) => {
        setCursorPos(event.currentTarget.selectionStart || 0);
        setSelectionEnd(event.currentTarget.selectionEnd || 0);
    };

    const updateSuggestions = (code, cursor) => {
        const { token } = getTokenAt(code, cursor);
        if (!token || token.length < 1) {
            setSuggestions([]);
            return;
        }
        const next = codeWords.filter((word) => word !== token && word.toLowerCase().startsWith(token.toLowerCase())).slice(0, 12);
        setSuggestions(next);
        setSuggestionIndex(0);
    };

    const handleCodeChange = (event) => {
        const nextCode = event.target.value;
        const nextCursor = event.target.selectionStart || 0;
        setLocalCode(nextCode);
        setCursorPos(nextCursor);
        setSelectionEnd(event.target.selectionEnd || nextCursor);
        updateSuggestions(nextCode, nextCursor);
        setStatusMessage('Edited');
    };

    const focusFind = (expandReplace = false) => {
        setFindWidgetOpen(true);
        setReplaceExpanded(expandReplace);
        requestAnimationFrame(() => {
            findInputRef.current?.focus();
            findInputRef.current?.select();
        });
    };

    const focusGoToLine = () => {
        setGoToLineOpen(true);
        setGoToLineText(String(currentLine));
        requestAnimationFrame(() => {
            goToInputRef.current?.focus();
            goToInputRef.current?.select();
        });
    };

    const goToMatch = (direction = 1) => {
        if (findMatches.length === 0) {
            setStatusMessage('No matches');
            return;
        }
        const baseIndex = currentMatchIndex >= 0 ? currentMatchIndex : 0;
        const nextIndex = (baseIndex + direction + findMatches.length) % findMatches.length;
        const match = findMatches[nextIndex];
        setSelection(match.start, match.end);
        setStatusMessage(`${nextIndex + 1} of ${findMatches.length}`);
    };

    const replaceCurrent = () => {
        if (findMatches.length === 0) return;
        const index = currentMatchIndex >= 0 ? currentMatchIndex : 0;
        const match = findMatches[index];
        const next = replaceSelection(localCode, match.start, match.end, replaceText);
        applyEdit(next.code, next.cursorStart, next.cursorEnd, 'Replaced match');
    };

    const replaceAll = () => {
        if (findMatches.length === 0) return;
        let nextCode = '';
        let cursor = 0;
        findMatches.forEach((match) => {
            nextCode += localCode.slice(cursor, match.start) + replaceText;
            cursor = match.end;
        });
        nextCode += localCode.slice(cursor);
        applyEdit(nextCode, 0, 0, `Replaced ${findMatches.length} matches`);
    };

    const formatDocument = () => {
        const formatted = formatVerilog(localCode);
        applyEdit(formatted, Math.min(cursorPos, formatted.length), Math.min(selectionEnd, formatted.length), 'Formatted document');
    };

    const toggleLineComment = () => {
        const textarea = codeAreaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const range = getSelectionLineRange(localCode, start, end);
        const selected = localCode.slice(range.start, range.end);
        const lines = selected.split('\n');
        const meaningfulLines = lines.filter((line) => line.trim().length > 0);
        const shouldUncomment = meaningfulLines.length > 0 && meaningfulLines.every((line) => line.trimStart().startsWith('//'));
        const changed = lines.map((line) => {
            if (!line.trim()) return line;
            if (shouldUncomment) return line.replace(/^(\s*)\/\/\s?/, '$1');
            return line.replace(/^(\s*)/, '$1// ');
        }).join('\n');
        const nextCode = localCode.slice(0, range.start) + changed + localCode.slice(range.end);
        applyEdit(nextCode, range.start, range.start + changed.length, shouldUncomment ? 'Uncommented lines' : 'Commented lines');
    };

    const indentSelection = (outdent = false) => {
        const textarea = codeAreaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const hasMultilineSelection = start !== end && localCode.slice(start, end).includes('\n');
        if (!hasMultilineSelection && !outdent) {
            const next = replaceSelection(localCode, start, end, '    ');
            applyEdit(next.code, next.cursorStart, next.cursorEnd, 'Indented');
            return;
        }
        const range = getSelectionLineRange(localCode, start, end);
        const selected = localCode.slice(range.start, range.end);
        const changed = selected.split('\n').map((line) => {
            if (!outdent) return line ? `    ${line}` : line;
            if (line.startsWith('    ')) return line.slice(4);
            if (line.startsWith('\t')) return line.slice(1);
            if (line.startsWith('  ')) return line.slice(2);
            return line;
        }).join('\n');
        const nextCode = localCode.slice(0, range.start) + changed + localCode.slice(range.end);
        applyEdit(nextCode, range.start, range.start + changed.length, outdent ? 'Outdented' : 'Indented');
    };

    const duplicateLine = (direction = 1) => {
        const textarea = codeAreaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const range = getSelectionLineRange(localCode, start, textarea.selectionEnd);
        const line = localCode.slice(range.start, range.end);
        const insert = direction > 0 ? `${line}\n` : `${line}\n`;
        const insertAt = direction > 0 ? range.end : range.start;
        const nextCode = localCode.slice(0, insertAt) + (direction > 0 ? `\n${line}` : insert) + localCode.slice(insertAt);
        const nextCursor = direction > 0 ? insertAt + 1 : range.start;
        applyEdit(nextCode, nextCursor, nextCursor + line.length, 'Duplicated line');
    };

    const deleteLine = () => {
        const textarea = codeAreaRef.current;
        if (!textarea) return;
        const range = getSelectionLineRange(localCode, textarea.selectionStart, textarea.selectionEnd);
        const deleteEnd = localCode[range.end] === '\n' ? range.end + 1 : range.end;
        const nextCode = localCode.slice(0, range.start) + localCode.slice(deleteEnd);
        applyEdit(nextCode, range.start, range.start, 'Deleted line');
    };

    const moveLine = (direction = 1) => {
        const textarea = codeAreaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const range = getSelectionLineRange(localCode, start, end);
        const selected = localCode.slice(range.start, range.end);
        if (direction < 0) {
            if (range.start === 0) return;
            const previousStart = getLineStart(localCode, range.start - 1);
            const previous = localCode.slice(previousStart, range.start - 1);
            const nextCode = localCode.slice(0, previousStart) + selected + '\n' + previous + localCode.slice(range.end);
            applyEdit(nextCode, previousStart, previousStart + selected.length, 'Moved line up');
            return;
        }
        const nextLineStart = range.end + 1;
        if (nextLineStart >= localCode.length) return;
        const nextLineEnd = getLineEnd(localCode, nextLineStart);
        const nextLine = localCode.slice(nextLineStart, nextLineEnd);
        const nextCode = localCode.slice(0, range.start) + nextLine + '\n' + selected + localCode.slice(nextLineEnd);
        const nextSelectionStart = range.start + nextLine.length + 1;
        applyEdit(nextCode, nextSelectionStart, nextSelectionStart + selected.length, 'Moved line down');
    };

    const selectLine = () => {
        const textarea = codeAreaRef.current;
        if (!textarea) return;
        const range = getSelectionLineRange(localCode, textarea.selectionStart, textarea.selectionEnd);
        setSelection(range.start, range.end);
    };

    const insertSuggestion = (suggestion) => {
        const textarea = codeAreaRef.current;
        if (!textarea || !suggestion) return;
        const start = textarea.selectionStart;
        const { token, start: tokenStart } = getTokenAt(localCode, start);
        if (!token) return;
        const snippet = SNIPPETS[suggestion];
        if (snippet) {
            const insert = snippet.template.replace(/\$\{\d+:([^}]+)\}/g, '$1');
            const next = replaceSelection(localCode, tokenStart, start, insert);
            applyEdit(next.code, tokenStart + Math.min(snippet.cursor, insert.length), tokenStart + Math.min(snippet.cursor, insert.length), `Inserted ${suggestion} snippet`);
        } else {
            const next = replaceSelection(localCode, tokenStart, start, suggestion);
            applyEdit(next.code, next.cursorStart, next.cursorEnd, `Completed ${suggestion}`);
        }
        setSuggestions([]);
    };

    const goToLine = () => {
        const requested = Math.max(1, Math.min(lineCount, Number.parseInt(goToLineText, 10) || 1));
        const lines = localCode.split('\n');
        const index = lines.slice(0, requested - 1).reduce((sum, line) => sum + line.length + 1, 0);
        setGoToLineOpen(false);
        setSelection(index);
        setStatusMessage(`Line ${requested}`);
    };

    const openCommandPalette = () => {
        setCommandPaletteOpen(true);
        setCommandQuery('');
    };

    const executeCommand = (command) => {
        switch (command.id) {
            case 'format':
                formatDocument();
                break;
            case 'save':
                if (typeof onSave === 'function' && !saveDisabled) onSave();
                break;
            case 'find':
                focusFind(false);
                break;
            case 'replace':
                focusFind(true);
                break;
            case 'goto':
                focusGoToLine();
                break;
            case 'wrap':
                setWordWrap((value) => !value);
                break;
            case 'minimap':
                setShowMinimap((value) => !value);
                break;
            case 'comment':
                toggleLineComment();
                break;
            case 'duplicate':
                duplicateLine(1);
                break;
            case 'moveUp':
                moveLine(-1);
                break;
            case 'moveDown':
                moveLine(1);
                break;
            case 'deleteLine':
                deleteLine();
                break;
            case 'selectLine':
                selectLine();
                break;
            default:
                break;
        }
        setCommandPaletteOpen(false);
        setCommandQuery('');
    };

    const commandDefinitions = [
        { id: 'format', label: 'Format Document', shortcut: 'Alt+Shift+F' },
        { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', disabled: typeof onSave !== 'function' || saveDisabled },
        { id: 'find', label: 'Find', shortcut: 'Ctrl+F' },
        { id: 'replace', label: 'Replace', shortcut: 'Ctrl+H' },
        { id: 'goto', label: 'Go to Line', shortcut: 'Ctrl+G' },
        { id: 'wrap', label: 'Toggle Word Wrap', shortcut: 'Alt+Z' },
        { id: 'minimap', label: 'Toggle Minimap', shortcut: '' },
        { id: 'comment', label: 'Toggle Line Comment', shortcut: 'Ctrl+/' },
        { id: 'duplicate', label: 'Duplicate Line Down', shortcut: 'Shift+Alt+↓' },
        { id: 'moveUp', label: 'Move Line Up', shortcut: 'Alt+↑' },
        { id: 'moveDown', label: 'Move Line Down', shortcut: 'Alt+↓' },
        { id: 'deleteLine', label: 'Delete Line', shortcut: 'Ctrl+Shift+K' },
        { id: 'selectLine', label: 'Select Current Line', shortcut: 'Ctrl+L' },
    ];
    const visibleCommands = commandDefinitions.filter((command) =>
        command.label.toLowerCase().includes(commandQuery.trim().toLowerCase())
    );

    const handleEditorKeyDown = (event) => {
        const textarea = event.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (typeof onSave === 'function' && !saveDisabled) onSave();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            focusFind(false);
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
            event.preventDefault();
            focusFind(true);
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
            event.preventDefault();
            focusGoToLine();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            openCommandPalette();
            return;
        }
        if (event.key === 'F1') {
            event.preventDefault();
            openCommandPalette();
            return;
        }
        if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            formatDocument();
            return;
        }
        if (event.altKey && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            setWordWrap((value) => !value);
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            toggleLineComment();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            deleteLine();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            selectLine();
            return;
        }
        if (event.altKey && event.key === 'ArrowUp') {
            event.preventDefault();
            moveLine(-1);
            return;
        }
        if (event.altKey && event.key === 'ArrowDown' && !event.shiftKey) {
            event.preventDefault();
            moveLine(1);
            return;
        }
        if (event.altKey && event.shiftKey && event.key === 'ArrowDown') {
            event.preventDefault();
            duplicateLine(1);
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            indentSelection(event.shiftKey);
            return;
        }
        if (suggestions.length > 0 && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
            if (event.key === 'Escape') {
                event.preventDefault();
                setSuggestions([]);
                return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setSuggestionIndex((index) => {
                    const next = index + (event.key === 'ArrowDown' ? 1 : -1);
                    if (next < 0) return suggestions.length - 1;
                    if (next >= suggestions.length) return 0;
                    return next;
                });
                return;
            }
            event.preventDefault();
            insertSuggestion(suggestions[suggestionIndex]);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const lineStart = getLineStart(localCode, start);
            const currentLineText = localCode.slice(lineStart, start);
            const indent = currentLineText.match(/^(\s*)/)?.[1] || '';
            const shouldIndent = /\b(begin|case|module|function|task|generate|fork)\b\s*$/.test(currentLineText.trim()) || currentLineText.trim().endsWith('(');
            const insert = `\n${indent}${shouldIndent ? '    ' : ''}`;
            const next = replaceSelection(localCode, start, end, insert);
            applyEdit(next.code, next.cursorStart, next.cursorEnd, 'New line');
            return;
        }
        const pairs = { '(': ')', '{': '}', '[': ']', '"': '"' };
        if (pairs[event.key]) {
            event.preventDefault();
            const selected = localCode.slice(start, end);
            const insert = event.key + selected + pairs[event.key];
            const next = replaceSelection(localCode, start, end, insert);
            applyEdit(next.code, start + 1, start + 1 + selected.length, 'Inserted pair');
        }
    };

    if (!fullCodeModalOpen) return null;

    const buttonStyle = (active = false) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '28px',
        padding: '4px 9px',
        borderRadius: '7px',
        border: `1px solid ${active ? (isDark ? 'rgba(47,129,247,0.55)' : 'rgba(9,105,218,0.35)') : 'transparent'}`,
        background: active ? (isDark ? 'rgba(47,129,247,0.16)' : 'rgba(9,105,218,0.09)') : 'transparent',
        color: active ? textColor : mutedColor,
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 700,
    });

    const inputStyle = {
        height: '30px',
        border: `1px solid ${borderColor}`,
        borderRadius: '7px',
        background: isDark ? '#0d1117' : '#ffffff',
        color: textColor,
        outline: 'none',
        padding: '0 8px',
        fontSize: '12px',
        fontFamily: 'inherit',
    };

    return createPortal(
        <div
            onClick={(event) => event.target === event.currentTarget && requestClose()}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && !findWidgetOpen && !commandPaletteOpen && !goToLineOpen) requestClose();
            }}
            tabIndex={-1}
            style={{
                position: 'fixed',
                inset: 0,
                background: isDark ? 'rgba(1,4,9,0.74)' : 'rgba(15,23,42,0.28)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(7px)',
            }}
        >
            <div
                style={{
                    width: '92vw',
                    height: '90vh',
                    background: editorBg,
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isDark ? '0 28px 90px rgba(0,0,0,0.68)' : '0 28px 90px rgba(15,23,42,0.22)',
                    border: `1px solid ${borderColor}`,
                    overflow: 'hidden',
                    position: 'relative',
                    color: textColor,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
            >
                <div
                    style={{
                        height: '40px',
                        background: titleBg,
                        borderBottom: `1px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        userSelect: 'none',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', minWidth: 0 }}>
                        <button
                            type="button"
                            onClick={() => setCommandPaletteOpen(true)}
                            title="Command Palette (Ctrl+Shift+P)"
                            style={{
                                width: '46px',
                                border: 'none',
                                borderRight: `1px solid ${borderColor}`,
                                background: sideBg,
                                color: mutedColor,
                                cursor: 'pointer',
                                fontSize: '16px',
                            }}
                        >
                            ≡
                        </button>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                maxWidth: '420px',
                                padding: '0 14px',
                                background: isDark ? '#0d1117' : '#ffffff',
                                borderRight: `1px solid ${borderColor}`,
                                color: textColor,
                                fontSize: '12px',
                                fontWeight: 800,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {editorTitle}
                            {hasUnsavedChanges ? <span style={{ color: mutedColor, marginLeft: '7px' }}>●</span> : null}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}>
                        <button type="button" onClick={() => focusFind(false)} style={buttonStyle(findWidgetOpen && !replaceExpanded)}>
                            Find
                        </button>
                        <button type="button" onClick={() => focusFind(true)} style={buttonStyle(findWidgetOpen && replaceExpanded)}>
                            Replace
                        </button>
                        <button type="button" onClick={() => setWordWrap((value) => !value)} style={buttonStyle(wordWrap)}>
                            Wrap
                        </button>
                        <button type="button" onClick={() => setShowMinimap((value) => !value)} style={buttonStyle(showMinimap)}>
                            Minimap
                        </button>
                        {typeof onSave === 'function' && (
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saveDisabled}
                                style={{
                                    ...buttonStyle(!saveDisabled),
                                    borderColor: saveDisabled ? 'transparent' : accentColor,
                                    background: saveDisabled ? 'transparent' : accentColor,
                                    color: saveDisabled ? mutedColor : '#ffffff',
                                    cursor: saveDisabled ? 'default' : 'pointer',
                                }}
                            >
                                {saveLabel}
                            </button>
                        )}
                        <button type="button" onClick={requestClose} style={{ ...buttonStyle(false), width: '30px', padding: 0 }}>
                            <IconX size={16} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', minHeight: 0, flex: 1 }}>
                    <div
                        style={{
                            width: '46px',
                            background: sideBg,
                            borderRight: `1px solid ${borderColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            paddingTop: '10px',
                            gap: '9px',
                            color: mutedColor,
                            fontSize: '15px',
                        }}
                    >
                        <button type="button" title="Explorer" style={buttonStyle(true)}>⌘</button>
                        <button type="button" title="Search" onClick={() => focusFind(false)} style={buttonStyle(false)}>⌕</button>
                        <button type="button" title="Commands" onClick={openCommandPalette} style={buttonStyle(false)}>›</button>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {findWidgetOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: showMinimap ? '136px' : '18px',
                                    width: replaceExpanded ? '392px' : '350px',
                                    background: panelBg,
                                    border: `1px solid ${borderColor}`,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
                                    borderRadius: '5px',
                                    padding: '8px',
                                    zIndex: 30,
                                    display: 'grid',
                                    gap: '7px',
                                }}
                            >
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <input
                                        ref={findInputRef}
                                        placeholder="Find"
                                        value={findText}
                                        onChange={(event) => setFindText(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') goToMatch(event.shiftKey ? -1 : 1);
                                            if (event.key === 'Escape') setFindWidgetOpen(false);
                                        }}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <span style={{ color: mutedColor, fontSize: '11px', minWidth: '56px', textAlign: 'right' }}>
                                        {findMatches.length ? `${Math.max(1, currentMatchIndex + 1)}/${findMatches.length}` : '0/0'}
                                    </span>
                                    <button type="button" onClick={() => goToMatch(-1)} style={buttonStyle(false)}>↑</button>
                                    <button type="button" onClick={() => goToMatch(1)} style={buttonStyle(false)}>↓</button>
                                    <button type="button" onClick={() => setFindWidgetOpen(false)} style={buttonStyle(false)}>×</button>
                                </div>
                                {replaceExpanded && (
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <input
                                            placeholder="Replace"
                                            value={replaceText}
                                            onChange={(event) => setReplaceText(event.target.value)}
                                            style={{ ...inputStyle, flex: 1 }}
                                        />
                                        <button type="button" onClick={replaceCurrent} style={buttonStyle(false)}>Replace</button>
                                        <button type="button" onClick={replaceAll} style={buttonStyle(false)}>All</button>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button type="button" onClick={() => setCaseSensitive((value) => !value)} style={buttonStyle(caseSensitive)}>Aa</button>
                                    <button type="button" onClick={() => setWholeWord((value) => !value)} style={buttonStyle(wholeWord)}>Word</button>
                                    <button type="button" onClick={() => setRegexMode((value) => !value)} style={buttonStyle(regexMode)}>{'.*'}</button>
                                </div>
                            </div>
                        )}

                        {commandPaletteOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '18px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '520px',
                                    maxWidth: 'calc(100% - 32px)',
                                    background: panelBg,
                                    border: `1px solid ${borderColor}`,
                                    boxShadow: '0 14px 40px rgba(0,0,0,0.42)',
                                    borderRadius: '7px',
                                    zIndex: 40,
                                    overflow: 'hidden',
                                }}
                            >
                                <input
                                    autoFocus
                                    placeholder="Type a command..."
                                    value={commandQuery}
                                    onChange={(event) => setCommandQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') setCommandPaletteOpen(false);
                                        if (event.key === 'Enter' && visibleCommands[0] && !visibleCommands[0].disabled) executeCommand(visibleCommands[0]);
                                    }}
                                    style={{
                                        ...inputStyle,
                                        width: '100%',
                                        height: '38px',
                                        border: 'none',
                                        borderBottom: `1px solid ${borderColor}`,
                                        borderRadius: 0,
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '5px' }}>
                                    {visibleCommands.map((command) => (
                                        <button
                                            key={command.label}
                                            type="button"
                                            disabled={command.disabled}
                                            onClick={() => executeCommand(command)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                color: command.disabled ? mutedColor : textColor,
                                                cursor: command.disabled ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                            }}
                                        >
                                            <span>{command.label}</span>
                                            <span style={{ color: mutedColor, fontSize: '11px' }}>{command.shortcut}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {goToLineOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '18px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '260px',
                                    background: panelBg,
                                    border: `1px solid ${borderColor}`,
                                    boxShadow: '0 14px 40px rgba(0,0,0,0.42)',
                                    borderRadius: '7px',
                                    padding: '10px',
                                    zIndex: 45,
                                }}
                            >
                                <input
                                    ref={goToInputRef}
                                    placeholder={`Line 1-${lineCount}`}
                                    value={goToLineText}
                                    onChange={(event) => setGoToLineText(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') setGoToLineOpen(false);
                                        if (event.key === 'Enter') goToLine();
                                    }}
                                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', flex: 1, minHeight: 0, background: editorBg }}>
                            <div
                                ref={lineNumRef}
                                style={{
                                    width: '62px',
                                    background: isDark ? '#0b1017' : '#f6f8fa',
                                    color: mutedColor,
                                    overflow: 'hidden',
                                    paddingTop: '14px',
                                    userSelect: 'none',
                                    flexShrink: 0,
                                    borderRight: `1px solid ${borderColor}`,
                                }}
                            >
                                {lineNumbers.map((num) => (
                                    <div
                                        key={num}
                                        style={{
                                            height: `${lineHeight}px`,
                                            lineHeight: `${lineHeight}px`,
                                            paddingRight: '12px',
                                            fontFamily: editorFontFamily,
                                            fontSize: '12px',
                                            textAlign: 'right',
                                            color: num === currentLine ? accentColor : mutedColor,
                                            fontWeight: num === currentLine ? 800 : 500,
                                        }}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>

                            <div onScroll={handleScroll} style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'auto' }}>
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '14px',
                                        left: 0,
                                        right: 0,
                                        height: `${lineHeight}px`,
                                        background: activeLineColor,
                                        transform: `translateY(${activeLineTop}px)`,
                                        pointerEvents: 'none',
                                        zIndex: 1,
                                    }}
                                />
                                {findMatches.map((match, index) => {
                                    const before = localCode.slice(0, match.start);
                                    const matchLine = before.split('\n').length;
                                    const lineStart = before.lastIndexOf('\n') + 1;
                                    const col = match.start - lineStart;
                                    return (
                                        <span
                                            key={`${match.start}_${match.end}`}
                                            style={{
                                                position: 'absolute',
                                                top: 14 + (matchLine - 1) * lineHeight,
                                                left: 14 + col * 8.4,
                                                height: `${lineHeight}px`,
                                                minWidth: `${Math.max(1, match.end - match.start) * 8.4}px`,
                                                background: index === currentMatchIndex ? 'rgba(234,179,8,0.45)' : 'rgba(234,179,8,0.22)',
                                                border: index === currentMatchIndex ? '1px solid rgba(234,179,8,0.85)' : '1px solid transparent',
                                                borderRadius: '2px',
                                                pointerEvents: 'none',
                                                zIndex: 1,
                                            }}
                                        />
                                    );
                                })}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr',
                                        gridTemplateRows: 'minmax(100%, auto)',
                                        padding: '14px',
                                        minHeight: '100%',
                                        minWidth: wordWrap ? '100%' : 'max-content',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <pre
                                        style={{
                                            ...editorTextStyle,
                                            gridArea: '1 / 1',
                                            minHeight: '100%',
                                            color: textColor,
                                            pointerEvents: 'none',
                                            zIndex: 0,
                                        }}
                                        dangerouslySetInnerHTML={{ __html: highlightVerilogCode(localCode + '\n', theme) }}
                                    />
                                    <textarea
                                        ref={codeAreaRef}
                                        value={localCode}
                                        onChange={handleCodeChange}
                                        onClick={syncCursor}
                                        onKeyUp={syncCursor}
                                        onSelect={syncCursor}
                                        onKeyDown={handleEditorKeyDown}
                                        spellCheck="false"
                                        autoFocus
                                        style={{
                                            ...editorTextStyle,
                                            gridArea: '1 / 1',
                                            width: '100%',
                                            minWidth: '100%',
                                            height: '100%',
                                            minHeight: '100%',
                                            boxSizing: 'border-box',
                                            background: 'transparent',
                                            color: 'transparent',
                                            caretColor: isDark ? '#e6edf3' : '#24292f',
                                            resize: 'none',
                                            border: 'none',
                                            outline: 'none',
                                            overflow: 'hidden',
                                            zIndex: 2,
                                            selectionColor,
                                        }}
                                    />
                                    {suggestions.length > 0 && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 14 + activeLineTop + lineHeight,
                                                left: 14 + currentCol * 8.4,
                                                background: panelBg,
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: '4px',
                                                boxShadow: '0 8px 22px rgba(0,0,0,0.35)',
                                                zIndex: 20,
                                                minWidth: '220px',
                                                maxHeight: '240px',
                                                overflowY: 'auto',
                                                fontFamily: editorFontFamily,
                                                fontSize: '12px',
                                            }}
                                        >
                                            {suggestions.map((item, index) => (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onMouseEnter={() => setSuggestionIndex(index)}
                                                    onMouseDown={(event) => {
                                                        event.preventDefault();
                                                        insertSuggestion(item);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        border: 'none',
                                                        background: index === suggestionIndex ? (isDark ? '#04395e' : '#dbeafe') : 'transparent',
                                                        color: textColor,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        padding: '6px 10px',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    <span>{item}</span>
                                                    <span style={{ color: mutedColor }}>
                                                        {SNIPPETS[item] ? 'snippet' : VERILOG_OPERATORS.includes(item) ? 'keyword' : 'symbol'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {showMinimap && (
                                <div
                                    ref={minimapRef}
                                    style={{
                                        width: '118px',
                                        background: isDark ? '#0b1017' : '#f6f8fa',
                                        borderLeft: `1px solid ${borderColor}`,
                                        overflow: 'hidden',
                                        userSelect: 'none',
                                        flexShrink: 0,
                                        padding: '10px 8px',
                                    }}
                                >
                                    <pre
                                        style={{
                                            margin: 0,
                                            fontFamily: editorFontFamily,
                                            fontSize: '3px',
                                            lineHeight: 1.45,
                                            color: mutedColor,
                                            whiteSpace: 'pre',
                                            opacity: isDark ? 0.58 : 0.72,
                                        }}
                                    >
                                        {localCode}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        height: '26px',
                        background: isDark ? '#0969da' : '#0969da',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 10px',
                        fontSize: '11px',
                        userSelect: 'none',
                    }}
                >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span>{statusMessage}</span>
                        <span>{documentSymbols.length > 0 ? documentSymbols.map((symbol) => symbol.name).join(' › ') : 'No module symbols'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span>Ln {currentLine}, Col {currentCol}</span>
                        <span>{lineCount} lines</span>
                        <span>Spaces: 4</span>
                        <span>Verilog</span>
                        <span>UTF-8</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FullCodeModal;

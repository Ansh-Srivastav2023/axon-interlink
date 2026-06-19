export const highlightVerilogCode = (rawCode, currentTheme) => {
    if (!rawCode) return '';

    let escaped = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const isDark = currentTheme === 'dark';

    const styles = {
        keyword: isDark ? 'color: #3b82f6; font-weight: bold;' : 'color: #2563eb; font-weight: bold;',
        type: isDark ? 'color: #a855f7; font-weight: bold;' : 'color: #7c3aed; font-weight: bold;',
        literal: isDark ? 'color: #10b981;' : 'color: #16a34a;',
        comment: isDark ? 'color: #64748b; font-style: italic;' : 'color: #94a3b8; font-style: italic;',
        system: isDark ? 'color: #f59e0b;' : 'color: #d97706;'
    };

    escaped = escaped.replace(/(\/\/.*)/g, `<span style="${styles.comment}">$1</span>`);

    const keywords = /\b(module|endmodule|assign|always|case|endcase|begin|end|if|else|default)\b/g;
    escaped = escaped.replace(keywords, `<span style="${styles.keyword}">$1</span>`);

    const datatypes = /\b(input|output|wire|reg|logic)\b/g;
    escaped = escaped.replace(datatypes, `<span style="${styles.type}">$1</span>`);

    const literals = /(\b\d+'[bBoOhHdD][0-9a-fA-FzZxX_]+|\b\d+\b)/g;
    // We use a lookahead check to ensure we don't accidentally color digits buried inside HTML style tags
    escaped = escaped.replace(literals, (match) => {
        if (match.startsWith('color') || match.startsWith('#')) return match;
        return `<span style="${styles.literal}">${match}</span>`;
    });

    escaped = escaped.replace(/(`\w+)/g, `<span style="${styles.system}">$1</span>`);
    escaped = escaped.replace(/(\$\w+)/g, `<span style="${styles.system}">$1</span>`);

    return escaped;
};


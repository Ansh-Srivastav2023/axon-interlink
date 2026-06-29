export const highlightVerilogCode = (rawCode, currentTheme) => {
    if (!rawCode) return '';

    let escaped = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const isDark = currentTheme === 'dark';

    const styles = {
        keyword: isDark ? 'color: #3b82f6; font-weight: bold;' : 'color: #2563eb; font-weight: bold;',
        type:    isDark ? 'color: #a855f7; font-weight: bold;' : 'color: #7c3aed; font-weight: bold;',
        literal: isDark ? 'color: #10b981;' : 'color: #16a34a;',
        string:  isDark ? 'color: #f59e0b;' : 'color: #d97706;',
        comment: isDark ? 'color: #64748b; font-style: italic;' : 'color: #94a3b8; font-style: italic;',
        system:  isDark ? 'color: #f59e0b;' : 'color: #d97706;',
        moduleName: isDark ? 'color: #60a5fa; font-weight: 600;' : 'color: #2563eb; font-weight: 600;', // optional distinct color
    };

    // ---------- Keyword lists ----------
    const keywords = [
        'module', 'endmodule', 'interface', 'endinterface', 'package', 'endpackage',
        'program', 'endprogram', 'checker', 'endchecker', 'primitive', 'endprimitive',
        'class', 'endclass', 'function', 'endfunction', 'task', 'endtask',
        'generate', 'endgenerate', 'always', 'always_comb', 'always_ff', 'always_latch',
        'initial', 'final', 'if', 'else', 'case', 'casex', 'casez', 'endcase',
        'begin', 'end', 'fork', 'join', 'join_any', 'join_none',
        'for', 'while', 'do', 'foreach', 'repeat', 'forever',
        'wait', 'event', 'trigger', 'return', 'break', 'continue',
        'assert', 'assume', 'cover', 'property', 'sequence', 'randsequence',
        'with', 'inside', 'dist', 'solve', 'before', 'unique', 'priority',
        'constraint', 'randomize', 'pre_randomize', 'post_randomize'
    ];

    const types = [
        'input', 'output', 'inout', 'ref',
        'wire', 'reg', 'logic', 'bit', 'byte', 'shortint', 'int', 'longint',
        'integer', 'time', 'real', 'shortreal', 'void', 'string', 'chandle',
        'struct', 'enum', 'union', 'packed', 'unpacked',
        'signed', 'unsigned', 'static', 'automatic', 'local', 'protected',
        'virtual', 'pure', 'extern', 'covergroup', 'coverpoint', 'cross',
        'parameter', 'localparam', 'specparam', 'type', 'typedef', 'import', 'export',
        'modport', 'clocking', 'default', 'global', 'wildcard', 'rand', 'randc'
    ];

    const systemTasks = [
        'display', 'write', 'monitor', 'strobe', 'fopen', 'fclose', 'fdisplay',
        'fwrite', 'fmonitor', 'fstrobe', 'readmemh', 'readmemb', 'writememh',
        'writememb', 'finish', 'stop', 'exit', 'dumpfile', 'dumpvars', 'dumpall',
        'dumpon', 'dumpoff', 'dumpflush', 'dumplimit', 'dumplimit', 'scope',
        'showscope', 'printtimescale', 'timeformat', 'realtobits', 'bitstoreal',
        'itor', 'rtoi', 'signed', 'unsigned', 'bits'
    ];

    const directives = ['define', 'ifdef', 'ifndef', 'elsif', 'else', 'endif', 'include', 'undef', 'timescale'];

    // Build regex parts with capturing groups
    const parts = [
        `(\\/\\/[^\\n]*)`,                                     // 1 line comment
        `(\\/\\*[\\s\\S]*?\\*\\/)`,                           // 2 block comment
        `("(?:\\\\.|[^"\\n])*")`,                             // 3 double-quoted string
        `(\\b\\d+'[bBoOhHdD][0-9a-fA-FzZxX_]+|\\b\\d+\\b)`, // 4 literal
        `(\\b(?:module|interface|class|package|program|primitive|checker)\\s+\\w+)`, // 5 module declaration (whole)
        `(\\b(?:${keywords.join('|')})\\b)`,                  // 6 keyword
        `(\\b(?:${types.join('|')})\\b)`,                     // 7 type
        `(\\$(?:${systemTasks.join('|')})\\b)`,               // 8 $system_task
        `(\`(?:${directives.join('|')})\\b)`,                 // 9 `directive
        `(\\.\\w+)`,                                          // 10 hierarchical
        `(\\b(?:Ansh|ansh|Srivastav|srivastav|Axon|axon|Interlink|interlink|clk|rst_n|for|while)\\b)`, // 11 custom
        `(\\b(?:posedge|negedge)\\b)`                         // 12 edge
    ];

    const fullRegex = new RegExp(parts.join('|'), 'g');

    // Replace all matches in one pass
    escaped = escaped.replace(fullRegex, (match, lineCmt, blockCmt, str, lit, moduleDecl, kw, typ, sys, dir, hier, spec, edge) => {
        if (lineCmt) return `<span style="${styles.comment}">${lineCmt}</span>`;
        if (blockCmt) return `<span style="${styles.comment}">${blockCmt}</span>`;
        if (str) return `<span style="${styles.string}">${str}</span>`;
        if (lit) return `<span style="${styles.literal}">${lit}</span>`;

        // ---- Module declaration: style the keyword and the name separately ----
        if (moduleDecl) {
            const parts = moduleDecl.split(/\s+/);
            const keyword = parts[0];
            const name = parts.slice(1).join(' '); // in case there are multiple spaces, but typically just one
            // Style the keyword with keyword style, name with type style (or a dedicated moduleName style)
            return `<span style="${styles.keyword}">${keyword}</span> <span style="${styles.moduleName || styles.type}">${name}</span>`;
        }

        if (kw) return `<span style="${styles.keyword}">${kw}</span>`;
        if (typ) return `<span style="${styles.type}">${typ}</span>`;
        if (sys) return `<span style="${styles.system}">${sys}</span>`;
        if (dir) return `<span style="${styles.system}">${dir}</span>`;
        if (hier) return `<span style="${styles.system}">${hier}</span>`;
        if (spec) return `<span style="${styles.system}">${spec}</span>`;
        if (edge) return `<span style="${styles.keyword}">${edge}</span>`;
        return match;
    });

    return escaped;
};
export const highlightVerilogCode = (rawCode, currentTheme) => {
    if (!rawCode) return '';

    let escaped = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const isDark = currentTheme === 'dark';

    const styles = {
        keyword: isDark ? 'color: #ff7b72; font-weight: 700;' : 'color: #cf222e; font-weight: 700;',
        type: isDark ? 'color: #d2a8ff; font-weight: 700;' : 'color: #8250df; font-weight: 700;',
        literal: isDark ? 'color: #79c0ff;' : 'color: #0550ae;',
        string: isDark ? 'color: #a5d6ff;' : 'color: #0a3069;',
        comment: isDark ? 'color: #8b949e; font-style: italic;' : 'color: #6e7781; font-style: italic;',
        system: isDark ? 'color: #ffa657;' : 'color: #953800;',
        moduleName: isDark ? 'color: #7ee787; font-weight: 700;' : 'color: #116329; font-weight: 700;',
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
        'constraint', 'randomize', 'pre_randomize', 'post_randomize', 'assign'
    ];

    const types = [
        'input', 'output', 'inout', 'ref',
        'wire', 'reg', 'logic', 'bit', 'byte', 'shortint', 'int', 'longint',
        'integer', 'time', 'real', 'shortreal', 'void', 'string', 'chandle',
        'struct', 'enum', 'union', 'packed', 'unpacked', 
        'signed', 'unsigned', 'static', 'automatic', 'local', 'protected',
        'virtual', 'pure', 'extern', 'covergroup', 'coverpoint', 'cross',
        'parameter', 'localparam', 'specparam', 'type', 'typedef', 'import', 'export',
        'modport', 'clocking', 'default', 'global', 'wildcard', 'rand', 'randc', 'or'
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



/**
 * Parses a Verilog module declaration string and extracts ports.
 * Handles: input wire [15:0] a, output logic clk, etc.
 */
export const parseVerilogToPorts = (verilogCode) => {
    const inputs = [];
    const outputs = [];

    if (!verilogCode) return { inputs, outputs };

    // Regex to capture everything inside the module port parentheses: module name (...);
    const moduleRegex = /module\s+\w+\s*\(([\s\S]*?)\);/;
    const match = verilogCode.match(moduleRegex);
    if (!match) return { inputs, outputs };

    const portBody = match[1];
    // Split by commas, filtering out empty or commented lines
    const portLines = portBody.split(',').map(line => line.trim()).filter(line => line && !line.startsWith('//'));

    portLines.forEach(line => {
        // Regex to parse: [direction] [type] [optional bus width] [port_name]
        // Examples: "input wire [15:0] data_in", "output logic clk"
        const portRegex = /(input|output)\s+(?:wire|reg|logic)?\s*(?:\[(\d+):(\d+)\])?\s*([a-zA-Z_][a-zA-Z0-9_]*)/;
        const portMatch = line.match(portRegex);

        if (portMatch) {
            const direction = portMatch[1]; // "input" or "output"
            const msb = portMatch[2] ? parseInt(portMatch[2], 10) : 0;
            const lsb = portMatch[3] ? parseInt(portMatch[3], 10) : 0;
            const name = portMatch[4];
            const width = portMatch[2] ? (Math.abs(msb - lsb) + 1) : 1;

            const portObject = {
                name,
                width,
                msb,
                lsb
            };

            if (direction === 'input') {
                inputs.push(portObject);
            } else if (direction === 'output') {
                outputs.push(portObject);
            }
        }
    });

    return { inputs, outputs };
};

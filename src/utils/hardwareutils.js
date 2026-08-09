export const STANDARD_LIBRARY = {
    and_gate: { type: 'gate', gateShape: 'AND', inputs: 'a, b', outputs: 'y', code: `assign y = a & b;` },
    nand_gate: { type: 'gate', gateShape: 'NAND', inputs: 'a, b', outputs: 'y', code: `assign y = ~(a & b);` },
    or_gate: { type: 'gate', gateShape: 'OR', inputs: 'a, b', outputs: 'y', code: `assign y = a | b;` },
    nor_gate: { type: 'gate', gateShape: 'NOR', inputs: 'a, b', outputs: 'y', code: `assign y = ~(a | b);` },
    xor_gate: { type: 'gate', gateShape: 'XOR', inputs: 'a, b', outputs: 'y', code: `assign y = a ^ b;` },
    xnor_gate: { type: 'gate', gateShape: 'XNOR', inputs: 'a, b', outputs: 'y', code: `assign y = ~(a ^ b);` },
    not_gate: { type: 'gate', gateShape: 'NOT', inputs: 'a', outputs: 'y', code: `assign y = ~a;` },
    buff: { type: 'gate', gateShape: 'BUF', inputs: 'in[7:0]', outputs: 'out[7:0]', code: `assign out = in;` },
    half_adder: { type: 'hardware', inputs: 'a, b', outputs: 'sum, cout', code: `assign sum = a ^ b;\nassign cout = a & b;` },
    full_adder: { type: 'hardware', inputs: 'a, b, cin', outputs: 'sum, cout', code: `assign sum = a ^ b ^ cin;\nassign cout = (a & b) | (cin & (a ^ b));` },
    d_ff: { type: 'hardware', inputs: 'clk, rst_n, d', outputs: 'q', code: `always @(posedge clk or negedge rst_n) begin\n  if (!rst_n) q <= 1'b0;\n  else q <= d;\nend` },
    t_ff: { type: 'hardware', inputs: 'clk, rst_n, t', outputs: 'q', code: `always @(posedge clk or negedge rst_n) begin\n  if (!rst_n) q <= 1'b0;\n  else if (t) q <= ~q;\nend` },
    jk_ff: { type: 'hardware', inputs: 'clk, rst_n, j, k', outputs: 'q', code: `always @(posedge clk or negedge rst_n) begin\n  if (!rst_n) q <= 1'b0;\n  else begin\n    case({j,k})\n      2'b00: q <= q;\n      2'b01: q <= 1'b0;\n      2'b10: q <= 1'b1;\n      2'b11: q <= ~q;\n    endcase\n  end\nend` },
    mux_2x1: { type: 'hardware', inputs: 'd0[7:0], d1[7:0], sel', outputs: 'y[7:0]', code: `assign y = sel ? d1 : d0;` },
    mux_4x1: { type: 'hardware', inputs: 'd0[7:0], d1[7:0], d2[7:0], d3[7:0], sel[1:0]', outputs: 'y[7:0]', code: `assign y = (sel == 2'b00) ? d0 :\n           (sel == 2'b01) ? d1 :\n           (sel == 2'b10) ? d2 : d3;` },
    decoder_2x4: { type: 'hardware', inputs: 'en, a[1:0]', outputs: 'y[3:0]', code: `assign y = en ? (1 << a) : 4'b0000;` },
    alu_8bit: { type: 'hardware', inputs: 'a[7:0], b[7:0], op[2:0]', outputs: 'res[7:0], zero', code: `always @(*) begin\n  case(op)\n    3'b000: res = a + b;\n    3'b001: res = a - b;\n    3'b010: res = a & b;\n    3'b011: res = a | b;\n    3'b100: res = a ^ b;\n    default: res = 8'b0;\n  endcase\nend\nassign zero = (res == 8'b0);` },
    // Append these inside your existing STANDARD_LIBRARY object
    splitter: { type: 'splitter', isSplitter: true, inputs: 'bus_in[7:0]', outputs: 'out0[3:0], out1[7:4]', code: '// Auto-managed' },
    bundler: { type: 'splitter', isBundler: true, inputs: 'in0[3:0], in1[3:0]', outputs: 'bus_out[7:0]', code: '// Auto-managed' }
};

export const parsePorts = (str) => {
    if (!str.trim()) return [];
    return str.split(',').map(s => {
        const trimmed = s.trim();
        const match = trimmed.match(/^(\w+)(?:\[(\d+):(\d+)\])?$/);
        if (!match) return null;
        const [, name, msb, lsb] = match;
        return {
            name,
            width: msb !== undefined ? Math.abs(parseInt(msb) - parseInt(lsb)) + 1 : 1,
            msb: msb !== undefined ? parseInt(msb) : undefined,
            lsb: lsb !== undefined ? parseInt(lsb) : undefined,
        };
    }).filter(Boolean);
};

export const getPortLabel = (port) => port.width > 1 ? `${port.name}[${port.msb}:${port.lsb}]` : port.name;

export const getSmartSpawnPosition = (nodes, targetX, targetY) => {
    let x = targetX;
    let y = targetY;
    let hasCollision = true;
    const buffer = 40;
    const step = 30;

    while (hasCollision) {
        hasCollision = nodes.some(n => Math.abs(n.position.x - x) < buffer && Math.abs(n.position.y - y) < buffer);
        if (hasCollision) { x += step; y += step; }
    }
    return { x, y };
};



/**
 * Checks for duplicate port names within a module's port list.
 * Verilog requires that all port names (inputs + outputs) are unique.
 * @param {Array} inputs - Array of port objects { name, width, msb, lsb }
 * @param {Array} outputs - Array of port objects { name, width, msb, lsb }
 * @returns {string|null} - Error message if duplicates found, else null
 */
export function validatePorts(inputs, outputs) {
    const allNames = [];
    const duplicates = [];

    // Collect all names
    [...inputs, ...outputs].forEach(p => {
        if (allNames.includes(p.name)) {
            duplicates.push(p.name);
        } else {
            allNames.push(p.name);
        }
    });

    if (duplicates.length > 0) {
        const uniqueDupes = [...new Set(duplicates)];
        return `Duplicate port name(s) found: ${uniqueDupes.join(', ')}. Port names must be unique across inputs and outputs.`;
    }
    return null;
}


/**
 * Splits a width into individual single-bit port definitions
 * e.g., name="data", msb=3, lsb=0 -> returns ['data[3]', 'data[2]', 'data[1]', 'data[0]']
 */
export const generateBitSlices = (name, msb, lsb) => {
    const slices = [];
    const high = Math.max(msb, lsb);
    const low = Math.min(msb, lsb);
    
    for (let i = high; i >= low; i--) {
        slices.push({
            name: `out${high - i}`,
            label: `${name}[${i}]`,
            width: 1,
            msb: i,
            lsb: i
        });
    }
    return slices;
};

# Axon Interlink – Visual Hardware Design & Structural Verilog Generator

Axon Interlink is an interactive, browser‑based schematic editor for digital logic design. It allows you to **drag‑and‑drop hardware modules**, **wire them together**, and **automatically generate clean, structural Verilog code** – complete with a testbench template. Built with React Flow, it’s perfect for rapid prototyping, teaching digital design, or exploring complex netlists without leaving your browser.

![Axon Interlink Screenshot](https://via.placeholder.com/1200x600?text=Axon+Interlink+Canvas)

---

## ✨ Features

- **Visual Schematic Editor** – Place, connect, and arrange modules on an infinite canvas.
- **Smart Wiring** – Enforce correct port direction (output → input) and detect width mismatches.
- **Pre‑built Component Library** – Over 30 common digital blocks (gates, adders, muxes, flip‑flops, etc.) ready to drop in.
- **Custom Module Creation** – Define your own module with arbitrary input/output ports.
- **Auto‑Layout** – Automatically organise your schematic based on data flow.
- **Real‑time Design Rule Checks (DRC)** – Highlight floating inputs, unused outputs, multiple drivers, and bit‑width mismatches.
- **Structural Verilog Generation** – One‑click export of a synthesizable `top_module` and a testbench skeleton.
- **Hierarchy & Net Trace** – Explore fan‑in/fan‑out of any module and jump to its location on the canvas.
- **Dark / Light Theme** – Choose what suits your eyes.
- **Undo / Redo** – Full history of your editing actions.
- **Save / Load** – Persist your workspace as a JSON file.
- **Port Promotion** – Expose internal signals as top‑level ports for integration.

---

## 🧱 Tech Stack

- **React** – UI framework
- **React Flow** – Canvas and node/edge management
- **Tabler Icons** – Icon set
- **Custom CSS + Styled Components** – Theming and responsive layout
- **Syntax Highlighting** – In‑browser Verilog code highlighting

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm

### Installation

```bash
git clone https://github.com/yourusername/axon-interlink.git
cd axon-interlink
npm install
```

### Running the Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

---

## 🖱️ How to Use

### 1. Adding Modules
- Open the **Library** tab in the left panel.
- Select a pre‑built module from the dropdown, then click **+ Add** – it appears on the canvas.
- For custom modules, fill in the **Module Definition Name**, **Input Port List**, and **Output Port List** (comma‑separated vector declarations e.g. `a[3:0], b[3:0]`), then click **Instantiate Hardware Block**.

### 2. Connecting Modules
- Click on an **output port** (small circle on the right side of a node) and drag to an **input port** (small circle on the left side) of another node.
- The edge will be created automatically. Connections are validated for direction and bit‑width.

### 3. Configuring a Module
- **Click** any module on the canvas to open its properties modal.
- Here you can:
  - Rename the module.
  - Edit port lists (inputs/outputs).
  - Flip the port layout.
  - Promote ports to the top‑level (if they are not wired).
  - For **Splitter** and **Bundler** nodes, adjust the number of slices and their widths.

### 4. Configuring a Wire
- **Click** any wire to open its properties modal.
- You can force an explicit bit‑width override (useful for resolving mismatches).
- Change the edge colour for better visibility.

### 5. Tracing a Net
- Open the **Trace** tab in the left panel.
- Enter a module or instance name to see its drivers (inputs), fanout (outputs), and any floating inputs.
- Click any driver/fanout entry to jump to that net and highlight it on the canvas.

### 6. Generating Verilog
- The right panel displays the generated structural **Verilog** code.
- Switch between **Code** (the structural top‑level), **TB Template** (testbench), and **Block Diagram** (a symbolic view of the top‑level ports).
- Click the copy button to copy the code to your clipboard.

### 7. Saving / Loading
- Use **Save Work** to download your design as a `.json` file.
- Use **Load File** to restore a previously saved workspace.

---

## 📁 Project Structure (Key Files)

```
axon-interlink/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components (nodes, edges, panels)
│   │   ├── HardwareNode.js
│   │   ├── GateNode.js
│   │   ├── SplitterNode.js
│   │   └── ...
│   ├── edges/              # Custom edge types (SmartEdge, ResizeHandle)
│   ├── styles/             # Theming and styling functions
│   ├── utils/              # Helpers (port parsing, library definitions, code highlighting)
│   ├── verilog-code/       # Verilog syntax highlighter
│   ├── FlowCanvas.jsx      # Main application component
│   └── index.js            # Entry point
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgements

- [React Flow](https://reactflow.dev/) – the core canvas library.
- [Tabler Icons](https://tablericons.com/) – clean icon set.
- All open‑source contributors who make digital design accessible.

---

**Happy Designing!** 🧠⚡
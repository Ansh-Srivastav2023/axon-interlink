import { ReactFlowProvider } from '@xyflow/react';
import FlowCanvas from './FlowCanvas';
import '@xyflow/react/dist/style.css';
import './index.css';
import './App.css';   // static styles

// Helper to generate the dynamic :has() selectors (keep existing logic)
function generateDynamicStyles() {
    const selectors = Array.from(
        { length: 20 },
        (_, i) =>
            `.react-flow__viewport:has(.react-flow__edge-custom:hover[class*="src-port-${i}"]) .react-flow__edge-custom:hover .net-glow-layer`
    ).join(',\n');

    return `
    ${selectors} {
      opacity: 0.65 !important;
      stroke-width: 14px !important;
    }

    .react-flow__edge-custom:hover[class*="src-port-"] {
      outline: none;
    }
  `;
}

export default function App() {
    return (
        <ReactFlowProvider>
            {/* Only dynamic styles remain inline; static are in App.css */}
            <style>{generateDynamicStyles()}</style>
            <FlowCanvas />
        </ReactFlowProvider>
    );
}


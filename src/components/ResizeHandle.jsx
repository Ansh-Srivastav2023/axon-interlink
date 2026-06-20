import { useState } from 'react';


export default function ResizeHandle({ onMouseDown, isDragging }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div onMouseDown={onMouseDown} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ width: '8px', cursor: 'col-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: 10 }} >
            <div style={{ width: '3px', height: '48px', borderRadius: '2px', backgroundColor: (hovered || isDragging) ? '#6b7280' : '#d1d5db', transition: 'background-color 0.15s' }} />
        </div>
    );
}
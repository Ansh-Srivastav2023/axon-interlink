import { IconSettings } from "./icons";
import { useCanvasTheme } from "../utils/CanvasThemeContext";

export const InfoIcon = ({ id, data, t }) => {
    const openConfig = (event) => {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('axon:open-node-config', {
            detail: {
                nodeId: id,
                clientX: event.clientX,
                clientY: event.clientY,
            },
        }));
    };

    const canvasTheme = useCanvasTheme(data?.theme || 'dark');
    const isDark = canvasTheme === 'dark';

    return (
        <div style={{ position: 'absolute', top: -10, right: -10, zIndex: 20 }}>
            <button
                onClick={openConfig}
                className="nodrag nopan"
                title="Configure block"
                aria-label="Configure block"
                style={{
                    background: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.96)',
                    border: `1px solid ${isDark ? 'rgba(96,165,250,0.45)' : 'rgba(37,99,235,0.35)'}`,
                    borderRadius: '9px',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: t.primary || '#3b82f6',
                    boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.35)' : '0 8px 20px rgba(15,23,42,0.12)',
                    transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.12s ease',
                }}
                onMouseEnter={(event) => {
                    event.currentTarget.style.transform = 'translateY(-1px)';
                    event.currentTarget.style.borderColor = t.primary || '#3b82f6';
                }}
                onMouseLeave={(event) => {
                    event.currentTarget.style.transform = 'translateY(0)';
                    event.currentTarget.style.borderColor = isDark ? 'rgba(96,165,250,0.45)' : 'rgba(37,99,235,0.35)';
                }}
            >
                <IconSettings size={15} />
            </button>
        </div>
    );
};

import { IconX } from '../../styles/icons';

const ModalHeader = ({ title, icon, onClose, theme, t }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 18px',
        userSelect: 'none',
        borderBottom: `1px solid ${t.border}`,
        background: theme === 'dark'
            ? 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(15,23,42,0.88))'
            : 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(248,250,252,0.96))',
    }}>
        <div style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            minWidth: 0,
        }}>
            <div style={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
                background: theme === 'dark' ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.10)',
                border: `1px solid ${theme === 'dark' ? 'rgba(96,165,250,0.25)' : 'rgba(37,99,235,0.18)'}`,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    color: t.textHeading,
                    fontSize: '16px',
                    fontFamily: '"SF Mono", Consolas, Menlo, monospace',
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {title}
                </div>
                <div style={{ marginTop: '3px', color: t.textMuted, fontSize: '11px', fontWeight: 600 }}>
                    Edit block identity, ports, layout, and top-level exposure
                </div>
            </div>
        </div>
        <button onClick={onClose} className="nodrag nopan" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: theme === 'dark' ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.75)',
            border: `1px solid ${t.border}`,
            color: t.textSecondary,
            cursor: 'pointer',
            transition: 'background 0.15s ease, border-color 0.15s ease',
        }}>
            <IconX size={16} />
        </button>
    </div>
);

export default ModalHeader;

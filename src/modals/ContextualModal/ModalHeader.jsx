import { IconX } from '../../styles/icons';

const ModalHeader = ({ title, icon, onClose, theme, t }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        userSelect: 'none'
    }}>
        <h3 style={{
            margin: 0,
            fontSize: '17px',
            fontFamily: 'monospace',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: theme === 'dark' ? '#fff' : '#4400ff'
        }}>
            {icon} {title}
        </h3>
        <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: t.textSecondary,
            cursor: 'pointer'
        }}>
            <IconX size={16} />
        </button>
    </div>
);

export default ModalHeader;
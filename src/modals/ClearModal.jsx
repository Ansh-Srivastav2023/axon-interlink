import { IconX, IconTrash } from '../styles';

const ClearModal = ({ showClearModal, theme, setShowClearModal, t, handleClearAll, s }) => {
    if (!showClearModal) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.45)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? '#ef4444' : '#fca5a5'}`,
                borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
                color: theme === 'dark' ? '#ffffff' : '#111827',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: t.danger, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconTrash size={16} /> Wipe Schematic Workspace?
                    </h3>
                    <button onClick={() => setShowClearModal(false)} style={{ ...s.iconBtn, width: '30px', height: '30px', minHeight: '30px', background: 'transparent', borderColor: 'transparent', color: t.textMuted }}><IconX size={16} /></button>
                </div>
                <p style={{ fontSize: '12px', color: t.textSecondary, margin: '0 0 20px 0', lineHeight: '1.6' }}>
                    Are you absolutely sure you want to clear the entire canvas layout? This operation will **permanently delete** all instantiated hardware blocks, customized behavioural logic definitions, and structural net routing wires.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => setShowClearModal(false)} style={s.smallBtn}>Cancel</button>
                    <button onClick={handleClearAll} style={{ ...s.dangerBtn, padding: '7px 14px' }}>Clear Everything</button>
                </div>
            </div>
        </div>
    );
};

export default ClearModal;

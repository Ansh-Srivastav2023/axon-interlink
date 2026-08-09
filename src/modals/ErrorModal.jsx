import { IconX } from '../styles';

// ----- Constant (outside component) -----
const ERROR_ICON = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
);

const ErrorModal = ({ errorModal, theme, setErrorModal, t, s }) => {
    if (!errorModal.show) return null;

    const closeModal = () => setErrorModal({ show: false, message: '' });

    // ----- Render helpers (not components) -----
    const renderHeader = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
        }}>
            <h3 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                {ERROR_ICON}
                Port Name Conflict
            </h3>
            <button
                onClick={closeModal}
                style={{
                    ...s.iconBtn,
                    width: '30px',
                    height: '30px',
                    minHeight: '30px',
                    background: 'transparent',
                    borderColor: 'transparent',
                    color: t.textMuted,
                }}
            >
                <IconX size={16} />
            </button>
        </div>
    );

    const renderContent = () => (
        <div style={{
            margin: '4px 0 22px',
            padding: '14px 16px',
            borderRadius: '10px',
            background: theme === 'dark'
                ? 'rgba(239,68,68,0.08)'
                : 'rgba(239,68,68,0.06)',
            border: `1px solid ${theme === 'dark'
                ? 'rgba(239,68,68,0.18)'
                : 'rgba(239,68,68,0.15)'
                }`,
            fontSize: '13px',
            lineHeight: 1.7,
            color: t.textHeading,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            letterSpacing: '0.15px',
            fontWeight: 450,
        }}>
            {errorModal.message}
        </div>
    );

    const renderFooter = () => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
                onClick={closeModal}
                style={{
                    ...s.primaryBtn,
                    marginTop: 0,
                    padding: '7px 18px',
                }}
            >
                Got it
            </button>
        </div>
    );

    // ----- Main modal wrapper -----
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.45)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? '#f87171' : '#fca5a5'}`,
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
                color: theme === 'dark' ? '#ffffff' : '#111827',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                {renderHeader()}
                {renderContent()}
                {renderFooter()}
            </div>
        </div>
    );
};

export default ErrorModal;

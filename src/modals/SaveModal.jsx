import { IconSave, IconX } from "../styles";

const SaveModal = ({ theme, setShowSaveModal, setProposedFileName, proposedFileName, executeActualDownload, showSaveModal, t, s }) => {
    if (!showSaveModal) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.45)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div
                style={{
                    border: "3px solid transparent",
                    borderRadius: "12px",
                    padding: "20px",
                    maxWidth: "400px",
                    width: "90%",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    color: theme === "dark" ? "#ffffff" : "#111827",
                    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",

                    // Gradient border fix
                    backgroundImage: `linear-gradient(${t.bgSecondary}, ${t.bgSecondary}), linear-gradient(90deg, #c1067d, #4800ff)`,
                    backgroundOrigin: "border-box",
                    backgroundClip: "padding-box, border-box",
                }}
            >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconSave size={16} /> Save Architecture Workspace
                    </h3>
                    <button onClick={() => setShowSaveModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}><IconX size={16} /></button>
                </div>
                <p style={{ fontSize: '12px', color: t.textSecondary, margin: '0 0 12px 0', lineHeight: '1.5' }}>
                    Your hardware blocks and wiring routes will be archived into a portable design payload config file.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>File Configuration Name</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input autoFocus value={proposedFileName} onChange={(e) => setProposedFileName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') executeActualDownload(proposedFileName); if (e.key === 'Escape') setShowSaveModal(false); }} style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: '48px', border: `1px solid ${theme === 'dark' ? '#333333' : '#cbd5e1'}`, backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc', color: theme === 'dark' ? '#ffffff' : '#111827' }} />
                        <span style={{ position: 'absolute', right: '10px', fontSize: '12px', fontFamily: 'monospace', color: t.textMuted, pointerEvents: 'none' }}>.json</span>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => setShowSaveModal(false)} style={{ ...s.smallBtn, background: theme === 'dark' ? '#111111' : '#f1f5f9', color: t.text, border: `1px solid ${t.border}` }}>Cancel</button>
                    <button onClick={() => executeActualDownload(proposedFileName)} style={{ ...s.smallBtn, background: t.primary, color: '#ffffff', border: 'none', fontWeight: 600, padding: '6px 16px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>Confirm & Save</button>
                </div>
            </div>
        </div>
    );
};

export default SaveModal;
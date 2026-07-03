import { IconTrace } from '../../styles/icons';
import { EDGE_COLORS } from './constants';
import ModalHeader from './ModalHeader';

const EdgeModalContent = ({
    edge,
    targetId,
    t,
    s,
    theme,
    recordHistory,
    setEdges,
    closeModal,
    setGlowingNet
}) => (
    <>
        <ModalHeader
            title="Net Trace Metrics"
            icon={<IconTrace size={20} />}
            onClose={closeModal}
            theme={theme}
            t={t}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={s.formGroup}>
                <label style={s.label}>Explicit Bus Width Constraint</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="number"
                        min="1"
                        max="128"
                        value={edge.data?.bitWidth || 1}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val > 0 && val <= 128) {
                                recordHistory();
                                setEdges(eds => eds.map(ed =>
                                    ed.id === targetId
                                        ? { ...ed, data: { ...ed.data, bitWidth: val } }
                                        : ed
                                ));
                            }
                        }}
                        style={{ ...s.input, width: '70px', padding: '6px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '12px', color: t.textSecondary }}>bits width array</span>
                </div>
                <span style={{ fontSize: '14px', color: theme === "dark" ? "#4b69ff" : "#174dff" }}> Note: Max <strong>Width</strong> possible is <strong>128</strong>. </span>
            </div>
            <div style={s.formGroup}>
                <label style={s.label}>Net Highlighter Schematic Tint</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {EDGE_COLORS.map(color => (
                        <div
                            key={color}
                            onClick={() => {
                                recordHistory();
                                setEdges(eds => eds.map(e =>
                                    e.id === targetId
                                        ? { ...e, data: { ...e.data, color } }
                                        : e
                                ));
                            }}
                            style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: color,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: edge.data?.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)'
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '10px',
            borderTop: `1px solid ${t.border}`,
            userSelect: 'none'
        }}>
            <button
                onClick={() => {
                    setEdges(eds => eds.filter(e => e.id !== targetId));
                    closeModal();
                    setGlowingNet(null);
                }}
                style={s.dangerBtn}
            >
                Purge Route
            </button>
            <button onClick={closeModal} style={{ ...s.primaryBtn, margin: 0, padding: '6px 16px' }}>
                Confirm
            </button>
        </div>
    </>
);

export default EdgeModalContent;
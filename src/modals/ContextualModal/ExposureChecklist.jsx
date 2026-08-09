const ExposureChecklist = ({ ports, isInput, nodeId, disabledCheck, edges, exposedPorts, toggleExposePort, t }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        background: t.bgSecondary,
        padding: '7px',
        borderRadius: '10px',
        border: `1px solid ${t.border}`
    }}>
        {ports.map(p => {
            const key = `${nodeId}__${p.name}`;
            const isWired = isInput
                ? edges.some(e => e.target === nodeId && e.targetHandle === p.name)
                : edges.some(e => e.source === nodeId && e.sourceHandle === p.name);
            const isAutoRouted = disabledCheck?.(p) || false;
            const disabled = isWired || isAutoRouted;
            const checked = !!exposedPorts[key] && !disabled;
            const statusText = isWired ? ' (internal/wired)' : isAutoRouted ? ' (auto)' : '';
            return (
                <label key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.52 : 1,
                    color: t.text,
                    padding: '7px 8px',
                    borderRadius: '8px',
                    background: checked ? 'rgba(59,130,246,0.12)' : 'transparent',
                    border: `1px solid ${checked ? 'rgba(59,130,246,0.30)' : 'transparent'}`,
                }}>
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExposePort(nodeId, p.name, p, isInput)}
                        disabled={disabled}
                    />
                    <span>
                        Promote <code style={{ color: t.textHeading, fontWeight: 700 }}>{p.name}</code> to top{statusText}
                    </span>
                </label>
            );
        })}
    </div>
);

export default ExposureChecklist;

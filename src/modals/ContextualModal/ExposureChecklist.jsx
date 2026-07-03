const ExposureChecklist = ({ ports, isInput, nodeId, disabledCheck, edges, exposedPorts, toggleExposePort, t }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: t.bg,
        padding: '8px',
        borderRadius: '6px',
        border: `1px solid ${t.borderStrong}`
    }}>
        {ports.map(p => {
            const key = `${nodeId}__${p.name}`;
            const isWired = isInput
                ? edges.some(e => e.target === nodeId && e.targetHandle === p.name)
                : edges.some(e => e.source === nodeId && e.sourceHandle === p.name);
            const isAutoRouted = disabledCheck?.(p) || false;
            const disabled = isWired || isAutoRouted;
            return (
                <label key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1
                }}>
                    <input
                        type="checkbox"
                        checked={!!exposedPorts[key]}
                        onChange={() => toggleExposePort(nodeId, p.name, p, isInput)}
                        disabled={disabled}
                    />
                    Promote <code>{p.name}</code> to top {isWired && '(Wired)'}
                </label>
            );
        })}
    </div>
);

export default ExposureChecklist;
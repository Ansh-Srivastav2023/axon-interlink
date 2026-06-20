import { AppLogo } from "./Logo";
import { FaMoon, FaSun } from "react-icons/fa";
import { IconArrowBackUp, IconArrowForwardUp, IconHierarchy2 } from "@tabler/icons-react";
import { IconSave, IconFolder, IconTrash } from '../styles';

const HELP_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.1 9a3 3 0 1 1 5.3 2c-.7.7-1.4 1.2-1.4 2.5" />
    <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

const BUTTONS = {
  undo: { label: 'Undo', icon: <IconArrowBackUp size={16} />, title: 'Undo (Ctrl+Z)' },
  redo: { label: 'Redo', icon: <IconArrowForwardUp size={16} />, title: 'Redo (Ctrl+Y)' },
  save: { label: 'Save Work', icon: <IconSave size={16} /> },
  load: { label: 'Load File', icon: <IconFolder size={16} /> },
  help: { label: 'Help', icon: HELP_ICON },
  clear: { label: 'Clear All', icon: <IconTrash size={16} /> },
  autoLayout: { label: 'Auto Layout', icon: <IconHierarchy2 size={16} />, title: 'Auto Layout' },
};

// Helper for glassy hover
const glassHover = (t, glowColor = null) => ({
  onMouseEnter: (e) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
    e.currentTarget.style.boxShadow = glowColor 
      ? `0 8px 24px ${glowColor}40, inset 0 1px 0 rgba(255,255,255,0.1)`
      : `0 8px 24px ${t.shadow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
    e.currentTarget.style.borderColor = glowColor || t.borderStrong;
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.transform = 'translateY(0) scale(1)';
    e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px ${t.shadow}`;
    e.currentTarget.style.borderColor = t.border;
  },
});

const Header = ({
  s, theme, t, nodes, warnings, edges,
  undo, past, redo, future,
  toolbarBtn, handleSaveWorkspace, handleLoadWorkspace, fileInputRef,
  setShowClearModal, setShowHelp, setTheme, helpColors,
  arrangeTopologicalLayout,
}) => {

  const renderUndo = () => {
    const disabled = past.length === 0;
    return (
      <button
        onClick={undo}
        disabled={disabled}
        style={{
          ...toolbarBtn,
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        {...(!disabled && glassHover(t))}
        title={BUTTONS.undo.title}
      >
        {BUTTONS.undo.icon} {BUTTONS.undo.label}
      </button>
    );
  };

  const renderRedo = () => {
    const disabled = future.length === 0;
    return (
      <button
        onClick={redo}
        disabled={disabled}
        style={{
          ...toolbarBtn,
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        {...(!disabled && glassHover(t))}
        title={BUTTONS.redo.title}
      >
        {BUTTONS.redo.icon} {BUTTONS.redo.label}
      </button>
    );
  };

  const renderSave = () => (
    <button
      onClick={handleSaveWorkspace}
      style={{
        ...toolbarBtn,
        background: `linear-gradient(135deg, ${t.primary} 0%, ${t.primaryHover || '#1d4ed8'} 100%)`,
        color: '#fff',
        border: '1px solid transparent',
        fontWeight: 700,
        boxShadow: `0 4px 16px ${t.primary}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
        e.currentTarget.style.boxShadow = `0 8px 28px ${t.primary}50, inset 0 1px 0 rgba(255,255,255,0.3)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${t.primary}30, inset 0 1px 0 rgba(255,255,255,0.2)`;
      }}
    >
      {BUTTONS.save.icon} {BUTTONS.save.label}
    </button>
  );

  const renderLoad = () => (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={toolbarBtn}
        {...glassHover(t)}
      >
        {BUTTONS.load.icon} {BUTTONS.load.label}
      </button>
      <input type="file" ref={fileInputRef} onChange={handleLoadWorkspace} accept=".json" style={{ display: 'none' }} />
    </>
  );

  const renderHelp = () => (
    <button
      onClick={() => setShowHelp(true)}
      style={{
        ...toolbarBtn,
        background: `linear-gradient(135deg, ${helpColors.bg} 0%, ${helpColors.border} 100%)`,
        color: helpColors.text,
        border: `1px solid ${helpColors.border}`,
        fontWeight: 700,
        animation: 'helpGlow 2s ease-in-out infinite',
        boxShadow: `0 4px 16px ${helpColors.glow}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.animationPlayState = 'paused';
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
        e.currentTarget.style.boxShadow = `0 0 24px ${helpColors.glow}60, 0 8px 28px ${helpColors.glow}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.animationPlayState = 'running';
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${helpColors.glow}40, inset 0 1px 0 rgba(255,255,255,0.2)`;
      }}
    >
      {BUTTONS.help.icon} {BUTTONS.help.label}
    </button>
  );

  const renderClear = () => (
    <button
      onClick={() => setShowClearModal(true)}
      style={{
        ...toolbarBtn,
        color: t.danger,
        borderColor: t.danger,
      }}
      {...glassHover(t, t.danger)}
    >
      {BUTTONS.clear.icon} {BUTTONS.clear.label}
    </button>
  );

  const renderAutoLayout = () => {
    const isDark = theme === 'dark';
    const color = isDark ? '#8b5cf6' : '#7c3aed';
    return (
      <button
        onClick={arrangeTopologicalLayout}
        style={{
          ...toolbarBtn,
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          color: color,
          borderColor: `${color}60`,
          fontWeight: 600,
        }}
        {...glassHover(t, color)}
        title={BUTTONS.autoLayout.title}
      >
        {BUTTONS.autoLayout.icon} {BUTTONS.autoLayout.label}
      </button>
    );
  };

  const renderThemeToggle = () => (
    <button
      onClick={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))}
      style={{
        ...toolbarBtn,
        padding: '8px 11px',
      }}
      {...glassHover(t)}
    >
      {theme === 'light' ? <FaMoon size={15} /> : <FaSun size={15} />}
    </button>
  );

  return (
    <div style={s.header}>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <AppLogo size={70} s={s} />
      </div>

      <div
        style={{
          ...s.headerActions,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flex: 1,
          flexWrap: 'wrap',
          overflow: 'visible',
        }}
      >
        <span style={s.badge}>{nodes.length} blocks</span>
        <span style={s.badge}>{edges.length} wires</span>
        {warnings.length > 0 && (
          <span
            style={{
              ...s.badge,
              background: `linear-gradient(135deg, ${t.warnBg} 0%, ${t.warnBorder}40 100%)`,
              color: t.warn,
              border: `1px solid ${t.warnBorder}`,
              boxShadow: `0 2px 8px ${t.warn}20`,
            }}
          >
            ⚠ {warnings.length} Alerts
          </span>
        )}

        {renderUndo()}
        {renderRedo()}
        {renderSave()}
        {renderLoad()}
        {renderHelp()}
        {renderClear()}
        {renderAutoLayout()}
        {renderThemeToggle()}
      </div>
    </div>
  );
};

export default Header;
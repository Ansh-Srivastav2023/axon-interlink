export const themes = {
  light: {
    bg: '#ffffff',
    bgSecondary: '#ffffff',
    bgTertiary: '#f3f4f6',
    border: '#e5e7eb',
    borderStrong: '#d1d5db',
    text: '#1f2937',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    textHeading: '#111827',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    codeBg: '#f8fafc',
    canvasBg: '#f9fafb',
    canvasDot: '#282828',
    shadow: 'rgba(0,0,0,0.05)',
    danger: '#dc2626',
    warn: '#d97706',
    warnBg: '#fffbeb',
    warnBorder: '#fcd34d',
  },
  dark: {
    bg: '#000000',
    bgSecondary: '#050505',
    bgTertiary: '#111111',
    border: '#222222',
    borderStrong: '#333333',
    text: '#e2e8f0',
    textSecondary: '#969696',
    textMuted: '#666666',
    textHeading: '#ffffff',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    codeBg: '#000000',
    canvasBg: '#0a0a0a',
    canvasDot: '#5e5e5e',
    shadow: 'rgba(0,0,0,0.5)',
    danger: '#ef4444',
    warn: '#f59e0b',
    warnBg: '#1c1400',
    warnBorder: '#78350f',
  }
};


export const createNodeStyles = (theme) => {
  const isDark = theme.bg === '#000000'; // or add a `mode` flag

  return {
    // Node container
    node: {
      position: 'relative',
      background: theme.bg,
      border: `1px solid ${isDark ? '#626262' : '#414141'}`,
      borderRadius: '8px',
      minWidth: '180px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    nodeSelected: {
      border: `2px solid ${theme.primary}`,
      boxShadow: `0 0 0 3px ${theme.primary}40`, // 25% opacity
    },

    // Header
    header: {
      padding: '10px 14px',
      borderBottom: `1px solid ${theme.border}`,
      backgroundColor: theme.bgSecondary,
      borderTopLeftRadius: '7px',
      borderTopRightRadius: '7px',
    },
    moduleName: {
      fontWeight: 600,
      fontSize: '13px',
      color: theme.textHeading,
    },
    instanceName: {
      fontSize: '11px',
      color: theme.textSecondary,
      fontFamily: 'monospace',
      marginTop: '2px',
    },

    // Body
    body: {
      padding: '8px 0',
      display: 'flex',
      justifyContent: 'space-between',
      minHeight: '36px',
    },
    portColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    portRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      height: '22px',
      padding: '0 14px',
      position: 'relative',
    },
    portLabel: {
      fontSize: '11px',
      color: theme.text,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
    },

    // Handles
    handleLeft: {
      width: '10px',
      height: '10px',
      background: '#10b981', // semantic – stays the same
      border: `2px solid ${theme.bgSecondary}`,
      left: '-5px',
    },
    handleRight: {
      width: '10px',
      height: '10px',
      background: '#f59e0b',
      border: `2px solid ${theme.bgSecondary}`,
      right: '-5px',
    },

    // Finally, spread all theme colors so components can access them directly
    ...theme,
  };
};


export const lightNodeStyles = createNodeStyles(themes.light);
export const darkNodeStyles = createNodeStyles(themes.dark);
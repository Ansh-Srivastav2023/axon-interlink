import { getButtonStyles } from './buttonStyles';

export default function getStyles(t, leftCollapsed, rightCollapsed, leftWidth, rightWidth, isDragging) {
    // Dynamic layout checking for phone/tablet targets
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const buttonStyles = getButtonStyles(t, t.bgSecondary === '#050505' ? 'dark' : 'light');

    return {
        tabBarContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flex: 1
        },
        app: {
            display: 'flex',
            flexDirection: 'column',
            width: '100vw',
            height: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            color: t.text,
            backgroundColor: t.bg,
            userSelect: isDragging ? 'none' : 'auto',
            overflow: 'hidden'
        },

        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '52px',
            padding: '0 12px',
            backgroundColor: t.bgSecondary,
            flexShrink: 0,
            gap: '10px',
            overflowX: isMobile ? 'auto' : 'visible', // Allows scrolling toolbar items on narrow phones
            scrollbarWidth: 'none'
        },
        headerTitle: { fontSize: '14px', fontWeight: 600, color: t.textHeading, letterSpacing: '-0.2px', whiteSpace: 'nowrap' },
        headerActions: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
        iconBtn: { ...buttonStyles.icon, flexShrink: 0 },

        badge: {
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '8px',
            background: `linear-gradient(180deg, ${t.bgTertiary} 0%, ${t.bg} 100%)`,
            color: t.textSecondary,
            border: `1px solid ${t.border}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
            whiteSpace: 'nowrap'
        },

        main: {
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
            padding: isMobile ? '0' : '8px',
            gap: '0',
            position: 'relative' // Anchor base for absolute overlays on mobile
        },

        leftPanel: {
            // Responsive absolute positioning overlay on mobile viewports
            position: isMobile ? 'absolute' : 'relative',
            zIndex: isMobile ? 100 : 1,
            left: 0,
            top: 0,
            bottom: 0,
            transform: isMobile && leftCollapsed ? 'translateX(-100%)' : 'translateX(0)', // Slides completely out of view when collapsed
            width: leftCollapsed ? (isMobile ? '0px' : '48px') : (isMobile ? '85vw' : `${leftWidth}px`),
            minWidth: leftCollapsed ? (isMobile ? '0px' : '48px') : (isMobile ? '85vw' : `${leftWidth}px`),
            backgroundColor: t.bgSecondary,
            border: 'none',
            borderRadius: isMobile ? '0' : '8px',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: isMobile && !leftCollapsed ? `4px 0 24px rgba(0,0,0,0.4)` : 'none',
            transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        },

        rightPanel: {
            // Responsive absolute positioning overlay on mobile viewports
            position: isMobile ? 'absolute' : 'relative',
            zIndex: isMobile ? 100 : 1,
            right: 0,
            top: 0,
            bottom: 0,
            transform: isMobile && rightCollapsed ? 'translateX(100%)' : 'translateX(0)', // Slides completely out of view when collapsed
            width: rightCollapsed ? (isMobile ? '0px' : '48px') : (isMobile ? '85vw' : `${rightWidth}px`),
            minWidth: rightCollapsed ? (isMobile ? '0px' : '48px') : (isMobile ? '85vw' : `${rightWidth}px`),
            backgroundColor: t.bgSecondary,
            border: 'none',
            borderRadius: isMobile ? '0' : '8px',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: isMobile && !rightCollapsed ? `-4px 0 24px rgba(0,0,0,0.4)` : 'none',
            transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        },

        canvas: {
            flex: 1,
            borderRadius: isMobile ? '0' : '8px',
            border: 'none',
            overflow: 'hidden',
            margin: isMobile ? '0' : '0 4px',
            width: '100%',
            height: '100%'
        },

        panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: t.bgSecondary, flexShrink: 0, minHeight: '48px' },
        sectionTitle: { fontSize: '20px', fontWeight: 700, color: t.textHeading, textTransform: 'none', letterSpacing: '-0.3px', WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale", fontFamily: 'monospace' },
        panelSection: { padding: '14px' },
        divider: { height: '0px', backgroundColor: 'transparent' },
        form: { display: 'flex', flexDirection: 'column', gap: '12px' },
        formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
        label: { fontSize: '12px', fontWeight: 500, color: t.textSecondary },

        input: {
            padding: '8px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'monospace',
            boxSizing: 'border-box',
            backgroundColor: t.bgSecondary === '#050505' ? '#111111' : '#ffffff',
            color: t.bgSecondary === '#050505' ? '#ffffff' : '#1f2937',
            border: `1px solid ${t.bgSecondary === '#050505' ? '#222222' : '#cbd5e1'}`,
        },

        button: buttonStyles.base,
        primaryBtn: { ...buttonStyles.primary, marginTop: '4px' },
        smallBtn: { ...buttonStyles.secondary, minHeight: '30px', padding: '6px 10px' },
        tabBtnActive: buttonStyles.tab(true),
        tabBtnInactive: buttonStyles.tab(false),
        dangerBtn: buttonStyles.danger,
        softDangerBtn: buttonStyles.softDanger,
        infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '8px', padding: '4px 0' },
        infoLabel: { color: t.textSecondary },
        infoValue: { color: t.textHeading, fontFamily: 'monospace' },
        emptyState: { padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: t.textMuted, background: t.bgTertiary, borderRadius: '6px', border: `1px dashed #222222`, lineHeight: '1.4' },
        codeBlock: {
            flex: 1,
            margin: 0,
            padding: '14px 16px',
            overflow: 'auto',
            fontFamily: '"SF Mono", Menlo, Monaco, monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            color: t.bgSecondary === '#050505' ? '#e6edf3' : '#24292f',
            background: t.bgSecondary === '#050505' ? '#0d1117' : '#ffffff',
            whiteSpace: 'pre',        // preserves spaces, no wrapping
            overflowX: 'auto',        // horizontal scroll when needed
            wordWrap: 'normal',       // disable word breaking
            overflowWrap: 'normal',   // disable word breaking
            height: '100%',
            boxSizing: 'border-box',
            scrollbarWidth: 'thin',
            scrollbarColor: t.bgSecondary === '#050505' ? '#30363d #0d1117' : '#c8d1dc #f6f8fa'
        },

        codeEditorInput: {
            flex: 1,
            minHeight: '160px',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: '"SF Mono", Menlo, Monaco, monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            padding: '12px',
            background: t.bgSecondary === '#050505' ? '#0d1117' : '#ffffff',
            color: t.bgSecondary === '#050505' ? '#e6edf3' : '#24292f',
            border: `1px solid ${t.bgSecondary === '#050505' ? '#30363d' : '#d0d7de'}`,
            borderRadius: '9px',
            outline: 'none',
            resize: 'none',
            whiteSpace: 'pre',        // no wrapping
            overflowX: 'auto',        // horizontal scroll
            wordWrap: 'normal',       // no soft wrap
            overflowWrap: 'normal',
            scrollbarWidth: 'thin',
            scrollbarColor: t.bgSecondary === '#050505' ? '#30363d #0d1117' : '#c8d1dc #f6f8fa'
        }
    };
}

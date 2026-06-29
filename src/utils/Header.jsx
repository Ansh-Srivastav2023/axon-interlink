import { useState, useRef, useEffect } from "react";
import { AppLogo } from "./Logo";
import { FaMoon, FaSun } from "react-icons/fa";
import { IconArrowBackUp, IconArrowForwardUp, IconHierarchy2, IconDotsVertical } from "@tabler/icons-react";
import { IconSave, IconFolder, IconTrash } from '../styles';

const HELP_ICON = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 1 1 5.3 2c-.7.7-1.4 1.2-1.4 2.5" />
        <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
    </svg>
);

// Helper for glassy hover (reused on dropdown items)
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
    s, theme, t, nodes, edges,
    undo, past, redo, future,
    toolbarBtn, handleSaveWorkspace, handleLoadWorkspace, fileInputRef,
    setShowClearModal, setShowHelp, setTheme, helpColors,
    arrangeTopologicalLayout,
}) => {

    // const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const isMobile = true;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Shared drop‑item style base
    const dropItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 14px',
        background: 'none',
        border: 'none',
        color: t.text,
        fontSize: '13px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        transition: 'background 0.15s ease'
    };

    return (
        <div style={{ ...s.header, position: 'relative', overflow: 'visible' }}>

            {/* Brand logo */}
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <AppLogo size={isMobile ? 52 : 70} t={t} />
            </div>

            {/* Main header actions */}
            <div
                style={{
                    display: 'flex',
                    gap: isMobile ? '6px' : '8px',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flex: 1,
                }}
            >
                {/* Badges */}
                <span style={s.badge}>{nodes.length}{isMobile ? 'B' : ' blocks'}</span>
                <span style={s.badge}>{edges.length}{isMobile ? 'W' : ' wires'}</span>

                {/* {warnings.length > 0 && (
                    <span
                        style={{
                            ...s.badge,
                            background: `linear-gradient(135deg, ${t.warnBg} 0%, ${t.warnBorder}40 100%)`,
                            color: t.warn,
                            border: `1px solid ${t.warnBorder}`,
                        }}
                    >
                        ⚠ {warnings.length} {!isMobile && 'Alerts'}
                    </span>
                )} */}

                {/* Undo / Redo (always visible) */}
                <button
                    onClick={undo}
                    disabled={past.length === 0}
                    style={{ ...toolbarBtn, opacity: past.length === 0 ? 0.35 : 1, padding: '6px 10px' }}
                    title="Undo (Ctrl+Z)"
                    {...glassHover(t)}
                >
                    <IconArrowBackUp size={16} />
                </button>

                <button
                    onClick={redo}
                    disabled={future.length === 0}
                    style={{ ...toolbarBtn, opacity: future.length === 0 ? 0.35 : 1, padding: '6px 10px' }}
                    title="Redo (Ctrl+Y)"
                    {...glassHover(t)}
                >
                    <IconArrowForwardUp size={16} />
                </button>

                {/* DESKTOP: full ribbon */}
                {!isMobile && (
                    <>
                        {/* Badges */}

                        <button onClick={handleSaveWorkspace} style={{ ...toolbarBtn, background: t.primary, color: '#fff', border: 'none' }} {...glassHover(t)}>
                            <IconSave size={16} /> Save Work
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} style={toolbarBtn} {...glassHover(t)}>
                            <IconFolder size={16} /> Load File
                        </button>
                        <button onClick={() => setShowHelp(true)} style={{ ...toolbarBtn, background: helpColors.bg, color: helpColors.text, borderColor: helpColors.border }} {...glassHover(t)}>
                            {HELP_ICON} Help
                        </button>
                        <button onClick={() => setShowClearModal(true)} style={{ ...toolbarBtn, color: t.danger, borderColor: t.danger }} {...glassHover(t, t.danger)}>
                            <IconTrash size={16} /> Clear All
                        </button>
                        <button onClick={arrangeTopologicalLayout} style={{ ...toolbarBtn, color: theme === 'dark' ? '#8b5cf6' : '#7c3aed', borderColor: theme === 'dark' ? '#8b5cf660' : '#7c3aed60' }} {...glassHover(t)}>
                            <IconHierarchy2 size={16} /> Auto Layout
                        </button>
                        <button onClick={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))} style={toolbarBtn} {...glassHover(t)}>
                            {theme === 'light' ? <FaMoon size={15} /> : <FaSun size={15} />}
                        </button>
                    </>
                )}

                {/* MOBILE: three‑dots dropdown */}
                {isMobile && (
                    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>

                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            style={{
                                ...toolbarBtn,
                                padding: '6px 10px',
                                background: menuOpen ? t.bgTertiary : 'transparent',
                                borderColor: menuOpen ? t.borderStrong : t.border,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            {...glassHover(t)}
                        >
                            <IconDotsVertical size={18} />
                        </button>

                        {menuOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '42px',
                                    backgroundColor: t.bgSecondary === '#050505' ? '#111111' : '#ffffff',
                                    border: `1px solid ${t.borderStrong || '#222'}`,
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    zIndex: 2000,
                                    minWidth: '160px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <button
                                    style={dropItemStyle}
                                    onClick={() => { handleSaveWorkspace(); setMenuOpen(false); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <IconSave size={16} style={{ color: t.primary }} /> Save Work
                                </button>

                                <button
                                    style={dropItemStyle}
                                    onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <IconFolder size={16} style={{ color: t.textSecondary }} /> Load File
                                </button>

                                <button
                                    style={dropItemStyle}
                                    onClick={() => { arrangeTopologicalLayout(); setMenuOpen(false); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <IconHierarchy2 size={16} style={{ color: '#8b5cf6' }} /> Auto Layout
                                </button>

                                <button
                                    style={dropItemStyle}
                                    onClick={() => { setShowHelp(true); setMenuOpen(false); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span style={{ display: 'flex', color: '#f59e0b' }}>{HELP_ICON}</span> Help System
                                </button>

                                <div style={{ height: '1px', backgroundColor: t.border, margin: '4px 0' }} />

                                <button
                                    style={dropItemStyle}
                                    onClick={() => { setTheme((p) => (p === 'light' ? 'dark' : 'light')); setMenuOpen(false); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    {theme === 'light' ? <FaMoon size={14} /> : <FaSun size={14} />} Switch Theme
                                </button>

                                <button
                                    style={{ ...dropItemStyle, color: t.danger }}
                                    onClick={() => { setShowClearModal(true); setMenuOpen(false); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d0f12' : '#fef2f2'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <IconTrash size={16} /> Clear Canvas
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden file input (used by both desktop and mobile) */}
            <input type="file" ref={fileInputRef} onChange={handleLoadWorkspace} accept=".json" style={{ display: 'none' }} />
        </div>
    );
};

export default Header;
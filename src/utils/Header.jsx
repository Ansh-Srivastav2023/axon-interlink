import { useEffect, useRef, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import {
    IconArrowBackUp,
    IconArrowForwardUp,
    IconDotsVertical,
    IconHierarchy2,
    IconPalette,
    IconPlayerPlay,
} from "@tabler/icons-react";

import { IconFolder, IconSave, IconTrash } from "../styles";
import { AppLogo } from "./Logo";

const HELP_ICON = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 1 1 5.3 2c-.7.7-1.4 1.2-1.4 2.5" />
        <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
    </svg>
);

const glassHover = (t, glowColor = null) => ({
    onMouseEnter: (e) => {
        if (e.currentTarget.disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.background = glowColor ? `${glowColor}18` : t.bgTertiary;
        e.currentTarget.style.borderColor = glowColor || t.borderStrong;
        e.currentTarget.style.color = glowColor || t.textHeading;
    },
    onMouseLeave: (e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = t.border;
    },
});

const Header = ({
    s,
    theme,
    t,
    nodes,
    edges,
    undo,
    past,
    redo,
    future,
    toolbarBtn,
    handleSaveWorkspace,
    handleLoadWorkspace,
    fileInputRef,
    setShowClearModal,
    setShowHelp,
    setTheme,
    helpColors,
    arrangeTopologicalLayout,
    colorWiresByModule,
    setColorWiresByModule,
    animateWireFlow,
    setAnimateWireFlow,
    deleteMode,
    setDeleteMode,
    performanceMode,
}) => {
    const isMobile = true;
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
    const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setWorkspaceMenuOpen(false);
                setToolsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dropItemStyle = {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "10px 14px",
        background: "none",
        border: "none",
        color: t.text,
        fontSize: "13px",
        fontWeight: 500,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        transition: "background 0.15s ease, color 0.15s ease",
        borderRadius: "7px",
    };

    const panelStyle = (right = 0, minWidth = 180) => ({
        position: "absolute",
        right,
        top: "42px",
        backgroundColor: t.bgSecondary === "#050505" ? "#111111" : "#ffffff",
        border: `1px solid ${t.borderStrong || "#222"}`,
        borderRadius: "10px",
        boxShadow: theme === "dark" ? "0 12px 28px rgba(0,0,0,0.36)" : "0 12px 28px rgba(15,23,42,0.12)",
        zIndex: 2000,
        minWidth,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "6px",
    });

    const closeMenus = () => {
        setWorkspaceMenuOpen(false);
        setToolsMenuOpen(false);
    };

    const menuButtonStyle = (active, danger = false) => ({
        ...toolbarBtn,
        padding: "6px 10px",
        background: danger ? "rgba(239,68,68,0.15)" : active ? t.bgTertiary : toolbarBtn.background,
        borderColor: danger ? "rgba(239,68,68,0.6)" : active ? t.borderStrong : t.border,
        color: danger ? "#ef4444" : toolbarBtn.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    });

    const activeBg = (color) => (theme === "dark" ? `${color}1f` : `${color}18`);

    return (
        <div style={{ ...s.header, position: "relative", overflow: "visible" }}>
            <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <AppLogo size={isMobile ? 60 : 700} t={t} />
            </div>

            <div
                style={{
                    display: "flex",
                    gap: isMobile ? "6px" : "8px",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flex: 1,
                }}
            >
                <span style={s.badge}>{nodes.length}{isMobile ? "B" : " blocks"}</span>
                <span style={s.badge}>{edges.length}{isMobile ? "W" : " wires"}</span>
                {performanceMode && (
                    <span
                        title="Performance mode: large design throttles live code generation, DRC, and full-wire animation."
                        style={{
                            ...s.badge,
                            color: "#f59e0b",
                            borderColor: "rgba(245,158,11,0.35)",
                            background: theme === "dark" ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.14)",
                        }}
                    >
                        PERF
                    </span>
                )}

                <button
                    onClick={undo}
                    disabled={past.length === 0}
                    style={{ ...toolbarBtn, opacity: past.length === 0 ? 0.35 : 1, padding: "6px 10px" }}
                    title="Undo (Ctrl+Z)"
                    {...glassHover(t)}
                >
                    <IconArrowBackUp size={16} />
                </button>

                <button
                    onClick={redo}
                    disabled={future.length === 0}
                    style={{ ...toolbarBtn, opacity: future.length === 0 ? 0.35 : 1, padding: "6px 10px" }}
                    title="Redo (Ctrl+Y)"
                    {...glassHover(t)}
                >
                    <IconArrowForwardUp size={16} />
                </button>

                {!isMobile && (
                    <>
                        <button onClick={handleSaveWorkspace} style={{ ...toolbarBtn, background: t.primary, color: "#fff", borderColor: t.primary }} {...glassHover(t)}>
                            <IconSave size={16} /> Save Work
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} style={toolbarBtn} {...glassHover(t)}>
                            <IconFolder size={16} /> Load File
                        </button>
                        <button onClick={() => setShowHelp(true)} style={{ ...toolbarBtn, background: helpColors.bg, color: helpColors.text, borderColor: helpColors.border }} {...glassHover(t)}>
                            {HELP_ICON} Help
                        </button>
                        <button onClick={arrangeTopologicalLayout} style={toolbarBtn} {...glassHover(t)}>
                            <IconHierarchy2 size={16} /> Auto Layout
                        </button>
                    </>
                )}

                {isMobile && (
                    <div ref={menuRef} style={{ position: "relative", display: "flex", gap: "6px" }}>
                        <button
                            title="Workspace menu"
                            onClick={() => {
                                setWorkspaceMenuOpen((open) => !open);
                                setToolsMenuOpen(false);
                            }}
                            style={menuButtonStyle(workspaceMenuOpen)}
                            {...glassHover(t)}
                        >
                            <IconFolder size={18} />
                        </button>

                        <button
                            title={deleteMode ? "Tools menu - delete mode enabled" : "Tools menu"}
                            onClick={() => {
                                setToolsMenuOpen((open) => !open);
                                setWorkspaceMenuOpen(false);
                            }}
                            style={menuButtonStyle(toolsMenuOpen, deleteMode)}
                            {...glassHover(t, deleteMode ? "#ef4444" : null)}
                        >
                            <IconDotsVertical size={18} />
                        </button>

                        {workspaceMenuOpen && (
                            <div style={panelStyle(44, 180)}>
                                <button
                                    style={dropItemStyle}
                                    onClick={() => {
                                        handleSaveWorkspace();
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <IconSave size={16} style={{ color: t.primary }} /> Save Work
                                </button>

                                <button
                                    style={dropItemStyle}
                                    onClick={() => {
                                        fileInputRef.current?.click();
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <IconFolder size={16} style={{ color: t.textSecondary }} /> Load File
                                </button>

                                <button
                                    style={dropItemStyle}
                                    onClick={() => {
                                        setTheme((previous) => (previous === "light" ? "dark" : "light"));
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    {theme === "light" ? <FaMoon size={14} /> : <FaSun size={14} />} Switch Theme
                                </button>

                                <button
                                    style={dropItemStyle}
                                    onClick={() => {
                                        setShowHelp(true);
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <span style={{ display: "flex", color: "#f59e0b" }}>{HELP_ICON}</span> Help System
                                </button>
                            </div>
                        )}

                        {toolsMenuOpen && (
                            <div style={panelStyle(0, 194)}>
                                <button
                                    style={dropItemStyle}
                                    onClick={() => {
                                        arrangeTopologicalLayout();
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <IconHierarchy2 size={16} style={{ color: "#8b5cf6" }} /> Auto Layout
                                </button>

                                <button
                                    style={{
                                        ...dropItemStyle,
                                        color: colorWiresByModule ? "#34d399" : t.text,
                                        backgroundColor: colorWiresByModule ? activeBg("#34d399") : "transparent",
                                    }}
                                    onClick={() => {
                                        setColorWiresByModule((previous) => !previous);
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colorWiresByModule ? activeBg("#34d399") : "transparent"}
                                >
                                    <IconPalette size={16} style={{ color: colorWiresByModule ? "#34d399" : t.textSecondary }} />
                                    {colorWiresByModule ? "Normal Wire Colors" : "Module Wire Colors"}
                                </button>

                                <button
                                    style={{
                                        ...dropItemStyle,
                                        color: animateWireFlow ? "#60a5fa" : t.text,
                                        backgroundColor: animateWireFlow ? activeBg("#60a5fa") : "transparent",
                                    }}
                                    onClick={() => {
                                        setAnimateWireFlow((previous) => !previous);
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = animateWireFlow ? activeBg("#60a5fa") : "transparent"}
                                >
                                    <IconPlayerPlay size={16} style={{ color: animateWireFlow ? "#60a5fa" : t.textSecondary }} />
                                    {animateWireFlow ? "Stop Wire Flow" : "Animate Wire Flow"}
                                </button>

                                <button
                                    style={{ ...dropItemStyle, color: t.danger }}
                                    onClick={() => {
                                        setShowClearModal(true);
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === "dark" ? "#2d0f12" : "#fef2f2"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <IconTrash size={16} /> Clear Canvas
                                </button>

                                <button
                                    style={{
                                        ...dropItemStyle,
                                        color: deleteMode ? "#ef4444" : t.text,
                                        backgroundColor: deleteMode ? activeBg("#ef4444") : "transparent",
                                    }}
                                    onClick={() => {
                                        setDeleteMode((previous) => !previous);
                                        closeMenus();
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = deleteMode ? activeBg("#ef4444") : t.bgTertiary}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = deleteMode ? activeBg("#ef4444") : "transparent"}
                                >
                                    <IconTrash size={16} /> {deleteMode ? "Exit Delete Mode" : "Delete Mode"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleLoadWorkspace} accept=".json" style={{ display: "none" }} />
        </div>
    );
};

export default Header;

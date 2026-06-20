import { useCallback } from 'react';

export default function useFileOperations({
    nodes,
    edges,
    customCodes,
    exposedPorts,
    theme,
    recordHistory,
    setNodes,
    setEdges,
    setCustomCodes,
    setExposedPorts,
    setSelectedNodeId,
    setSelectedEdgeId,
    setGlowingNet,
    setTheme,
    setShowSaveModal,
    setShowClearModal,
}) {
    // ─── DOWNLOAD / SAVE ──────────────────────────────────────────
    const executeActualDownload = useCallback((fileNameString) => {
        const cleanFileName = fileNameString.trim() || `rtl_schematic_backup_${Date.now().toString().slice(-5)}`;
        const finalDownloadName = cleanFileName.endsWith('.json') ? cleanFileName : `${cleanFileName}.json`;
        const dataToSave = { version: '1.0.0', nodes, edges, customCodes, exposedPorts, theme };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', finalDownloadName);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setShowSaveModal(false);
    }, [nodes, edges, customCodes, exposedPorts, theme, setShowSaveModal]);

    // ─── LOAD FILE ────────────────────────────────────────────────
    const handleLoadWorkspace = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedWorkspace = JSON.parse(e.target?.result);
                if (parsedWorkspace.nodes && parsedWorkspace.edges) {
                    recordHistory();
                    setNodes(parsedWorkspace.nodes);
                    setEdges(parsedWorkspace.edges);
                    setCustomCodes(parsedWorkspace.customCodes || {});
                    setExposedPorts(parsedWorkspace.exposedPorts || {});
                    if (parsedWorkspace.theme) setTheme(parsedWorkspace.theme);
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    setGlowingNet(null);
                } else {
                    alert('Invalid architecture file layout structure.');
                }
            } catch {
                alert('Failed parsing structural graph workspace architecture config file payload.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }, [
        recordHistory,
        setNodes,
        setEdges,
        setCustomCodes,
        setExposedPorts,
        setTheme,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
    ]);

    // ─── CLEAR ALL ────────────────────────────────────────────────
    const handleClearAll = useCallback(() => {
        recordHistory();
        setNodes([]);
        setEdges([]);
        setExposedPorts({});
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setShowClearModal(false);
        localStorage.removeItem('axon_interlink_workspace');
    }, [
        recordHistory,
        setNodes,
        setEdges,
        setExposedPorts,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
        setShowClearModal,
    ]);

    return {
        executeActualDownload,
        handleLoadWorkspace,
        handleClearAll,
    };
}
import { useCallback } from 'react';
import { createWorkspacePayload, workspacePayloadToFlatState } from '../utils/projectModel';

export default function useFileOperations({
    nodes,
    edges,
    customCodes,
    exposedPorts,
    theme,
    projectModel,
    recordHistory,
    setNodes,
    setEdges,
    setCustomCodes,
    setExposedPorts,
    setProjectModel,
    setSelectedNodeId,
    setSelectedEdgeId,
    setGlowingNet,
    setTheme,
    setShowSaveModal,
    setShowClearModal,
}) {
    const executeActualDownload = useCallback((fileNameString) => {
        const cleanFileName = fileNameString.trim() || `rtl_schematic_backup_${Date.now().toString().slice(-5)}`;
        const finalDownloadName = cleanFileName.endsWith('.json') ? cleanFileName : `${cleanFileName}.json`;
        const dataToSave = createWorkspacePayload({
            nodes,
            edges,
            customCodes,
            exposedPorts,
            theme,
            previousProject: projectModel,
        });

        setProjectModel(dataToSave.project);

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', finalDownloadName);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setShowSaveModal(false);
    }, [nodes, edges, customCodes, exposedPorts, theme, projectModel, setProjectModel, setShowSaveModal]);

    const handleLoadWorkspace = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedWorkspace = JSON.parse(e.target?.result);
                const migratedWorkspace = workspacePayloadToFlatState(parsedWorkspace);

                if (Array.isArray(migratedWorkspace.nodes) && Array.isArray(migratedWorkspace.edges)) {
                    recordHistory();
                    setNodes(migratedWorkspace.nodes);
                    setEdges(migratedWorkspace.edges);
                    setCustomCodes(migratedWorkspace.customCodes || {});
                    setExposedPorts(migratedWorkspace.exposedPorts || {});
                    setProjectModel(migratedWorkspace.project);
                    if (migratedWorkspace.theme) setTheme(migratedWorkspace.theme);
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
        setProjectModel,
        setTheme,
        setSelectedNodeId,
        setSelectedEdgeId,
        setGlowingNet,
    ]);

    const handleClearAll = useCallback(() => {
        recordHistory();
        setNodes([]);
        setEdges([]);
        setCustomCodes({});
        setExposedPorts({});
        setProjectModel(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setGlowingNet(null);
        setShowClearModal(false);
        localStorage.removeItem('axon_interlink_workspace');
    }, [
        recordHistory,
        setNodes,
        setEdges,
        setCustomCodes,
        setExposedPorts,
        setProjectModel,
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

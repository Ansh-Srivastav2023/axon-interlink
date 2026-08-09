import { useState } from 'react';
import { IconBox } from '../../styles/icons';
import ModalHeader from './ModalHeader';
import SplitterPanel from './SplitterPanel';
import PropertiesPanel from './PropertiesPanel';
import NodeModalFooter from './NodeModalFooter';

const NodeModalContent = ({
    node,
    targetId,
    theme,
    t,
    s,
    nodes,
    edges,
    exposedPorts,
    closeModal,
    updateSelectedNode,
    togglePortSwap,
    toggleExposePort,
    getPortLabel,
    parsePorts,
    recordHistory,
    setNodes,
    setEdges,
    setExposedPorts,
    setSelectedNodeId,
    onSaveCode,
    currentModuleCode
}) => {
    const [instantiationQuantity, setInstantiationQuantity] = useState(1);
    const isDark = theme === 'dark';
    const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);

    // Neutral scrollbar tokens
    const scrollbarThumb = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)';
    const scrollbarThumbHover = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)';
    const scrollbarTrack = isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <>
            <ModalHeader
                title={`Configure: ${node.data.moduleName}`}
                icon={<IconBox size={20} />}
                onClose={closeModal}
                theme={theme}
                t={t}
            />
            <div 
                className="node-modal-scroll"
                style={{
                    maxHeight: '430px',
                    overflowY: 'auto',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    cursor: 'default',
                }}
            >
                <style>{`
                    .node-modal-scroll::-webkit-scrollbar {
                        width: 8px;
                    }
                    .node-modal-scroll::-webkit-scrollbar-track {
                        background: ${scrollbarTrack};
                        border-radius: 4px;
                    }
                    .node-modal-scroll::-webkit-scrollbar-thumb {
                        background: ${scrollbarThumb};
                        border-radius: 4px;
                        transition: background 0.15s ease;
                    }
                    .node-modal-scroll::-webkit-scrollbar-thumb:hover {
                        background: ${scrollbarThumbHover};
                    }
                    .node-modal-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: ${scrollbarThumb} ${scrollbarTrack};
                    }
                `}</style>
                {isSplitterOrBundler ? (
                    <SplitterPanel
                        node={node}
                        targetId={targetId}
                        t={t}
                        s={s}
                        getPortLabel={getPortLabel}
                        parsePorts={parsePorts}
                        recordHistory={recordHistory}
                        setNodes={setNodes}
                        setEdges={setEdges}
                        setExposedPorts={setExposedPorts}
                        edges={edges}
                        exposedPorts={exposedPorts}
                        toggleExposePort={toggleExposePort}
                    />
                ) : (
                    <PropertiesPanel
                        node={node}
                        targetId={targetId}
                        t={t}
                        s={s}
                        updateSelectedNode={updateSelectedNode}
                        instantiationQuantity={instantiationQuantity}
                        setInstantiationQuantity={setInstantiationQuantity}
                        getPortLabel={getPortLabel}
                        togglePortSwap={togglePortSwap}
                        edges={edges}
                        exposedPorts={exposedPorts}
                        toggleExposePort={toggleExposePort}
                    />
                )}
            </div>
            <NodeModalFooter
                targetId={targetId}
                nodes={nodes}
                t={t}
                s={s}
                recordHistory={recordHistory}
                setNodes={setNodes}
                closeModal={closeModal}
                setSelectedNodeId={setSelectedNodeId}
                onSaveCode={onSaveCode}
                instantiationQuantity={instantiationQuantity}
                setInstantiationQuantity={setInstantiationQuantity}
                currentModuleCode={currentModuleCode}
            />
        </>
    );
};

export default NodeModalContent;

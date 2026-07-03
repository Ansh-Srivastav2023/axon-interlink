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
    setSelectedNodeId,
    onSaveCode,
    setFullCodeModalOpen,
    instantiationQuantity,
    setInstantiationQuantity,
    localCode
}) => {
    const isSplitterOrBundler = !!(node.data.isSplitter || node.data.isBundler);

    return (
        <>
            <ModalHeader
                title={`Configure: ${node.data.moduleName}`}
                icon={<IconBox size={20} />}
                onClose={closeModal}
                theme={theme}
                t={t}
            />
            <div style={{
                height: '320px',
                overflowY: 'auto',
                paddingRight: '4px',
                scrollbarWidth: 'thin',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                scrollbarColor: theme === 'dark' ? '#333333 #050505' : '#cbd5e1 #f3f4f6'
            }}>
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
                        setFullCodeModalOpen={setFullCodeModalOpen}
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
                localCode={localCode}
                recordHistory={recordHistory}
                setNodes={setNodes}
                closeModal={closeModal}
                setSelectedNodeId={setSelectedNodeId}
                onSaveCode={onSaveCode}
                instantiationQuantity={instantiationQuantity}
                setInstantiationQuantity={setInstantiationQuantity}
                localCode={localCode}
            />
        </>
    );
};

export default NodeModalContent;
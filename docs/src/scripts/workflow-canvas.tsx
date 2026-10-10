import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Background, BackgroundVariant, ConnectionLineType, ConnectionMode,
  Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider,
  applyNodeChanges, useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, Node, NodeChange, NodeProps, XYPosition } from '@xyflow/react';
import type { WorkflowDocument, WorkflowEvent, WorkflowNode } from '../../../src/workflow.ts';
import '@xyflow/react/dist/style.css';
import './workflow-canvas.css';

type AudioData = Record<string, unknown> & {
  record: WorkflowNode;
  state?: WorkflowEvent;
};
type AudioNode = Node<AudioData, 'audio'>;
interface CanvasSnapshot {
  document: WorkflowDocument;
  positions: ReadonlyMap<string, XYPosition>;
  states: ReadonlyMap<string, WorkflowEvent>;
  selected: string;
  revision: number;
  fitRequest: number;
}
interface Callbacks {
  select(id: string): void;
  position(id: string, position: XYPosition): void;
  connect(connection: Connection): void;
  validate(connection: Connection): boolean;
  connectionRejected(): void;
}

function AudioCard({ data, selected }: NodeProps<AudioNode>) {
  const node = data.record;
  const state = data.state;
  return (
    <div className={`wf-rf-node ${selected ? 'wf-rf-selected' : ''} ${state ? 'wf-rf-' + state.state : ''}`}>
      <div className="wf-rf-heading">
        <span className="wf-rf-overline">{node.type === 'source' ? 'AUDIO SOURCE' : 'SEPARATION MODEL'}</span>
        <strong title={node.label}>{node.label}</strong>
        <span className="wf-rf-subline">{node.type === 'source' ? 'Remote audio · HTTPS' : `MVSep · model #${node.algorithmId}`}</span>
      </div>
      {node.type === 'source'
        ? <div className="wf-rf-ports">
            <div className="wf-rf-port wf-rf-output">
              <span className="wf-rf-stem">Audio</span>
              <span className="wf-rf-kind">SOURCE</span>
              <Handle type="source" position={Position.Right} id="source" title="Drag to an input port" />
            </div>
            <div className="wf-rf-url" title={node.url}>{node.url}</div>
          </div>
        : <div className="wf-rf-ports">
            <div className="wf-rf-port wf-rf-input">
              <Handle type="target" position={Position.Left} id="input" title="Drop an audio stem here" />
              <span className="wf-rf-stem">Audio in</span>
              <span className="wf-rf-kind">INPUT</span>
            </div>
            <div className="wf-rf-port-divider">OUTPUT STEMS <span>{node.stems.length}</span></div>
            {node.stems.map(stem => (
              <div key={stem} className="wf-rf-port wf-rf-output">
                <span className="wf-rf-stem" title={stem}>{stem}</span>
                <span className="wf-rf-kind">AUDIO</span>
                <Handle type="source" position={Position.Right} id={stem} title={`Drag ${stem} to a downstream model`} />
              </div>
            ))}
          </div>
      }
      <div className="wf-rf-footer">
        <span className={`wf-rf-status wf-rf-status-${state?.state ?? 'idle'}`}>
          <i aria-hidden="true" />{state?.state ?? (node.type === 'source' ? 'Ready' : 'Not run')}
        </span>
        {node.type === 'separate' && Object.keys(node.options).length > 0 &&
          <span>{Object.keys(node.options).length} option(s)</span>}
        {state?.hash && <span title={state.hash}>{state.hash.slice(0, 9)}…</span>}
      </div>
    </div>
  );
}
const nodeTypes = { audio: AudioCard };

function modelNodes(snapshot: CanvasSnapshot): AudioNode[] {
  return snapshot.document.nodes.map(record => ({
    id: record.id,
    type: 'audio' as const,
    position: snapshot.positions.get(record.id) ?? { x: 60, y: 60 },
    data: { record, state: snapshot.states.get(record.id) },
    selected: record.id === snapshot.selected,
    draggable: true,
    deletable: false,
  }));
}
function modelEdges(snapshot: CanvasSnapshot): Edge[] {
  return snapshot.document.nodes.flatMap(record => {
    if (record.type !== 'separate') return [];
    const status = snapshot.states.get(record.id)?.state;
    return [{
      id: `input-${record.id}`,
      source: record.input.nodeId,
      sourceHandle: record.input.stem,
      target: record.id,
      targetHandle: 'input',
      type: 'smoothstep',
      animated: status === 'running',
      deletable: false,
      style: { strokeWidth: 2.1, stroke: status === 'done' ? 'var(--wf-accent)' : 'var(--wf-edge)' },
    }];
  });
}

function Editor({ snapshot, callbacks }: { snapshot: CanvasSnapshot; callbacks: Callbacks }) {
  const [nodes, setNodes] = useState<AudioNode[]>(() => modelNodes(snapshot));
  const [edges, setEdges] = useState<Edge[]>(() => modelEdges(snapshot));
  const { fitView } = useReactFlow<AudioNode>();
  useEffect(() => {
    setNodes(modelNodes(snapshot));
    setEdges(modelEdges(snapshot));
  }, [snapshot.revision, snapshot.document, snapshot.selected, snapshot.positions, snapshot.states]);
  useEffect(() => {
    if (!snapshot.fitRequest) return;
    const animation = requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 420, maxZoom: 1.05 });
    });
    return () => cancelAnimationFrame(animation);
  }, [snapshot.fitRequest, fitView]);
  const onNodesChange = useCallback((changes: NodeChange<AudioNode>[]) => {
    setNodes(existing => applyNodeChanges(changes.filter(c => c.type !== 'remove'), existing));
  }, []);
  const onConnect = useCallback((connection: Connection) => callbacks.connect(connection), [callbacks]);
  const isValidConnection = useCallback((connection: Connection | Edge) =>
    callbacks.validate(connection as Connection), [callbacks]);
  const colorMode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  return (
    <div className="wf-rf-root" aria-label="Audio workflow graph editor">
      <ReactFlow<AudioNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => callbacks.select(node.id)}
        onNodeDragStop={(_, node) => callbacks.position(node.id, node.position)}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onConnectEnd={(_, connectionState) => {
          if (connectionState.fromHandle && !connectionState.isValid) callbacks.connectionRejected();
        }}
        onReconnect={(_, connection) => callbacks.connect(connection)}
        edgesReconnectable
        nodesConnectable
        nodesDraggable
        elementsSelectable
        deleteKeyCode={null}
        minZoom={0.15}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep', interactionWidth: 18 }}
        connectionMode={ConnectionMode.Strict}
        connectionLineType={ConnectionLineType.SmoothStep}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
        colorMode={colorMode}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
        <MiniMap
          pannable zoomable position="bottom-right"
          nodeColor={node => (node.data as AudioData).record.type === 'source' ? 'var(--wf-source)' : 'var(--wf-accent)'}
          maskColor="var(--wf-minimap-mask)"
          ariaLabel="Workflow overview"
        />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}

export function mountWorkflowCanvas(element: HTMLElement, callbacks: Callbacks) {
  const root = createRoot(element);
  let last: CanvasSnapshot | undefined;
  let fitRequest = 0;
  const render = (snapshot: Omit<CanvasSnapshot, 'fitRequest'>) => {
    last = { ...snapshot, fitRequest };
    root.render(
      <ReactFlowProvider>
        <Editor snapshot={last} callbacks={callbacks} />
      </ReactFlowProvider>,
    );
  };
  return {
    render,
    fit() { if (last) { fitRequest++; render(last); } },
    unmount() { root.unmount(); },
  };
}

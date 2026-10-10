import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Background, BackgroundVariant, ConnectionLineType, ConnectionMode,
  Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider,
  applyNodeChanges, useReactFlow, useUpdateNodeInternals,
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
  const updateNodeInternals = useUpdateNodeInternals();
  const cardRef = useRef<HTMLDivElement>(null);
  const stemSignature = node.type === 'source' ? 'source' :
    node.type === 'separate' || node.type === 'process' ? node.stems.join('\u0000') : '';
  useLayoutEffect(() => {
    // Handles live inside nested, custom-height rows. Their initial position can
    // be measured before CSS/fonts load or while the workflow tab is hidden.
    // Refresh the real DOM geometry after layout and when output ports change.
    const element = cardRef.current;
    if (!element) return;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => updateNodeInternals(node.id));
    };
    refresh();
    const observer = new ResizeObserver(refresh);
    observer.observe(element);
    for (const port of element.querySelectorAll('.wf-rf-port')) observer.observe(port);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [node.id, stemSignature, updateNodeInternals]);
  if (node.type === 'output') return (
    <div ref={cardRef} className="wf-rf-node wf-rf-endpoint">
      <div className="wf-rf-heading"><span className="wf-rf-overline">SELECTED EXPORT</span><strong>{node.label}</strong></div>
      <div className="wf-rf-port wf-rf-input">
        <Handle type="target" position={Position.Left} id="input" />
        <span className="wf-rf-stem">{node.input.stem}</span><span className="wf-rf-kind">FINAL</span>
      </div>
    </div>
  );
  if (node.type === 'process') return (
    <div ref={cardRef} className="wf-rf-node wf-rf-processor">
      <div className="wf-rf-heading"><span className="wf-rf-overline">FFMPEG</span><strong>{node.label}</strong><span className="wf-rf-subline">{node.effect.type}</span></div>
      {node.inputs.map((input,i)=><div key={i} className="wf-rf-port wf-rf-input">
        <Handle type="target" position={Position.Left} id={'input-'+i} />
        <span className="wf-rf-stem">Input {i+1}</span><span className="wf-rf-kind">{input.stem}</span>
      </div>)}
      <div className="wf-rf-port wf-rf-output"><span className="wf-rf-stem">Processed audio</span>
        <Handle type="source" position={Position.Right} id="audio" />
      </div>
    </div>
  );
  return (
    <div ref={cardRef} className={`wf-rf-node ${selected ? 'wf-rf-selected' : ''} ${state ? 'wf-rf-' + state.state : ''}`}>
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
            <div className="wf-rf-url" title={node.url}>{node.fileName ?? node.url}</div>
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
    const inputs = record.type === 'separate' || record.type === 'output'
      ? [{ ...record.input, targetHandle: 'input' }]
      : record.type === 'process' ? record.inputs.map((input,i)=>({...input,targetHandle:'input-'+i})) : [];
    if (!inputs.length) return [];
    const status = snapshot.states.get(record.id)?.state;
    return inputs.map((input,i)=>({
      id: 'input-' + record.id + '-' + i,
      source: input.nodeId,
      sourceHandle: input.stem,
      target: record.id,
      targetHandle: input.targetHandle,
      type: 'smoothstep',
      animated: status === 'running',
      deletable: false,
      style: { strokeWidth: 2.1, stroke: status === 'done' ? 'var(--wf-accent)' : 'var(--wf-edge)' },
    }));
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
        onInit={instance => { if (import.meta.env.DEV) (window as Window & { __mvsepFlowDebug?: typeof instance }).__mvsepFlowDebug = instance; }}
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

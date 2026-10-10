import { mountWorkflowCanvas } from './workflow-canvas.tsx';
import type { Connection } from '@xyflow/react';
import { WorkflowGraph, Models, separate, modelFromAlgorithm } from '../../../src/workflow.ts';
import type { WorkflowDocument, WorkflowNode, WorkflowSeparationNode, WorkflowRunResult, WorkflowEvent, WorkflowModel } from '../../../src/workflow.ts';
import type { MvsepClient } from '../../../src/advanced.ts';
import type { SeparationAlgorithm, AlgorithmField } from '../../../src/types.ts';

interface DesignerHooks {
  client(): MvsepClient | null;
  onLog(message: string): void;
  onResult(label: string, value: unknown): void;
}
const builtins: readonly WorkflowModel[] = Object.values(Models);
const defaultSource = 'https://example.com/song.wav'; // Placeholder, never treated as an actual user's audio.
const a = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
function defaultStems(algorithm: SeparationAlgorithm): string[] {
  const known = builtins.find(b => b.id === algorithm.render_id);
  if (known) return [...known.stems];
  const parenthetical = algorithm.name.match(/\(([^)]+)\)/g)?.at(-1)?.slice(1, -1);
  if (!parenthetical) return ['output'];
  const options = parenthetical.replace(/^(?:\d+[-–]\d+\s*stems\s*:\s*)/i, '');
  const names = options.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(x => /^[a-z][a-z0-9_]*$/.test(x));
  return names.length > 1 ? [...new Set(names)] : ['output'];
}
function fieldChoices(field: AlgorithmField): { value: string; label: string }[] {
  let data = field.options;
  if (typeof data === 'string') { try { data = JSON.parse(data) as typeof field.options; } catch { return []; } }
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(item => item && item.key !== undefined).map(item => ({ value: String(item.key), label: String(item.value ?? item.name ?? item.key) }));
  return Object.entries(data).map(([value, label]) => ({ value, label: String(label) }));
}
function createEl<K extends keyof HTMLElementTagNameMap>(tag: K, css = '', value = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = css;
  element.textContent = value;
  return element;
}
export function mountWorkflowDesigner(root: HTMLElement, hooks: DesignerHooks) {
  const $ = <T extends Element = HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  let graph = new WorkflowGraph();
  let catalog: SeparationAlgorithm[] = [];
  let selected = '';
  let running: AbortController | null = null;
  let results: WorkflowRunResult['steps'] = {};
  const positions = new Map<string, { x: number; y: number }>();
  const states = new Map<string, WorkflowEvent>();
  let currentDoc: WorkflowDocument = graph.document;
  let revision = 0;
  const details = $('wf-details');
  const status = $('wf-status');
  function say(message: string, isError = false) { status.textContent = message; status.classList.toggle('wf-error', isError); hooks.onLog(message); }
  function sync() { currentDoc = graph.document; }
  function edit(mutator: (doc: WorkflowDocument) => void) {
    const next = graph.document;
    try {
      mutator(next);
      graph = new WorkflowGraph(next);
      sync(); results = {}; states.clear(); render();
    } catch (error) { say(error instanceof Error ? error.message : String(error), true); renderDetails(); }
  }
  function hydrate(doc: WorkflowDocument) {
    graph = new WorkflowGraph(doc); sync(); results = {}; states.clear();
    if (!doc.nodes.some(node => node.id === selected)) selected = doc.nodes[0]?.id ?? '';
    layout(); render();
  }
  function layout() {
    const depth = new Map<string, number>();
    for (const node of graph.validate()) {
      depth.set(node.id, node.type === 'source' ? 0 : (depth.get(node.input.nodeId) ?? 0) + 1);
    }
    const indexes = new Map<number, number>();
    for (const node of graph.validate()) {
      const col = depth.get(node.id) ?? 0;
      const row = indexes.get(col) ?? 0; indexes.set(col, row + 1);
      // Custom stems vary in height; give each card enough vertical space to avoid overlap.
      const siblings = graph.validate().filter(item => (depth.get(item.id) ?? 0) === col).slice(0, row);
      const y = 48 + siblings.reduce((sum, item) => sum + (item.type === 'source' ? 190 : 168 + item.stems.length * 33) + 26, 0);
      positions.set(node.id, { x: 48 + col * 350, y });
    }
  }
  function validateConnection(connection: Connection): boolean {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || !sourceHandle || targetHandle !== 'input' || source === target) return false;
    const origin = currentDoc.nodes.find(node => node.id === source);
    const destination = currentDoc.nodes.find(node => node.id === target);
    if (!origin || destination?.type !== 'separate') return false;
    if (origin.type === 'source' ? sourceHandle !== 'source' : !origin.stems.includes(sourceHandle)) return false;
    try {
      const doc = structuredClone(currentDoc);
      const node = doc.nodes.find(node => node.id === target);
      if (node?.type !== 'separate') return false;
      node.input = { nodeId: source, stem: sourceHandle };
      new WorkflowGraph(doc);
      return true;
    } catch { return false; }
  }
  const canvas = mountWorkflowCanvas($('wf-canvas'), {
    select(id) { selected = id; render(); },
    position(id, position) { positions.set(id, position); },
    validate: validateConnection,
    connect(connection) {
      if (!validateConnection(connection)) {
        say('Invalid connection: check source stem, target input, and dependency cycles.', true);
        return;
      }
      edit(doc => {
        const node = doc.nodes.find(node => node.id === connection.target);
        if (node?.type !== 'separate') throw Error('A separation node must be the destination.');
        node.input = { nodeId: connection.source!, stem: connection.sourceHandle! };
      });
      selected = connection.target!;
      render();
    },
    connectionRejected() { say('Connection rejected: only compatible source stems can feed model inputs, and cycles are forbidden.', true); },
  });
  function render() {
    canvas.render({ document: currentDoc, positions, states, selected, revision: ++revision });
    renderDetails(); renderCode();
    $<HTMLButtonElement>('wf-run').disabled = Boolean(running) || currentDoc.nodes.every(n => n.type === 'source');
  }
  function label(id: string, title: string): HTMLElement { const item=createEl('label','wf-field');item.append(createEl('span','',title)); const input=document.createElement('input');input.id=id;item.append(input);return item; }
  function chooseInput(node: WorkflowSeparationNode) {
    const wrapper = createEl('label','wf-field'); wrapper.append(createEl('span','','Input stem'));
    const select = document.createElement('select');
    for (const parent of currentDoc.nodes) {
      if (parent.id===node.id) continue;
      const stems=parent.type==='source'?['source']:parent.stems;
      for (const stem of stems) {
        const option=new Option(parent.label+' → '+stem,parent.id+'::'+stem);
        if (parent.id===node.input.nodeId && stem===node.input.stem) option.selected=true;
        select.add(option);
      }
    }
    select.addEventListener('change', () => {
      const [nodeId,stem] = select.value.split('::');
      edit(doc => { const record=doc.nodes.find(n=>n.id===node.id);if (record?.type==='separate') record.input={nodeId:nodeId!,stem:stem!}; });
    });
    wrapper.append(select);return wrapper;
  }
  function renderDetails() {
    details.replaceChildren();
    const node = currentDoc.nodes.find(n=>n.id===selected);
    details.append(createEl('h4','',node?'Edit '+node.label:'Select a node'));
    if (!node) { details.append(createEl('p','wf-muted','Choose a node to configure its input, algorithm, and model options.'));return; }
    const name=label('wf-edit-label','Node label');const nameInput=name.querySelector('input')!;nameInput.value=node.label;
    nameInput.addEventListener('change', () => edit(doc => { doc.nodes.find(n=>n.id===node.id)!.label=nameInput.value; })); details.append(name);
    if (node.type==='source') {
      const field=label('wf-edit-url','Public HTTPS audio URL');const input=field.querySelector('input')!;input.value=node.url;
      input.addEventListener('change',()=>edit(doc=>{const target=doc.nodes.find(n=>n.id===node.id);if(target?.type==='source') target.url=input.value.trim();}));details.append(field);
      if (node.url===defaultSource) details.append(createEl('p','wf-note','Placeholder source. Replace before any paid execution.'));
    } else {
      details.append(chooseInput(node));
      const modelSelect = createEl('label','wf-field');modelSelect.append(createEl('span','','Algorithm'));
      const selector=document.createElement('select');
      const choices=[...builtins.map(m=>({render_id:m.id,name:m.name})),...catalog].filter((m,i,arr)=>arr.findIndex(other=>other.render_id===m.render_id)===i);
      if (!choices.some(m=>m.render_id===node.algorithmId)) choices.push({render_id:node.algorithmId,name:node.label});
      for(const m of choices) { const option=new Option(m.name+' (#'+m.render_id+')',String(m.render_id)); option.selected=m.render_id===node.algorithmId;selector.add(option); }
      selector.addEventListener('change',()=>{ const id=Number(selector.value);const next=choices.find(c=>c.render_id===id)!;
        const fields=catalog.find(c=>c.render_id===id);const stems=fields?defaultStems(fields):builtins.find(b=>b.id===id)?.stems ?? ['output'];
        edit(doc=>{const target=doc.nodes.find(n=>n.id===node.id);if(target?.type==='separate'){target.algorithmId=id;target.label=next.name;target.options={};target.stems=[...stems];}});
      });modelSelect.append(selector);details.append(modelSelect);
      const spec=catalog.find(m=>m.render_id===node.algorithmId);
      const optionList=spec?.algorithm_fields ?? [];
      if (!spec) details.append(createEl('p','wf-note','Load the live catalog to configure algorithm-specific options.'));
      for(const field of optionList) {
        if (!/^add_opt[123]$/.test(field.name??'')) continue;
        const wrapper=createEl('label','wf-field');wrapper.append(createEl('span','',field.text??field.name??''));
        const options=fieldChoices(field);let element:HTMLInputElement|HTMLSelectElement;
        if (options.length) {
          const select=document.createElement('select');select.add(new Option('Use model default',''));
          for(const opt of options) select.add(new Option(opt.label,opt.value));
          select.value=String(node.options[field.name!]??'');element=select;
        } else {
          const input=document.createElement('input');input.placeholder='Model option key';input.value=String(node.options[field.name!]??'');element=input;
        }
        element.addEventListener('change',()=>edit(doc=>{
          const target=doc.nodes.find(n=>n.id===node.id); if(target?.type==='separate') {
            if (element.value) target.options[field.name!]=element.value;
            else delete target.options[field.name!];
          }
        }));
        wrapper.append(element); details.append(wrapper);
      }
      const stemLabel=label('wf-edit-stems','Output ports (comma-separated)');const stemInput=stemLabel.querySelector('input')!;
      stemInput.value=node.stems.join(', ');
      stemInput.addEventListener('change',()=>edit(doc=>{
        const target=doc.nodes.find(n=>n.id===node.id); if(target?.type==='separate') {
          const stems=stemInput.value.split(',').map(x=>x.trim()).filter(Boolean);
          if (!stems.length||new Set(stems).size!==stems.length||stems.length>20) throw Error('Choose 1–20 distinct stem ports');
          target.stems=stems;
        }
      }));details.append(stemLabel);
      details.append(createEl('p','wf-note','Ports are hints. Runtime resolves actual returned files by name. Missing/ambiguous stems fail rather than guess.'));
    }
    const remove=createEl('button','wf-remove','Remove node');remove.addEventListener('click',()=>{
      const descendants=new Set([node.id]);let changed=true;
      while(changed){changed=false;for(const n of currentDoc.nodes)if(n.type==='separate' && descendants.has(n.input.nodeId)&&!descendants.has(n.id)){descendants.add(n.id);changed=true;}}
      if(descendants.size>1 && !confirm('Remove this node and '+(descendants.size-1)+' downstream dependents?'))return;
      edit(doc=>{doc.nodes=doc.nodes.filter(n=>!descendants.has(n.id));});selected=currentDoc.nodes[0]?.id??'';render();
    });details.append(remove);
  }
  function sourceModel(model:WorkflowModel): string {
    const known=Object.entries(Models).find(([,value])=>value.id===model.id);
    if(known)return `Models.${known[0]}`;
    return `modelFromAlgorithm({ render_id: ${model.id}, name: ${JSON.stringify(model.name)}, audio_widget: 'single_upload' }, ${JSON.stringify([...model.stems])})`;
  }
  function renderCode() {
    const vars=new Map<string, string>();
    const lines=["import { Models, separate, modelFromAlgorithm } from '@rikhoffbauer/mvsep-client/workflow';",'', '// Graph construction is free. Calling graph.run() can create paid MVSep jobs.'];
    for(const node of graph.validate()){
      if(node.type==='source') {
        const variable=a('audio_'+node.id);vars.set(node.id+'::source',variable);
        lines.push(`const ${variable} = ${JSON.stringify(node.url)};`);
      } else {
        const model=catalog.find(m=>m.render_id===node.algorithmId);
        const parent=vars.get(node.input.nodeId+'::'+node.input.stem)??'missingUpstream';
        const modelValue:WorkflowModel=model?modelFromAlgorithm(model,node.stems):{id:node.algorithmId,name:node.label,stems:node.stems};
        const variable=a('stems_'+node.id);const definition=sourceModel(modelValue);
        const operation=`separate(${definition}, ${JSON.stringify(node.options)})`;
        const isSource=currentDoc.nodes.find(n=>n.id===node.input.nodeId)?.type==='source';
        lines.push(`const ${variable} = ${isSource ? operation+'.pipe('+parent+')' : parent+'.pipe('+operation+')'};`);
        for(const stem of node.stems) vars.set(node.id+'::'+stem,variable+'['+JSON.stringify(stem)+']');
      }
    }
    lines.push('','// Use any outputHandle.graph.document to inspect or export the DAG.', '// await outputHandle.graph.run(client, { allowPaid: true, confirmSubmit: ... });');
    $<HTMLElement>('wf-code').textContent=lines.join('\n');
  }
  function exportLayout() {
    return { positions: Object.fromEntries(currentDoc.nodes.map(node => [node.id, positions.get(node.id) ?? {x: 48, y: 48}])) };
  }
  function restoreLayout(layout?: { positions?: Record<string, {x: number; y: number}> }) {
    if (!layout?.positions) return;
    for (const node of currentDoc.nodes) {
      const p = layout.positions[node.id];
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < 1_000_000 && Math.abs(p.y) < 1_000_000)
        positions.set(node.id, {x:p.x, y:p.y});
    }
    render(); canvas.fit();
  }
  function newSource() {
    const url = prompt('Public HTTPS audio URL:', defaultSource);
    if(url===null) return;
    try { const audio=graph.source(url,'Audio '+(currentDoc.nodes.length+1)); selected=audio.nodeId;sync();layout();render(); }
    catch(error){say(error instanceof Error?error.message:String(error),true);}
  }
  function appendModel() {
    const modelId=Number($<HTMLSelectElement>('wf-model-picker').value);
    const catalogModel=catalog.find(m=>m.render_id===modelId);
    const fallback=builtins.find(m=>m.id===modelId);
    const definition=catalogModel?modelFromAlgorithm(catalogModel,defaultStems(catalogModel)):fallback;
    if(!definition){say('Select a model from the catalog',true);return;}
    const available: Array<{node:WorkflowNode;stem:string}> = [];
    for(const node of currentDoc.nodes) for(const stem of node.type==='source'?['source']:node.stems) available.push({node,stem});
    if(!available.length){say('Add an audio source first',true);return;}
    const chosen=selected && currentDoc.nodes.some(n=>n.id===selected) ?
      {nodeId:selected,stem:currentDoc.nodes.find(n=>n.id===selected)?.type==='source' ? 'source' : (currentDoc.nodes.find(n=>n.id===selected) as WorkflowSeparationNode).stems[0] ?? 'output'} :
      {nodeId:available.at(-1)!.node.id,stem:available.at(-1)!.stem};
    const parent=graph.audio(chosen.nodeId,chosen.stem);
    const port=graph.add(parent,definition); selected=Object.values(port)[0]!.nodeId;sync();layout();render();
    say('Added '+definition.name+' after '+chosen.stem+'.');
  }
  function example() {
    const doc=new WorkflowGraph();const input=doc.source(defaultSource,'Song');
    const {drums,other}=input.pipe(separate(Models.Demucs4_HT));
    drums.pipe(separate(Models.DrumSep,{ add_opt2:'1' }));
    other.pipe(separate(Models.MVSep_Synth));
    hydrate(doc.document);say('Example loaded. Replace the source URL before running.');
  }
  async function loadCatalog() {
    const client=hooks.client();
    if(!client){say('Connect API keys in the Connection sidebar first',true);return;}
    try {
      say('Loading current model catalog…');
      catalog=await client.getAlgorithms(['single_upload','no_upload','matchering_upload']);
      const picker=$<HTMLSelectElement>('wf-model-picker');picker.replaceChildren();
      for(const m of catalog.filter(m=>m.audio_widget==='single_upload'))picker.add(new Option(`${m.name} (#${m.render_id})`,String(m.render_id)));
      say(`Loaded ${catalog.length} models; single-upload models available in graph.`);renderDetails();
    } catch(error){say('Catalog error: '+(error instanceof Error?error.message:String(error)),true);}
  }
  async function run() {
    if(running) return;
    const client=hooks.client(); if(!client){say('Connect API keys before running',true);return;}
    const nodes=graph.validate().filter((n):n is WorkflowSeparationNode=>n.type==='separate');
    if(!nodes.length){say('Add a separation node first',true);return;}
    if(currentDoc.nodes.some(n=>n.type==='source'&&n.url===defaultSource)){say('Replace placeholder source URLs before submitting jobs',true);return;}
    if(!confirm(`This workflow contains ${nodes.length} separation job(s) which can spend credits. Each new job will require additional approval. Begin?`))return;
    running=new AbortController(); const controller=running;
    $<HTMLButtonElement>('wf-stop').disabled=false;
    $<HTMLButtonElement>('wf-run').disabled=true;
    try{
      const report=await graph.run(client,{signal:controller.signal,allowPaid:true,concurrency:1,completed:results,
        confirmSubmit: (node,url)=>confirm(`Submit ${node.label} (#${node.algorithmId})?\nInput: ${url}\nThis can consume MVSep credits. Cancel aborts this step.`),
        onEvent:event=>{states.set(event.nodeId,event);if(event.state==='done' && event.hash && event.outputs)results[event.nodeId]={hash:event.hash,status:'done',outputs:{...event.outputs}}; say(`${event.nodeId}: ${event.state}${event.hash?' ('+event.hash+')':''}`);render();},
      });
      results={...report.steps};hooks.onResult('workflow',{graph:graph.document,steps:report.steps});say('Workflow complete. All finished output URLs are in the response inspector.');
    }catch(error){say('Workflow stopped: '+(error instanceof Error?error.message:String(error)),true);hooks.onResult('workflow error',{message:error instanceof Error?error.message:String(error),completed:results});}
    finally{running=null;$<HTMLButtonElement>('wf-stop').disabled=true;render();}
  }
  function download(name:string, contents:string){const blob=new Blob([contents],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=createEl('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('wf-add-source').addEventListener('click',newSource);
  $('wf-add-model').addEventListener('click',appendModel);
  $('wf-load-catalog').addEventListener('click',()=>void loadCatalog());
  $('wf-sample').addEventListener('click',example);
  $('wf-layout').addEventListener('click',()=>{layout();render();canvas.fit();});
  $('wf-run').addEventListener('click',()=>void run());
  $('wf-stop').addEventListener('click',()=>{running?.abort();say('Cancelling local wait. Already accepted MVSep jobs may still run.');});
  $('wf-export').addEventListener('click',()=>download('mvsep-workflow.json',JSON.stringify({graph:graph.document,layout:exportLayout()},null,2)));
  $('wf-copy-code').addEventListener('click',()=>void navigator.clipboard.writeText($('wf-code').textContent??''));
  $('wf-import').addEventListener('click',()=>{try{
    const imported=JSON.parse($<HTMLTextAreaElement>('wf-import-json').value) as WorkflowDocument | { graph:WorkflowDocument;steps?:WorkflowRunResult['steps'];layout?:{positions?:Record<string,{x:number;y:number}>} };
    if ('graph' in imported) {
      hydrate(imported.graph); restoreLayout(imported.layout); results=structuredClone(imported.steps??{});
      say('Workflow and completed-step checkpoint imported. Verify input URLs before resuming.');
    } else { hydrate(imported); say('Workflow imported'); }
  }
    catch(error){say('Import failed: '+(error instanceof Error?error.message:String(error)),true);}});
  $('wf-export-results').addEventListener('click',()=>download('mvsep-workflow-results.json',JSON.stringify({graph:graph.document,steps:results,layout:exportLayout()},null,2)));
  $<HTMLButtonElement>('wf-stop').disabled=true;
  for (const m of builtins) $<HTMLSelectElement>('wf-model-picker').add(new Option(m.name+' (#'+m.id+')',String(m.id)));
  example();
  return { disconnect() { running?.abort(); }, refreshCatalog: loadCatalog, fit() { canvas.fit(); } };
}

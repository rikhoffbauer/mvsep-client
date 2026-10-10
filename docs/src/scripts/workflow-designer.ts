import { mountWorkflowCanvas } from './workflow-canvas.tsx';
import { mountModelCombobox } from './model-combobox.ts';
import type { ModelChoice, ModelCombobox } from './model-combobox.ts';
import { selectModels } from '../../../src/model-selector.ts';
import type { Connection } from '@xyflow/react';
import { WorkflowGraph, Models, separate, modelFromAlgorithm, stemsForModel } from '../../../src/workflow.ts';
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
  const definition = known ?? modelFromAlgorithm(algorithm);
  return [...stemsForModel(definition)];
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
  let inspectorPicker: ModelCombobox | null = null;
  let selected = '';
  let running: AbortController | null = null;
  let results: WorkflowRunResult['steps'] = {};
  const files = new Map<string, File>();
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
    files.clear();
    graph = new WorkflowGraph(doc); sync(); results = {}; states.clear();
    if (!doc.nodes.some(node => node.id === selected)) selected = doc.nodes[0]?.id ?? '';
    layout(); render();
  }
  function layout() {
    const depth = new Map<string, number>();
    for (const node of graph.validate()) {
      const parents = node.type==='source' ? [] : node.type==='process' ? node.inputs : [node.input];
      depth.set(node.id, parents.length ? Math.max(...parents.map(input=>depth.get(input.nodeId)??0))+1 : 0);
    }
    const indexes = new Map<number, number>();
    for (const node of graph.validate()) {
      const col = depth.get(node.id) ?? 0;
      const row = indexes.get(col) ?? 0; indexes.set(col, row + 1);
      // Custom stems vary in height; give each card enough vertical space to avoid overlap.
      const siblings = graph.validate().filter(item => (depth.get(item.id) ?? 0) === col).slice(0, row);
      const y = 48 + siblings.reduce((sum, item) => sum + (item.type === 'source' ? 190 : item.type === 'output' ? 130 : item.type === 'process' ? 190+item.inputs.length*33 : 168 + item.stems.length * 33) + 26, 0);
      positions.set(node.id, { x: 48 + col * 350, y });
    }
  }
  function validateConnection(connection: Connection): boolean {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || !sourceHandle || source === target) return false;
    const origin = currentDoc.nodes.find(node => node.id === source);
    const destination = currentDoc.nodes.find(node => node.id === target);
    if (!origin || !destination || destination.type==='source') return false;
    if (origin.type === 'output') return false;
    if (origin.type === 'source' ? sourceHandle !== 'source' : !origin.stems.some(stem=>stem===sourceHandle)) return false;
    if (destination.type==='process' ? !/^input-\d+$/.test(targetHandle??'') ||
      Number(targetHandle!.slice(6))>=destination.inputs.length : targetHandle!=='input') return false;
    try {
      const doc = structuredClone(currentDoc);
      const node = doc.nodes.find(node => node.id === target);
      if(!node || node.type==='source') return false;
      if(node.type==='process') node.inputs[Number(targetHandle!.slice(6))]={nodeId:source,stem:sourceHandle};
      else node.input={nodeId:source,stem:sourceHandle};
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
        if(!node || node.type==='source') throw Error('Audio input node must be destination.');
        if(node.type==='process')node.inputs[Number(connection.targetHandle!.slice(6))]={nodeId:connection.source!,stem:connection.sourceHandle!};
        else node.input={nodeId:connection.source!,stem:connection.sourceHandle!};
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
      const stems=parent.type==='source'?['source']:parent.type==='output'?[]:parent.stems;
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
    inspectorPicker?.dispose();inspectorPicker=null;
    details.replaceChildren();
    const node = currentDoc.nodes.find(n=>n.id===selected);
    details.append(createEl('h4','',node?'Edit '+node.label:'Select a node'));
    if (!node) { details.append(createEl('p','wf-muted','Choose a node to configure its input, algorithm, and model options.'));return; }
    const name=label('wf-edit-label','Node label');const nameInput=name.querySelector('input')!;nameInput.value=node.label;
    nameInput.addEventListener('change', () => edit(doc => { doc.nodes.find(n=>n.id===node.id)!.label=nameInput.value; })); details.append(name);
    if (node.type==='source') {
      const field=label('wf-edit-url','Public HTTPS audio URL');const input=field.querySelector('input')!;input.value=node.url;
      input.addEventListener('change',()=>edit(doc=>{const target=doc.nodes.find(n=>n.id===node.id);if(target?.type==='source'){target.url=input.value.trim();if(target.url)delete target.fileName;files.delete(node.id);}}));details.append(field);
      const local=label('wf-file-label','Upload local audio file');
      const upload=document.createElement('input');upload.type='file';upload.accept='audio/*,.flac,.wav,.mp3,.ogg,.m4a,.aac,.aiff';
      upload.addEventListener('change',()=>{
        const file=upload.files?.[0];if(!file)return;
        files.set(node.id,file);
        edit(doc=>{const target=doc.nodes.find(n=>n.id===node.id);
          if(target?.type==='source'){target.url='';target.fileName=file.name;}
        });
      });local.replaceChild(upload,local.querySelector('input')!);details.append(local);
      if(node.fileName) details.append(createEl('p','wf-note',files.has(node.id)?'Attached: '+node.fileName:'Reattach '+node.fileName+' before running (bytes are not saved in JSON).'));
      if (node.url===defaultSource) details.append(createEl('p','wf-note','Placeholder source. Replace before any paid execution.'));
    } else if(node.type==='output') {
      details.append(createEl('p','wf-note','Only the connected stem appears in final exports.'));
      const selector=createEl('label','wf-field');selector.append(createEl('span','','Export stem'));
      const dropdown=document.createElement('select');
      for(const candidate of currentDoc.nodes){
        if(candidate.type==='output' || candidate.id===node.id)continue;
        for(const stem of candidate.type==='source'?['source']:candidate.stems){
          const option=new Option(candidate.label+' → '+stem,candidate.id+'::'+stem);
          option.selected=candidate.id===node.input.nodeId&&stem===node.input.stem;dropdown.add(option);
        }
      }
      dropdown.addEventListener('change',()=>{
        const [nodeId,stem]=dropdown.value.split('::');
        edit(doc=>{const target=doc.nodes.find(n=>n.id===node.id);if(target?.type==='output')target.input={nodeId:nodeId!,stem:stem!};});
      });
      selector.append(dropdown);details.append(selector);
    } else if(node.type==='process') {
      details.append(createEl('p','wf-note','FFmpeg '+node.effect.type+'. Drag stems onto the input pins to configure the effect.'));
      const params=createEl('label','wf-field');params.append(createEl('span','','FFmpeg parameters'));
      const input=document.createElement('input');input.value=JSON.stringify(node.effect);params.append(input);
      input.addEventListener('change',()=>edit(doc=>{
        const target=doc.nodes.find(n=>n.id===node.id);
        if(target?.type==='process')target.effect=JSON.parse(input.value) as typeof target.effect;
      }));details.append(params);
    } else if(node.type==='separate') {
      details.append(chooseInput(node));
      const modelSelect = createEl('label','wf-field');modelSelect.append(createEl('span','','Algorithm'));
      const choices=modelChoices();
      if (!choices.some(m=>m.id===node.algorithmId)) choices.push({id:node.algorithmId,name:node.label,group:'Other'});
      const pickerRoot=createEl('div');modelSelect.append(pickerRoot);details.append(modelSelect);
      inspectorPicker=mountModelCombobox(pickerRoot,choices,node.algorithmId,id=>{
        const next=choices.find(c=>c.id===id)!;
        const live=catalog.find(c=>c.render_id===id);
        const known=builtins.find(b=>b.id===id);
        const stems=live?defaultStems(live):known?[...stemsForModel(known)]:[];
        edit(doc=>{const target=doc.nodes.find(n=>n.id===node.id);if(target?.type==='separate'){
          target.algorithmId=id;target.label=next.name;target.options={};target.stems=[...stems];
        }});
      });
      const spec=catalog.find(m=>m.render_id===node.algorithmId);
      const fallback = builtins.find(b => b.id === node.algorithmId);
      const optionList=spec?.algorithm_fields ?? fallback?.fields?.map(f => ({ name:f.name, text:f.text, options:f.choices as AlgorithmField['options'], default_key:f.defaultKey })) ?? [];
      if (!spec) details.append(createEl('p','wf-note','Showing the bundled model snapshot. Refresh models for the latest metadata.'));
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
            const definition=spec?modelFromAlgorithm(spec):fallback;
            if(definition) target.stems=[...stemsForModel(definition,target.options)];
          }
        }));
        wrapper.append(element); details.append(wrapper);
      }
      const stemLabel=label('wf-edit-stems','Output ports (comma-separated)');const stemInput=stemLabel.querySelector('input')!;
      stemInput.value=node.stems.join(', ');
      stemInput.addEventListener('change',()=>edit(doc=>{
        const target=doc.nodes.find(n=>n.id===node.id); if(target?.type==='separate') {
          const stems=stemInput.value.split(',').map(x=>x.trim()).filter(Boolean);
          if(new Set(stems).size!==stems.length||stems.length>100) throw Error('Choose up to 100 distinct stem ports');
          target.stems=stems;
        }
      }));details.append(stemLabel);
      details.append(createEl('p','wf-note','Ports are hints. Runtime resolves actual returned files by name. Missing/ambiguous stems fail rather than guess.'));
    }
    const remove=createEl('button','wf-remove','Remove node');remove.addEventListener('click',()=>{
      const descendants=new Set([node.id]);let changed=true;
      while(changed){changed=false;for(const n of currentDoc.nodes){
        const parents=n.type==='separate'||n.type==='output'?[n.input]:n.type==='process'?n.inputs:[];
        if(parents.some(i=>descendants.has(i.nodeId))&&!descendants.has(n.id)){descendants.add(n.id);changed=true;}
      }}
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
    const vars=new Map<string,string>();
    const lines=[
      "import { WorkflowGraph, Models, modelFromAlgorithm } from '@rikhoffbauer/mvsep-client/workflow';",
      '',
      'const graph = new WorkflowGraph();',
      '// Graph construction is free. Remote MVSep separations require individual approval.',
    ];
    for(const node of graph.validate()){
      if(node.type==='source'){
        const name=a('audio_'+node.id);
        const method=node.fileName?'sourceFile':'source';
        const value=node.fileName??node.url;
        lines.push('const '+name+' = graph.'+method+'('+JSON.stringify(value)+', '+JSON.stringify(node.label)+');');
        if(node.fileName)lines.push('// Supply file bytes in graph.run(..., { files: { '+JSON.stringify(node.id)+': { data: fileBlob, filename: '+JSON.stringify(node.fileName)+' } } })');
        vars.set(node.id+'::source',name);
      } else if(node.type==='separate'){
        const model=catalog.find(m=>m.render_id===node.algorithmId);
        const definition=sourceModel(model?modelFromAlgorithm(model,node.stems):{id:node.algorithmId,name:node.label,stems:node.stems});
        const upstream=vars.get(node.input.nodeId+'::'+node.input.stem)??'missingUpstream';
        const name=a('stems_'+node.id);
        lines.push('const '+name+' = graph.add('+upstream+', '+definition+', '+JSON.stringify(node.options)+');');
        for(const stem of node.stems)vars.set(node.id+'::'+stem,name+'['+JSON.stringify(stem)+']');
      } else if(node.type==='process'){
        const upstream=node.inputs.map(input=>vars.get(input.nodeId+'::'+input.stem)??'missingUpstream');
        const name=a('processed_'+node.id);
        lines.push('const '+name+' = graph.process('+JSON.stringify(node.effect)+', ['+upstream.join(', ')+'], '+JSON.stringify(node.label)+');');
        vars.set(node.id+'::audio',name);
      } else if(node.type==='output'){
        const upstream=vars.get(node.input.nodeId+'::'+node.input.stem)??'missingUpstream';
        lines.push('graph.output('+upstream+', '+JSON.stringify(node.label)+');');
      }
    }
    lines.push('', '// const report = await graph.run(client, { allowPaid: true, confirmSubmit: async () => confirm("Approve paid job?") });',
      '// report.exports contains only explicitly connected Output nodes.');
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
    const modelId=toolbarPicker.value();
    if(modelId===null){say('Choose a model first',true);return;}
    const catalogModel=catalog.find(m=>m.render_id===modelId);
    const fallback=builtins.find(m=>m.id===modelId);
    const definition=catalogModel?modelFromAlgorithm(catalogModel):fallback;
    if(!definition){say('Select a model from the catalog',true);return;}
    const available: Array<{node:WorkflowNode;stem:string}> = [];
    for(const node of currentDoc.nodes) for(const stem of node.type==='source'?['source']:node.type==='output'?[]:node.stems) available.push({node,stem});
    if(!available.length){say('Add an audio source first',true);return;}
    const chosen=selected && currentDoc.nodes.some(n=>n.id===selected && n.type!=='output') ?
      {nodeId:selected,stem:currentDoc.nodes.find(n=>n.id===selected)?.type==='source' ? 'source' : (currentDoc.nodes.find(n=>n.id===selected) as WorkflowSeparationNode).stems[0] ?? 'output'} :
      {nodeId:available.at(-1)!.node.id,stem:available.at(-1)!.stem};
    const parent=graph.audio(chosen.nodeId,chosen.stem);
    graph.add(parent,definition);sync();selected=currentDoc.nodes.at(-1)!.id;layout();render();
    say('Added '+definition.name+' after '+chosen.stem+'.');
  }
  function availableStems() {
    return currentDoc.nodes.flatMap(node => {
      if (node.type==='output') return [];
      return (node.type==='source'?['source']:node.stems).map(stem=>({nodeId:node.id,stem,label:node.label}));
    });
  }
  function appendOutput() {
    try {
      const chosen=availableStems().find(item=>item.nodeId===selected)??availableStems().at(-1);
      if(!chosen){say('Add a source or model first',true);return;}
      const name=prompt('Final output label:',chosen.stem);
      if(!name?.trim())return;
      const id=graph.output(graph.audio(chosen.nodeId,chosen.stem),name.trim());
      sync();selected=id;layout();render();canvas.fit();
      say('Added final output '+name);
    }catch(e){say(e instanceof Error?e.message:String(e),true);}
  }
  function appendProcess(){
    try {
      const kind=$<HTMLSelectElement>('wf-effect-picker').value;
      const ports=availableStems();
      const chosen=ports.find(p=>p.nodeId===selected)??ports.at(-1);
      if(!chosen){say('Add a source or model first',true);return;}
      const requiresTwo=kind==='mix'||kind==='subtract';
      const other=ports.find(p=>p.nodeId!==chosen.nodeId || p.stem!==chosen.stem);
      if(requiresTwo&&!other){say('Mix and subtract require two audio ports',true);return;}
      const effect=kind==='gain'?{type:'gain' as const,decibels:0}:
        kind==='lowpass'||kind==='highpass'?{type:kind==='lowpass'?'lowpass' as const:'highpass' as const,frequency:1000}:
        kind==='trim'?{type:'trim' as const,start:0,duration:30}:
        kind==='subtract'?{type:'subtract' as const}:
        kind==='mix'?{type:'mix' as const}:{type:'invert' as const};
      const choices=requiresTwo?[chosen,other!]:[chosen];
      const output=graph.process(effect,choices.map(p=>graph.audio(p.nodeId,p.stem)),kind.toUpperCase());
      sync();selected=output.nodeId;layout();render();canvas.fit();
      say('FFmpeg '+kind+' added; drag appropriate stems onto its input ports.');
    }catch(e){say(e instanceof Error?e.message:String(e),true);}
  }
  function example() {
    const doc=new WorkflowGraph();const input=doc.source(defaultSource,'Song');
    const {drums,other,vocals}=input.pipe(separate(Models.Demucs4_HT));
    const {kick}=drums.pipe(separate(Models.DrumSep,{ add_opt2:'1' }));
    const {synth}=other.pipe(separate(Models.MVSep_Synth));
    doc.output(vocals,'Final vocals');
    doc.output(kick,'Final kick');
    doc.output(synth,'Final synth');
    hydrate(doc.document);say('Example loaded with 3 selected outputs. Replace the source URL before running.');
  }
  function modelChoices(): ModelChoice[] {
    const snap = new Map(builtins.map(m => [m.id,m] as const));
    const all:ModelChoice[]=[]; const seen=new Set<number>();
    for (const model of catalog) {
      if(model.audio_widget && model.audio_widget!=='single_upload')continue;
      const builtin=snap.get(model.render_id);
      seen.add(model.render_id);
      all.push({id:model.render_id,name:model.name,group:model.algorithm_group?.name??builtin?.group??'Other',
        stems:builtin?.stems,active:(model as SeparationAlgorithm & {is_active?:number}).is_active!==0});
    }
    for(const model of builtins) if(!seen.has(model.id))
      all.push({id:model.id,name:model.name,group:model.group??'Other',stems:model.stems,active:model.active});
    return all;
  }
  const toolbarPicker=mountModelCombobox($('wf-model-picker'),modelChoices(),null);
  function refreshPicker() { toolbarPicker.setChoices(modelChoices()); }
  async function loadCatalog() {
    const client=hooks.client();
    if(!client){say('Connect API keys in the Connection sidebar first',true);return;}
    try {
      say('Loading current model catalog…');
      catalog=await client.getAlgorithms(['single_upload','no_upload','matchering_upload']);
      refreshPicker();
      say(`Loaded ${catalog.length} models; single-upload models available in graph.`);renderDetails();
    } catch(error){say('Catalog error: '+(error instanceof Error?error.message:String(error)),true);}
  }
  async function run() {
    if(running) return;
    const nodes=graph.validate().filter((n):n is WorkflowSeparationNode=>n.type==='separate');
    const client=hooks.client();
    if(nodes.length && !client){say('Connect API keys before running paid MVSep jobs',true);return;}
    if(!nodes.length&&!currentDoc.nodes.some(n=>n.type==='process'||n.type==='output')){say('Add a processing or output node first',true);return;}
    if(currentDoc.nodes.some(n=>n.type==='source'&&n.url===defaultSource)){say('Replace placeholder source URLs before submitting jobs',true);return;}
    for(const node of currentDoc.nodes) if(node.type==='source'&&node.fileName&&!files.has(node.id)){
      say('Reattach the local file "'+node.fileName+'" before running.',true);return;
    }
    if(nodes.length&&!confirm(`This workflow contains ${nodes.length} separation job(s) which can spend credits. Each new job will require additional approval. Begin?`))return;
    running=new AbortController(); const controller=running;
    $<HTMLButtonElement>('wf-stop').disabled=false;
    $<HTMLButtonElement>('wf-run').disabled=true;
    try{
      const report=await graph.run(client??({} as MvsepClient),{signal:controller.signal,allowPaid:nodes.length>0,concurrency:1,completed:results,
        files:Object.fromEntries([...files].map(([id,file])=>[id,{data:file,filename:file.name,contentType:file.type||'application/octet-stream'}])),
        confirmSubmit: (node,url)=>confirm(`Submit ${node.label} (#${node.algorithmId})?\nInput: ${url}\nThis can consume MVSep credits. Cancel aborts this step.`),
        onEvent:event=>{states.set(event.nodeId,event);if(event.state==='done' && event.hash && event.outputs)results[event.nodeId]={hash:event.hash,status:'done',outputs:{...event.outputs}}; say(`${event.nodeId}: ${event.state}${event.hash?' ('+event.hash+')':''}`);render();},
      });
      results={...report.steps};
      const exports=Object.fromEntries(Object.entries(report.exports??{}).map(([name,value])=>
        [name,{...value,data:value.data?'<local WAV · '+value.data.byteLength+' bytes>':undefined}]));
      hooks.onResult('workflow',{exports,completedJobCount:Object.keys(report.steps).length});
      for(const [name,artifact] of Object.entries(report.exports??{})){
        if(!artifact.data)continue;
        const url=URL.createObjectURL(new Blob([new Uint8Array(artifact.data)],{type:'audio/wav'}));
        const anchor=createEl('a');anchor.href=url;anchor.download=name.replace(/[^a-z0-9_.-]/gi,'_')+'.wav';
        anchor.click();setTimeout(()=>URL.revokeObjectURL(url),60_000);
      }
      say('Workflow complete. '+Object.keys(report.exports??{}).length+' explicit Output(s) selected. Local WAV outputs downloaded.');
    }catch(error){say('Workflow stopped: '+(error instanceof Error?error.message:String(error)),true);hooks.onResult('workflow error',{message:error instanceof Error?error.message:String(error),completed:results});}
    finally{running=null;$<HTMLButtonElement>('wf-stop').disabled=true;render();}
  }
  function download(name:string, contents:string){const blob=new Blob([contents],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=createEl('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function autoSelect() {
    try {
      const query=$<HTMLInputElement>('wf-selector').value.trim();
      const models=Object.values(Models);
      const plan=selectModels(query,catalog.length?[
        ...catalog.filter(model=>model.audio_widget==='single_upload'),
        ...models.filter(model=>!catalog.some(live=>live.render_id===model.id))
      ]:models);
      const notes=$('wf-selection-reason');
      const selectedOutputs=Object.entries(plan.outputs).map(([requested,port])=>
        requested+' ← '+plan.steps[port.step]!.name+' / '+port.stem).join('; ');
      notes.textContent='Suggested '+plan.steps.map(step=>step.name+' (#'+step.modelId+')').join(' → ')+
        '. '+selectedOutputs+'. Community rating '+(plan.communityRating?.toFixed(2)??'unknown')+
        '/5 (user votes, not an audio-quality benchmark); combined price coefficient '+
        (plan.priceCoefficient??'unknown')+'. No paid jobs have been started.';
      const source=currentDoc.nodes.find(node=>node.type==='source');
      if(!source){say('Add a source audio node before applying the suggested models. No jobs submitted.',true);return;}
      const stepNodes:string[]=[];
      for(const step of plan.steps) {
        const upstream=step.input ? { nodeId:stepNodes[step.input.step]!, stem:step.input.stem } :
          { nodeId:source.id, stem:'source' };
        const known=models.find(m=>m.id===step.modelId);
        const live=catalog.find(m=>m.render_id===step.modelId);
        const definition=live?modelFromAlgorithm(live):known;
        if(!definition)throw Error('Model unavailable: '+step.modelId);
        graph.add(graph.audio(upstream.nodeId,upstream.stem),definition,step.options);
        stepNodes.push(graph.document.nodes.at(-1)!.id);
      }
      for(const [requested,origin] of Object.entries(plan.outputs)){
        graph.output(graph.audio(stepNodes[origin.step]!,origin.stem),requested);
      }
      sync();selected=graph.document.nodes.at(-1)?.id??source.id;layout();render();canvas.fit();
      say('Suggested '+plan.steps.length+' model(s) added. Check outputs and approve each job before running.');
    }catch(error){say('Model selection failed: '+(error instanceof Error?error.message:String(error)),true);}
  }
  $('wf-auto-select').addEventListener('click',autoSelect);
  $('wf-selector').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();autoSelect();}});
  $('wf-upload-source').addEventListener('click',()=>$<HTMLInputElement>('wf-source-file').click());
  $<HTMLInputElement>('wf-source-file').addEventListener('change',()=>{
    const picker=$<HTMLInputElement>('wf-source-file');
    const file=picker.files?.[0];if(!file)return;
    try {
      const audio=graph.sourceFile(file.name,'Audio '+(currentDoc.nodes.length+1));
      files.set(audio.nodeId,file);sync();selected=audio.nodeId;layout();render();canvas.fit();
      say('Added '+file.name+'. Local file bytes remain in this browser until explicitly submitted.');
    }catch(e){say(e instanceof Error?e.message:String(e),true);}
    picker.value='';
  });
  $('wf-add-output').addEventListener('click',appendOutput);
  $('wf-add-process').addEventListener('click',appendProcess);
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
  refreshPicker();
  example();
  return { disconnect() { running?.abort(); }, refreshCatalog: loadCatalog, fit() { canvas.fit(); } };
}

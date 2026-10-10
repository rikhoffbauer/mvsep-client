/** Accessible grouped, searchable model combobox for the workflow toolbar and inspector. */
import './model-combobox.css';

export interface ModelChoice {
  id: number;
  name: string;
  group: string;
  active?: boolean;
  stems?: readonly string[];
}
export interface ModelCombobox {
  value(): number | null;
  setChoices(choices: readonly ModelChoice[]): void;
  setValue(value: number | null): void;
  dispose(): void;
}
const fmt = (m: ModelChoice) => m.name + ' (#' + m.id + ')' + (m.active === false ? ' · inactive' : '');
export function mountModelCombobox(
  root: HTMLElement, source: readonly ModelChoice[], initial: number | null,
  changed: (id: number) => void = () => {},
): ModelCombobox {
  let choices = [...source];
  let selected = initial;
  let open = false;
  let activeIndex = -1;
  let entries: ModelChoice[] = [];
  const controller = new AbortController();
  const signal = controller.signal;
  root.replaceChildren(); root.classList.add('mc-root');
  const entry = document.createElement('input');
  entry.type = 'text'; entry.className = 'mc-input';
  entry.setAttribute('role', 'combobox');
  entry.setAttribute('aria-haspopup', 'listbox');
  entry.setAttribute('aria-expanded','false');
  entry.setAttribute('aria-autocomplete','list');
  entry.autocomplete = 'off';
  entry.spellcheck = false;
  entry.placeholder = 'Search models by name, stem or group…';
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'mc-toggle';
  toggle.textContent = '⌄'; toggle.setAttribute('aria-label','Show available models');
  const panel = document.createElement('div');
  panel.className = 'mc-popup'; panel.setAttribute('role','listbox');
  const listId = 'mc-list-' + Math.random().toString(36).slice(2);
  panel.id = listId; entry.setAttribute('aria-controls',listId);
  panel.hidden = true; document.body.append(panel);
  root.append(entry,toggle);
  const selectedChoice = () => choices.find(m=>m.id===selected);
  const display = () => { entry.value = selectedChoice() ? fmt(selectedChoice()!) : ''; };
  const reposition = () => {
    if (!open) return;
    const r = root.getBoundingClientRect();
    panel.style.width = Math.max(260, r.width) + 'px';
    panel.style.left = Math.max(6,Math.min(r.left,window.innerWidth-Math.max(260,r.width)-6)) + 'px';
    const below = window.innerHeight-r.bottom;
    if (below < 235 && r.top > below) {
      panel.style.top = 'auto'; panel.style.bottom = (window.innerHeight-r.top+3)+'px';
    } else {
      panel.style.bottom='auto';panel.style.top=(r.bottom+3)+'px';
    }
  };
  function close(revert = true) {
    if (!open) return;
    open=false;panel.hidden=true;entry.setAttribute('aria-expanded','false');
    entry.removeAttribute('aria-activedescendant');
    if(revert)display();
  }
  function choose(model: ModelChoice) {
    selected=model.id;close();display();changed(model.id);
  }
  function draw(search: string) {
    panel.replaceChildren();entries=[];
    const term = search.trim().toLowerCase();
    const filtered=choices.filter(m => !term ||
      (m.name+' '+m.id+' '+m.group+' '+(m.stems??[]).join(' ')).toLowerCase().includes(term));
    const grouped = new Map<string,ModelChoice[]>();
    for(const item of filtered) {
      const group=item.group||'Other';
      if(!grouped.has(group))grouped.set(group,[]);
      grouped.get(group)!.push(item);
    }
    let index=0;
    for(const [group,items] of grouped) {
      const wrapper=document.createElement('div');
      wrapper.setAttribute('role','group');wrapper.setAttribute('aria-label',group);
      const title=document.createElement('div');title.className='mc-group';title.textContent=group;wrapper.append(title);
      for(const item of items) {
        const id='mc-option-'+listId+'-'+index;
        const row=document.createElement('button');
        row.type='button';row.id=id;row.className='mc-option';
        row.setAttribute('role','option');
        row.setAttribute('aria-selected',String(item.id===selected));
        row.textContent=fmt(item);
        row.dataset.index=String(index);
        row.addEventListener('mousedown',event=>event.preventDefault());
        row.addEventListener('click',()=>choose(item));
        if(index===activeIndex)row.classList.add('mc-active');
        wrapper.append(row);entries.push(item);index++;
      }
      panel.append(wrapper);
    }
    if(!entries.length) {
      const empty=document.createElement('div');empty.className='mc-empty';empty.textContent='No matching models';
      panel.append(empty);
    }
    if(activeIndex>=entries.length)activeIndex=entries.length-1;
    highlight(false);
  }
  function highlight(scroll: boolean) {
    panel.querySelectorAll<HTMLElement>('.mc-option').forEach((el,i)=>{
      el.classList.toggle('mc-active',i===activeIndex);
      if(i===activeIndex) {
        entry.setAttribute('aria-activedescendant',el.id);
        if(scroll)el.scrollIntoView({block:'nearest'});
      }
    });
    if(activeIndex<0)entry.removeAttribute('aria-activedescendant');
  }
  function reveal(search: string) {
    open=true;panel.hidden=false;entry.setAttribute('aria-expanded','true');
    activeIndex=-1;draw(search);reposition();
  }
  entry.addEventListener('focus',()=>{if(!open)reveal('');},{signal});
  entry.addEventListener('input',()=>reveal(entry.value),{signal});
  entry.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();entry.blur();event.preventDefault();}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(!open)reveal('');
      if(entries.length)activeIndex=(activeIndex+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length;
      highlight(true);
    }
    if(event.key==='Enter'&&open){
      event.preventDefault();if(entries.length)choose(entries[Math.max(0,activeIndex)]!);
    }
  },{signal});
  toggle.addEventListener('click',event=>{
    event.preventDefault();
    if(open){close();} else{entry.focus();reveal('');}
  },{signal});
  document.addEventListener('pointerdown',event=>{
    const target=event.target;
    if(target instanceof Node && !root.contains(target) && !panel.contains(target))close();
  },{signal});
  window.addEventListener('resize',reposition,{signal});
  window.addEventListener('scroll',reposition,{signal,capture:true});
  display();
  return {
    value:()=>selected,
    setValue(id) {selected=id;display();if(open)draw('');},
    setChoices(data) {
      choices=[...data];
      if(selected!==null && !choices.some(m=>m.id===selected))selected=choices[0]?.id??null;
      if(selected===null)selected=choices[0]?.id??null;
      display();if(open)draw('');
    },
    dispose() {close();controller.abort();panel.remove();root.replaceChildren();},
  };
}

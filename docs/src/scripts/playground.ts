import { MvsepClient } from '../../../src/browser.ts';
import type { MvsepProgressEvent, SeparationAlgorithm } from '../../../src/types.ts';

const root = document.querySelector<HTMLElement>('.pg');
if (root) init(root);

function init(root: HTMLElement) {
  const endpoint = import.meta.env.PUBLIC_MVSEP_RELAY_URL || 'https://mvsep-client-playground.vercel.app/api/relay';
  const hosts: Record<string, string> = { apex: 'mvsep.com', de: 'de.mvsep.com', de2: 'de2.mvsep.com', sg: 'sg.mvsep.com' };
  const publicPaths = new Set(['/app/algorithms', '/app/news', '/quality_checker/leaderboard']);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const val = (id: string) => $<HTMLInputElement | HTMLSelectElement>(id).value;
  const set = (id: string, value: string) => { $(id).textContent = value; };
  let keys: string[] = [];
  let client: MvsepClient | null = null;
  let abort: AbortController | null = null;
  let last = '';
  let eventCount = 0;
  let sessionVersion = 0;
  const eventList = $('pg-events');
  const keyList = $('pg-keys');
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  function addKey() {
    if (keyList.children.length >= 8) return;
    const row = document.createElement('div'); row.className = 'pg-key-row';
    const input = document.createElement('input'); input.type = 'password'; input.autocomplete = 'off';
    input.spellcheck = false; input.placeholder = 'API key ' + (keyList.children.length + 1);
    input.setAttribute('aria-label', input.placeholder);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove key');
    remove.addEventListener('click', () => row.remove());
    row.append(input, remove); keyList.append(row);
  }
  addKey();
  $('pg-add-key').addEventListener('click', addKey);
  function log(entry: string) {
    const li = document.createElement('li');
    li.textContent = new Date().toLocaleTimeString() + ' · ' + entry;
    eventList.prepend(li);
    while (eventList.children.length > 40) eventList.lastChild?.remove();
    set('pg-events-count', String(++eventCount));
  }
  function state() {
    if (!client) return set('pg-key-state', 'Not connected.');
    set('pg-key-state', client.apiKeyState.map(v =>
      '#' + (v.index + 1) + ': ' + (v.disabled ? 'disabled' : v.cooldownUntil > Date.now() ? 'cooldown' : 'ready')).join(' · '));
  }
  function sanitize(input: unknown): unknown {
    if (typeof input === 'string') {
      let value = input;
      for (const key of keys) if (key) value = value.split(key).join('[REDACTED]');
      return value.replace(/(api_token|api_key|access_token)=([^&\s]+)/gi, '$1=[REDACTED]');
    }
    if (Array.isArray(input)) return input.map(sanitize);
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).map(([key, value]) =>
      [key, /password|token|secret|authorization|signature/i.test(key) ? '[REDACTED]' : sanitize(value)]));
    return input;
  }
  function result(action: string, value: unknown, started: number, failed = false) {
    last = JSON.stringify(sanitize(value), null, 2) ?? 'null';
    set('pg-response', last);
    set('pg-operation', action);
    set('pg-duration', Math.round(performance.now() - started) + ' ms');
    set('pg-response-status', failed ? 'Request failed' : 'Success');
    $<HTMLButtonElement>('pg-copy').disabled = false;
  }
  function progress(event: MvsepProgressEvent) {
    if (event.type === 'request' && event.phase === 'start')
      log(event.method + ' ' + event.path + ' · key ' + (event.keyIndex === undefined ? 'public' : '#' + (event.keyIndex + 1)));
    else if (event.type === 'key_rotation') log('Retry failover #' + ((event.from ?? -1) + 1) + ' → #' + (event.to + 1));
    else if (event.type === 'retry') log('Retry · HTTP ' + (event.status ?? 'transport'));
    else if (event.type === 'poll') log('Job ' + event.status);
    state();
  }
  // Reuse the real SDK core client for rotation, retries, validation and job-affinity.
  // Only its fetch transport is remapped through the fixed HTTPS relay.
  const viaRelay: typeof fetch = async (input, init = {}) => {
    const upstream = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const region = Object.entries(hosts).find(([, host]) => upstream.hostname === host)?.[0];
    if (!region || upstream.protocol !== 'https:' || !upstream.pathname.startsWith('/api/'))
      throw new Error('Unsupported MVSep host');
    const url = new URL(endpoint);
    url.searchParams.set('region', region);
    url.searchParams.set('path', upstream.pathname.slice('/api'.length));
    upstream.searchParams.forEach((value, key) => {
      if (key !== 'api_token') url.searchParams.append(key, value);
    });
    const headers = new Headers(init.headers);
    const form = init.body instanceof FormData ? init.body : null;
    const token = upstream.searchParams.get('api_token') ?? (form?.get('api_token') as string | null);
    if (token) headers.set('X-Mvsep-Token', token);
    return fetch(url, { ...init, headers, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' });
  };
  function connected(value: boolean) {
    root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => { button.disabled = !value && button.id === 'pg-test-keys'; });
    $('pg-status').textContent = value ? '● Keys configured' : '● Disconnected';
    $('pg-status').classList.toggle('connected', value);
    $<HTMLButtonElement>('pg-connect').disabled = value;
    $<HTMLButtonElement>('pg-disconnect').disabled = !value;
    $<HTMLButtonElement>('pg-test-keys').disabled = !value;
    for (const id of ['pg-region','pg-strategy','pg-add-key'])
      ($<HTMLButtonElement | HTMLSelectElement>(id)).disabled = value;
    keyList.querySelectorAll<HTMLInputElement>('input, button').forEach(el => el.disabled = value);
  }
  $('pg-connect').addEventListener('click', () => {
    if (!$<HTMLInputElement>('pg-consent').checked)
      return alert('Please read and accept the credential-relay disclosure first.');
    const entered = Array.from(keyList.querySelectorAll<HTMLInputElement>('input')).map(el => el.value.trim()).filter(Boolean);
    if (!entered.length) return alert('Enter at least one API key.');
    if (new Set(entered).size !== entered.length) return alert('Remove duplicate API keys.');
    try {
      keys = entered;
      const version = ++sessionVersion;
      client = new MvsepClient({
        apiKeys: keys, region: val('pg-region'),
        keyRotation: { strategy: val('pg-strategy') as 'round_robin' | 'sticky' },
        retry: { unsafeCreateRetries: 'safe' },
        fetch: viaRelay, onProgress: event => { if (version === sessionVersion) progress(event); },
      });
      keyList.querySelectorAll<HTMLInputElement>('input').forEach(el => { el.value = ''; });
      const select = $<HTMLSelectElement>('pg-affinity');
      select.replaceChildren(new Option('Automatic rotation', ''));
      keys.forEach((_, i) => select.add(new Option('Key #' + (i + 1), String(i))));
      connected(true); state();
      set('pg-response', '// Configured with ' + keys.length + ' key(s).\n// Select an API action to verify the connection.');
      log('Configured ' + keys.length + ' in-memory keys');
    } catch (e) {
      client = null; keys = []; alert(e instanceof Error ? e.message : String(e));
    }
  });
  $('pg-disconnect').addEventListener('click', () => {
    ++sessionVersion; abort?.abort(); abort = null; client = null; keys = [];
    connected(false); state();
    set('pg-response', '// Disconnected. Credentials removed from playground memory.');
    set('pg-response-status', 'Disconnected'); last = '';
    $<HTMLButtonElement>('pg-copy').disabled = true; log('Disconnected');
  });
  $('pg-abort').addEventListener('click', () => { abort?.abort(); log('Local request aborted; server jobs are not cancelled'); });
  $('pg-clear').addEventListener('click', () => {
    last = ''; set('pg-response', '// Cleared'); set('pg-operation', 'NONE');
    $<HTMLButtonElement>('pg-copy').disabled = true;
  });
  $('pg-copy').addEventListener('click', async () => { if (last) await navigator.clipboard.writeText(last); });
  for (const tab of tabs) tab.addEventListener('click', () => {
    tabs.forEach(button => button.setAttribute('aria-selected', String(tab === button)));
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== tab.dataset.tab; });
  });
  root.querySelectorAll<HTMLInputElement>('input[name=pg-input]').forEach(radio => radio.addEventListener('change', () => {
    const mode = root.querySelector<HTMLInputElement>('input[name=pg-input]:checked')?.value;
    $('pg-file-field').hidden = mode !== 'file';
    $('pg-url-field').hidden = mode !== 'url';
  }));
  function renderModels(models: SeparationAlgorithm[]) {
    const list = $('pg-model-list'); list.replaceChildren();
    const title = document.createElement('p'); title.className = 'pg-muted'; title.textContent = models.length + ' models (first 80 shown)'; list.append(title);
    for (const model of models.slice(0, 80)) {
      const button = document.createElement('button');
      const id = document.createElement('b'); id.textContent = String(model.render_id);
      const name = document.createElement('span'); name.textContent = model.name;
      button.append(id, name);
      button.addEventListener('click', () => {
        $<HTMLInputElement>('pg-algorithm').value = String(model.render_id);
        tabs.find(tab => tab.dataset.tab === 'create')?.click();
      });
      list.append(button);
    }
  }
  async function execute(action: string) {
    if (!client) return alert('Connect with one or more API keys first.');
    if (abort) return;
    const thisSession = sessionVersion;
    const controller = new AbortController();
    abort = controller;
    const signal = controller.signal;
    $<HTMLButtonElement>('pg-abort').disabled = false;
    root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.disabled = true);
    set('pg-response-status', 'Loading…');
    const started = performance.now();
    try {
      let data: unknown;
      const hash = val('pg-hash').trim();
      if (['bind','status','wait','remote','cancel','delete'].includes(action) && !hash) throw Error('Enter a job hash.');
      switch (action) {
        case 'models': {
          const models = await client.getAlgorithms(val('pg-scope') as 'single_upload' | 'no_upload' | 'matchering_upload', { signal });
          if (sessionVersion === thisSession) renderModels(models);
          data = { count: models.length, models: models.map(m => ({ id: m.render_id, name: m.name, widget: m.audio_widget, options: m.algorithm_fields })) };
          break;
        }
        case 'test-keys': {
          const selectedRegion = val('pg-region');
          const verifications: Array<{ index: number; valid: boolean; account?: string; error?: string }> = [];
          for (const [index, key] of keys.entries()) {
            if (signal.aborted) throw new Error('Verification cancelled');
            const dedicated = new MvsepClient({ apiKeys: key, region: selectedRegion, fetch: viaRelay,
              retry: { maxAttempts: 1, unsafeCreateRetries: 'never' }, requestTimeoutMs: 12_000 });
            try {
              const user = await dedicated.getUser({ signal });
              verifications.push({ index: index + 1, valid: true,
                ...(typeof user.name === 'string' ? { account: user.name } : {}) });
            } catch (error) {
              verifications.push({ index: index + 1, valid: false, error: error instanceof Error ? error.message : String(error) });
            }
          }
          data = { credentialsChecked: verifications.length, results: verifications,
            note: 'These checks do not submit any separation jobs or change account settings.' };
          log('Checked ' + verifications.length + ' credential(s) against MVSep');
          break;
        }
        case 'news': data = await client.getNews({ limit: 10, lang: 'en' }, { signal }); break;
        case 'demos': data = await client.getDemoSeparations({ limit: 10 }, { signal }); break;
        case 'leaderboard': data = await client.getQualityLeaderboard({ limit: 10 }, { signal }); break;
        case 'quality-queue': data = await client.getQualityQueue({ limit: 10 }, { signal }); break;
        case 'user': data = await client.getUser({ signal }); break;
        case 'queue': data = await client.getQueueSummary({ signal }); break;
        case 'history': data = await client.getSeparationHistory({ limit: 10, start: 0 }, { signal }); break;
        case 'purchases': data = await client.getPurchases({ limit: 10 }, { signal }); break;
        case 'alert': data = await client.getCreditAlert({ signal }); break;
        case 'bind':
          if (!val('pg-affinity')) throw Error('Choose the job\'s originating key.');
          client.bindJobToApiKey(hash, Number(val('pg-affinity')));
          data = { hash, keyIndex: Number(val('pg-affinity')), note: 'This affects only this tab, not ownership on MVSep.' };
          break;
        case 'status': data = await client.getSeparation(hash, { signal }); break;
        case 'remote': data = await client.getRemoteSeparation(hash, { signal }); break;
        case 'wait': data = await client.waitForSeparation(hash, { signal, maxWaitMs: 30 * 60_000, intervalMs: 2000 }); break;
        case 'cancel':
        case 'delete':
          if (!confirm((action === 'delete' ? 'Delete' : 'Cancel') + ' remote job ' + hash + '? This changes server-side state.')) return;
          data = action === 'cancel' ? await client.cancelSeparation(hash, { signal }) : await client.deleteSeparation(hash, { signal });
          break;
        case 'create': {
          const text = val('pg-algorithm');
          const id = Number(text);
          if (!text || !Number.isSafeInteger(id) || id < 0) throw Error('Choose a valid algorithm ID.');
          const mode = root.querySelector<HTMLInputElement>('input[name=pg-input]:checked')?.value;
          const fileMode = mode === 'file';
          const noUpload = mode === 'no_upload';
          const file = $<HTMLInputElement>('pg-file').files?.[0];
          const url = val('pg-url').trim();
          if (fileMode && !file) throw Error('Choose a file.');
          if (fileMode && file && file.size > 2 * 1024 * 1024) throw Error('Maximum 2 MiB. Use a remote URL instead.');
          if (mode === 'url' && (!url.startsWith('https://') || !new URL(url).hostname)) throw Error('Provide a publicly reachable HTTPS audio URL.');
          if (!confirm('Submit this separation to MVSep? It can consume paid credits. Cost is not guaranteed. Continue?')) return;
          const format = val('pg-format');
          const input = {
            sepType: id,
            ...(fileMode && file ? { audiofile: { data: file, filename: file.name, contentType: file.type || 'application/octet-stream' } } : noUpload ? {} : { url }),
            ...(format ? { outputFormat: Number(format) as 0|1|2|3|4|5 } : {}),
            ...(val('pg-opt1') ? { addOpt1: val('pg-opt1') } : {}),
            ...(val('pg-opt2') ? { addOpt2: val('pg-opt2') } : {}),
            ...(val('pg-opt3') ? { addOpt3: val('pg-opt3') } : {}),
          };
          const created = await client.createSeparation(input, { signal });
          if (created.data?.hash) {
            $<HTMLInputElement>('pg-hash').value = created.data.hash;
            const index = client.getJobApiKeyIndex(created.data.hash);
            if (index !== undefined) $<HTMLSelectElement>('pg-affinity').value = String(index);
            log('Created job (key #' + ((index ?? -1) + 1) + ')');
          }
          data = created;
          break;
        }
        case 'raw':
          data = await client.request({ path: val('pg-endpoint'), method: 'GET', authenticated: !publicPaths.has(val('pg-endpoint')), signal });
          break;
        default: throw Error('Unrecognized operation');
      }
      if (data !== undefined && sessionVersion === thisSession) result(action, data, started);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (sessionVersion === thisSession) {
        result(action, { error: msg, name: error instanceof Error ? error.name : 'Error', hint: 'For networking errors check the relay and MVSep region.' }, started, true);
        log('Operation failed (' + action + ')');
      }
    } finally {
      if (abort === controller) abort = null;
      if (sessionVersion === thisSession) {
        $<HTMLButtonElement>('pg-abort').disabled = true;
        root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.disabled = false);
        state();
      }
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => { void execute(button.dataset.action!); }));
}

// FormationFlight web installer.
//
// Reads firmware/releases.json and each release's index.json (published there
// by the docs build from the FormationFlight GitHub releases), lets you pick a
// board and its options, appends the board's configuration trailer to the
// image in the browser (trailer.js), and flashes it with esptool-js over Web
// Serial, or hands it over as a download.
//
// Deliberately plain: it renders into the page Material already drew, with
// Material's own classes, so it looks like the rest of the docs.

import { configureImage } from './trailer.js';

const ESPTOOL_URL = 'https://cdn.jsdelivr.net/npm/esptool-js@0.6.1/bundle.js';
const FIRMWARE = new URL('firmware/', import.meta.url);
const BAUD = 460800;

const BAND_LABELS = {
  433: '433 MHz',
  868: '868 MHz (EU)',
  915: '915 MHz (US, AU)',
  2400: '2.4 GHz',
};
const MAX_NAME = 15;
const MAX_PASSPHRASE = 32;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// Like Node.replaceChildren, but with el()'s rules: arrays flattened, null and
// false skipped. The native one would print "null" and drop an array.
function setChildren(node, ...children) {
  node.replaceChildren(...children.flat(Infinity)
    .filter(c => c != null && c !== false)
    .map(c => (c instanceof Node ? c : document.createTextNode(String(c)))));
}

function remember(key, value) {
  try {
    if (value == null) localStorage.removeItem('ff-installer-' + key);
    else localStorage.setItem('ff-installer-' + key, value);
  } catch (_) { /* private window, blocked storage: just forget */ }
}

function recall(key) {
  try {
    return localStorage.getItem('ff-installer-' + key);
  } catch (_) {
    return null;
  }
}

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url.pathname || url}: HTTP ${r.status}`);
  return r.json();
}

async function getBytes(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url.pathname || url}: HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

function admonition(kind, title, ...body) {
  return el('div', { class: `admonition ${kind}` },
    el('p', { class: 'admonition-title' }, title),
    ...body.map(b => (typeof b === 'string' ? el('p', {}, b) : b)));
}

function mount() {
  const root = document.getElementById('ff-installer');
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = '1';
  new Installer(root).start();
}

class Installer {
  constructor(root) {
    this.root = root;
    this.releases = [];
    this.release = null;   // releases.json entry
    this.index = null;     // that release's index.json
    this.device = null;
    this.band = null;
    this.busy = false;
  }

  async start() {
    try {
      const data = await getJson(new URL('releases.json', FIRMWARE));
      this.releases = data.releases || [];
    } catch (err) {
      setChildren(this.root, admonition('failure', 'Could not load the firmware list',
        `The installer could not read its list of releases (${err.message}). Try again in a minute, or download a release from GitHub.`));
      return;
    }
    if (!this.releases.length) {
      setChildren(this.root, admonition('warning', 'No firmware published yet',
        'There is no release the installer can flash yet. Check back after the next release.'));
      return;
    }
    this.render();
    const wanted = recall('release');
    const initial = this.releases.find(r => r.tag === wanted) || this.releases[0];
    await this.selectRelease(initial.tag);
  }

  render() {
    const hasSerial = 'serial' in navigator;

    this.releaseSelect = el('select', { id: 'ff-release', onchange: e => this.selectRelease(e.target.value) },
      this.releases.map(r => el('option', { value: r.tag },
        r.prerelease && !/development/i.test(r.name) ? `${r.name} (development)` : r.name)));
    this.releaseInfo = el('span', { class: 'ff-hint' });

    this.vendorSelect = el('select', { id: 'ff-vendor', onchange: () => this.fillBoards() });
    this.boardSelect = el('select', { id: 'ff-board', onchange: () => this.selectDevice(this.boardSelect.value) });
    this.deviceInfo = el('div');

    this.bandField = el('div');
    this.nameInput = el('input', {
      id: 'ff-name', type: 'text', maxlength: MAX_NAME, autocomplete: 'off', spellcheck: 'false',
      placeholder: 'Derived from the chip ID', oninput: () => this.update(),
    });
    this.passInput = el('input', {
      id: 'ff-pass', type: 'text', maxlength: MAX_PASSPHRASE, autocomplete: 'off', spellcheck: 'false',
      placeholder: 'Default key', oninput: () => this.update(),
    });
    this.eraseInput = el('input', { id: 'ff-erase', type: 'checkbox' });

    this.flashButton = el('button', { class: 'md-button md-button--primary', type: 'button', onclick: () => this.flash() },
      'Flash over USB');
    this.downloadButton = el('button', { class: 'md-button', type: 'button', onclick: () => this.download() },
      'Download firmware');
    this.status = el('p', { class: 'ff-status' });
    this.progress = el('progress', { max: 100, value: 0, hidden: true });
    this.logCode = el('code');
    this.logBlock = el('pre', { class: 'ff-log', hidden: true }, this.logCode);

    setChildren(this.root, 
      el('h2', { id: 'board' }, '1. Board'),
      el('div', { class: 'ff-field' },
        el('label', { for: 'ff-release' }, 'Firmware'), this.releaseSelect, this.releaseInfo),
      el('div', { class: 'ff-field' },
        el('label', { for: 'ff-vendor' }, 'Manufacturer'), this.vendorSelect),
      el('div', { class: 'ff-field' },
        el('label', { for: 'ff-board' }, 'Board'), this.boardSelect),
      this.deviceInfo,

      el('h2', { id: 'options' }, '2. Options'),
      this.bandField,
      el('div', { class: 'ff-field' },
        el('label', { for: 'ff-name' }, 'Node name ', el('span', { class: 'ff-hint' }, `optional, up to ${MAX_NAME} characters`)),
        this.nameInput),
      el('div', { class: 'ff-field' },
        el('label', { for: 'ff-pass' }, 'Group passphrase ', el('span', { class: 'ff-hint' }, 'optional, the same on every node in the group')),
        this.passInput),
      el('div', { class: 'ff-field' },
        el('label', { class: 'ff-check' }, this.eraseInput, ' Erase the whole flash first'),
        el('span', { class: 'ff-hint' }, 'Starts from factory settings, so the name and passphrase above take effect. Off keeps the settings the node already has.')),

      el('h2', { id: 'flash' }, '3. Flash'),
      hasSerial ? null : admonition('warning', 'This browser cannot flash over USB',
        'Use Chrome, Edge or Opera on a desktop to flash over USB. You can still download the firmware here.'),
      el('p', { class: 'ff-buttons' }, hasSerial ? this.flashButton : null, ' ', this.downloadButton),
      this.status,
      this.progress,
      this.logBlock,
    );
    if (!hasSerial) this.flashButton.disabled = true;
  }

  async selectRelease(tag) {
    const release = this.releases.find(r => r.tag === tag);
    if (!release) return;
    this.release = release;
    this.releaseSelect.value = tag;
    remember('release', tag);
    setChildren(this.releaseInfo, 
      release.commit ? `${release.commit}, ` : '',
      release.date ? `${release.date.slice(0, 10)}, ` : '',
      el('a', { href: release.url, target: '_blank', rel: 'noopener' }, 'release notes'));
    this.setStatus('');
    try {
      this.index = await getJson(new URL(`${tag}/index.json`, FIRMWARE));
    } catch (err) {
      this.index = null;
      this.setStatus(`Could not load ${tag}: ${err.message}`, true);
    }
    this.fillVendors();
  }

  devices() {
    return (this.index && this.index.devices) || [];
  }

  fillVendors() {
    const vendors = [...new Set(this.devices().map(d => d.vendor))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const previous = this.device && this.device.vendor;
    const remembered = this.devices().find(d => d.id === recall('device'));
    setChildren(this.vendorSelect, 
      el('option', { value: '' }, 'Choose a manufacturer'),
      vendors.map(v => el('option', { value: v }, v)));
    const vendor = vendors.includes(previous) ? previous : remembered && remembered.vendor;
    this.vendorSelect.value = vendor || '';
    this.fillBoards();
  }

  fillBoards() {
    const vendor = this.vendorSelect.value;
    const boards = this.devices().filter(d => d.vendor === vendor)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const groups = [...new Set(boards.map(d => d.group))];
    setChildren(this.boardSelect, 
      el('option', { value: '' }, vendor ? 'Choose a board' : 'Choose a manufacturer first'),
      groups.map(g => el('optgroup', { label: g },
        boards.filter(d => d.group === g).map(d => el('option', { value: d.id }, d.name)))));
    this.boardSelect.disabled = !vendor;
    const keep = boards.find(d => this.device && d.id === this.device.id)
      || boards.find(d => d.id === recall('device'));
    this.boardSelect.value = keep ? keep.id : '';
    this.selectDevice(this.boardSelect.value);
  }

  selectDevice(id) {
    const device = this.devices().find(d => d.id === id) || null;
    if (device !== this.device) this.band = null;
    this.device = device;
    if (device) remember('device', device.id);
    this.renderDevice();
    this.renderBands();
    this.update();
  }

  env() {
    if (!this.device || !this.index) return null;
    const key = this.device.bands.length ? String(this.band || '') : '0';
    const name = this.device.envs[key] || (this.device.bands.length ? null : Object.values(this.device.envs)[0]);
    return name ? this.index.envs[name] : null;
  }

  renderDevice() {
    const d = this.device;
    if (!d || !this.index) {
      setChildren(this.deviceInfo, );
      return;
    }
    const builds = [...new Set(Object.values(d.envs))].map(e => this.index.envs[e]).filter(Boolean);
    const first = builds[0];
    const rows = [
      ['Build', builds.map(b => b.env).join(', ')],
      // esptool calls an ESP8285 an ESP8266, which it is, with the flash inside.
      ['Chip', first ? (first.chip === 'ESP8266' ? 'ESP8266 / ESP8285' : first.chip) : ''],
      ['Radio', first && first.radio ? first.radio : 'none (ESP-NOW only)'],
      ['LoRa bands', d.bands.length ? d.bands.map(b => BAND_LABELS[b] || `${b} MHz`).join(', ') : 'none'],
    ];
    setChildren(this.deviceInfo, el('table', { class: 'ff-device' },
      el('tbody', {}, rows.map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v))))));
  }

  renderBands() {
    const d = this.device;
    if (!d) {
      setChildren(this.bandField, el('p', { class: 'ff-hint' }, 'Choose a board first.'));
      return;
    }
    if (!d.bands.length) {
      setChildren(this.bandField, el('p', {}, 'This board has no LoRa radio: it talks over ESP-NOW only.'));
      return;
    }
    if (d.bands.length === 1) {
      this.band = d.bands[0];
      setChildren(this.bandField, el('div', { class: 'ff-field' },
        el('span', { class: 'ff-label' }, 'LoRa band'),
        el('p', {}, `${BAND_LABELS[this.band] || this.band + ' MHz'}, the only band available for this board.`)));
      return;
    }
    // No default on purpose: a band picked for you is illegal somewhere.
    setChildren(this.bandField, el('fieldset', { class: 'ff-field ff-bands' },
      el('legend', { class: 'ff-label' }, 'LoRa band ', el('span', { class: 'ff-hint' }, 'the one that is legal where you fly')),
      d.bands.map(b => el('label', {},
        el('input', {
          type: 'radio', name: 'ff-band', value: b, checked: this.band === b,
          onchange: () => { this.band = b; this.renderDevice(); this.update(); },
        }), ' ', BAND_LABELS[b] || `${b} MHz`))));
  }

  options() {
    const opts = {};
    if (this.band) opts['lora-band'] = this.band;
    const name = this.nameInput.value.trim();
    const pass = this.passInput.value;
    if (name) opts.name = name;
    if (pass) opts['group-passphrase'] = pass;
    return opts;
  }

  problem() {
    if (!this.index) return 'The firmware list did not load.';
    if (!this.device) return 'Choose your board.';
    if (this.device.bands.length && !this.band) return 'Choose the LoRa band.';
    if (!this.env()) return 'This release has no build for that board and band.';
    const name = this.nameInput.value.trim();
    if (name && !/^[ -~]+$/.test(name)) return 'The node name has to be plain ASCII.';
    return null;
  }

  // keepStatus: re-enable the buttons without replacing what the last attempt
  // said. Any change of choice does replace it.
  update(keepStatus = false) {
    if (this.busy) return;
    const problem = this.problem();
    this.flashButton.disabled = !!problem || !('serial' in navigator);
    this.downloadButton.disabled = !!problem;
    if (!keepStatus) this.setStatus(problem || 'Ready.');
  }

  setStatus(text, error = false) {
    this.status.textContent = text;
    this.status.classList.toggle('ff-error', error);
  }

  log(line) {
    this.logBlock.hidden = false;
    this.logCode.textContent += line + '\n';
    this.logBlock.scrollTop = this.logBlock.scrollHeight;
  }

  // Every part of the image, fetched, with the board's trailer on the app.
  async buildParts() {
    const env = this.env();
    const d = this.device;
    const parts = [];
    for (const part of env.parts) {
      this.setStatus(`Downloading ${part.file}`);
      let data = await getBytes(new URL(`${this.release.tag}/${part.file}`, FIRMWARE));
      if (part.app) {
        data = configureImage(data, {
          productName: d.elrs ? d.elrs.product_name : d.name,
          deviceName: d.elrs ? d.elrs.lua_name : '',
          options: this.options(),
          layout: d.elrs ? d.elrs.layout : null,
        });
      }
      parts.push({ ...part, data });
    }
    return { env, parts };
  }

  async download() {
    if (this.problem()) return;
    this.setBusy(true);
    try {
      const { env, parts } = await this.buildParts();
      const app = parts.find(p => p.app);
      let data = app.data;
      let file = `formationflight-${this.release.tag}-${this.device.id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.bin`;
      // On a 1 MB ESP8285 the node's Update page has room for the compressed
      // image only, never the plain .bin (the bootloader unpacks it). So that
      // is the file an ESP8266-family board gets.
      const compressed = env.chip === 'ESP8266';
      if (compressed) {
        if (typeof CompressionStream === 'undefined') {
          throw new Error('This browser cannot compress the firmware. Use Flash over USB, or a current Chrome, Edge, Firefox or Safari.');
        }
        this.setStatus('Compressing');
        data = new Uint8Array(await new Response(
          new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
        file += '.gz';
      }
      const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
      el('a', { href: url, download: file }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (compressed) {
        this.setStatus(`Saved ${file}. Upload it as it is, still compressed, on the node's Update page. To flash a board over serial, use Flash over USB instead.`);
      } else {
        this.setStatus(`Saved ${file}. That is the application only: upload it on the node's Update page. A board that has never run FormationFlight needs Flash over USB.`);
      }
    } catch (err) {
      this.setStatus(err.message, true);
    } finally {
      this.setBusy(false);
    }
  }


  setBusy(busy) {
    this.busy = busy;
    for (const c of this.root.querySelectorAll('select, input')) c.disabled = busy;
    this.flashButton.disabled = busy;
    this.downloadButton.disabled = busy;
    if (!busy) {
      this.boardSelect.disabled = !this.vendorSelect.value;
      this.update(true);
    }
  }

  async flash() {
    if (this.problem() || !('serial' in navigator)) return;
    let port;
    try {
      port = await navigator.serial.requestPort();
    } catch (_) {
      return; // the chooser was cancelled
    }
    this.setBusy(true);
    this.logCode.textContent = '';
    this.progress.hidden = false;
    this.progress.value = 0;
    let transport = null;
    try {
      const { env, parts } = await this.buildParts();
      this.setStatus('Loading the flasher');
      const { ESPLoader, Transport } = await import(ESPTOOL_URL);
      transport = new Transport(port, false);
      const loader = new ESPLoader({
        transport,
        baudrate: BAUD,
        terminal: {
          clean: () => {},
          writeLine: line => this.log(line),
          write: text => { this.logBlock.hidden = false; this.logCode.textContent += text; },
        },
      });
      this.setStatus('Connecting. If this hangs, put the board in bootloader mode and try again.');
      await loader.main();
      const chip = loader.chip.CHIP_NAME;
      if (chip !== env.chip) {
        throw new Error(`That is an ${chip}, and this build is for an ${env.chip}. Check the board you picked.`);
      }
      if (this.eraseInput.checked) {
        this.setStatus('Erasing the flash. This takes a while.');
        await loader.eraseFlash();
      }
      const total = parts.reduce((n, p) => n + p.data.length, 0);
      const done = parts.map(() => 0);
      this.setStatus('Writing');
      await loader.writeFlash({
        fileArray: parts.map(p => ({ data: p.data, address: p.offset })),
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (i, written, size) => {
          done[i] = (written / size) * parts[i].data.length;
          this.progress.value = Math.round((done.reduce((a, b) => a + b, 0) / total) * 100);
        },
      });
      this.progress.value = 100;
      await loader.after('hard_reset');
      this.setStatus(`Done. ${this.device.name} is running FormationFlight ${this.release.name}.`);
    } catch (err) {
      this.log(String(err && err.message ? err.message : err));
      this.setStatus(err && err.message ? err.message : 'Flashing failed.', true);
    } finally {
      if (transport) {
        try { await transport.disconnect(); } catch (_) { /* already gone */ }
      }
      this.setBusy(false);
    }
  }
}

// Material's instant navigation swaps pages without reloading, so mount on
// every page change rather than once.
if (window.document$ && typeof window.document$.subscribe === 'function') {
  window.document$.subscribe(mount);
} else {
  mount();
}

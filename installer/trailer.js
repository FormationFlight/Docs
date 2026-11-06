// The configuration trailer FormationFlight (and ExpressLRS) read from the end
// of the application image:
//
//   [product name 128 B][device name 16 B][options JSON 512 B][layout JSON 2048 B]
//
// A straight port of scripts/elrs_targets.py in the FormationFlight repo
// (findFirmwareEnd, buildTrailer, configure), so an image configured here is
// byte-for-byte the image `elrs_targets.py configure` would have written.

const PRODUCT_NAME_SIZE = 128;
const DEVICE_NAME_SIZE = 16;
const OPTIONS_SIZE = 512;
const LAYOUT_SIZE = 2048;
export const TRAILER_SIZE = PRODUCT_NAME_SIZE + DEVICE_NAME_SIZE + OPTIONS_SIZE + LAYOUT_SIZE;

// The end of the last image segment, rounded up to 16 bytes, plus the SHA-256
// on ESP32: where ESP.getSketchSize() says the image ends on the device.
export function findFirmwareEnd(image) {
  const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  if (view.getUint8(0) !== 0xe9) {
    throw new Error('not an ESP firmware image (bad magic)');
  }
  let segments = view.getUint8(1);
  let pos;
  let is8285 = false;
  if (segments === 2) {
    // ESP8266 Arduino images start with eboot; the app image is at 0x1000.
    if (view.getUint8(0x1000) !== 0xe9) {
      throw new Error('not an ESP8266 image (no app image at 0x1000)');
    }
    segments = view.getUint8(0x1001);
    pos = 0x1000 + 8;
    is8285 = true;
  } else {
    pos = 24;
  }
  for (let i = 0; i < segments; i++) {
    const size = view.getUint32(pos + 4, true);
    pos += 8 + size;
  }
  pos = (pos + 16) & ~15;
  if (!is8285) {
    pos += 32;
  }
  return pos;
}

function fixed(text, size) {
  const out = new Uint8Array(size);
  out.set(new TextEncoder().encode(text).subarray(0, size));
  return out;
}

// Python's json.dumps(obj, separators=(',', ':')) escapes non-ASCII as \uXXXX;
// JSON.stringify does not. Match it, so the bytes match.
function compactJson(obj) {
  const nonAscii = new RegExp('[^' + String.fromCharCode(0) + '-' + String.fromCharCode(0x7f) + ']', 'g');
  return JSON.stringify(obj).replace(nonAscii,
    c => String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

// The trailer for one device.
//   productName, deviceName: shown by the node and by ELRS' tools
//   options: {"lora-band", "name", "group-passphrase"}, any of them
//   layout: the merged ExpressLRS layout, or null for a board whose pins are
//           compiled in (2 KB of zeroes, as ELRS writes for no layout)
export function buildTrailer({ productName, deviceName, options, layout }) {
  const layoutJson = layout ? compactJson(layout) : '';
  if (layoutJson.length >= LAYOUT_SIZE) {
    throw new Error(`layout is ${layoutJson.length} bytes, the trailer holds ${LAYOUT_SIZE - 1}`);
  }
  const optionsJson = compactJson(options || {});
  if (optionsJson.length >= OPTIONS_SIZE) {
    throw new Error('options do not fit in the trailer');
  }
  const out = new Uint8Array(TRAILER_SIZE);
  let at = 0;
  for (const [text, size] of [[productName || '', PRODUCT_NAME_SIZE],
                              [deviceName || '', DEVICE_NAME_SIZE],
                              [optionsJson, OPTIONS_SIZE],
                              [layoutJson, LAYOUT_SIZE]]) {
    out.set(fixed(text, size), at);
    at += size;
  }
  return out;
}

// The image cut at its true end (dropping any trailer already there, so this
// is idempotent) with the new trailer after it.
export function configureImage(image, trailerFields) {
  const end = findFirmwareEnd(image);
  const out = new Uint8Array(end + TRAILER_SIZE);
  out.fill(0xff, 0, end);
  out.set(image.subarray(0, Math.min(end, image.length)), 0);
  out.set(buildTrailer(trailerFields), end);
  return out;
}

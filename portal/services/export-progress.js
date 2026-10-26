/* Builds a downloadable .zip of a student's completed labs, time spent and
 * the code they wrote (workspace drafts that differ from the starter files). */
import { getSession } from './auth-service.js';
import { getCompletedActivities } from './progress-service.js';
import { findItem } from '../data/curriculum.js';
import { listPaths, isModified, readFile } from '../apps/learn/editor/mock-fs.js';
import { readTimes, formatTotal } from './time-tracker.js';

const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Stored (uncompressed) zip of [{ name, content }]. */
export function buildZip(files){
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(12, dosTime, true);
    entry.setUint16(14, dosDate, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);

    offset += 30 + name.length + data.length;
  });

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

export async function exportProgress(){
  const session = await getSession();
  const email = session && session.email;
  const completedIds = await getCompletedActivities();
  const times = readTimes(email);

  const completed = completedIds.map((id) => findItem(id)).filter(Boolean)
    .sort((a, b) => String(a.item.number).localeCompare(String(b.item.number), undefined, { numeric: true }));
  const codePaths = listPaths().filter((path) => isModified(path));
  const totalSeconds = Object.values(times).reduce((sum, secs) => sum + secs, 0);

  const lines = [
    'SwayForm progress export',
    `Name: ${(session && (session.displayName || session.name)) || 'Guest'}`,
    `Date: ${new Date().toLocaleString()}`,
    '',
    `Completed (${completed.length})`,
    ...(completed.length ? completed.map(({ section, item }) => `  ${item.number}  ${item.title}  (${section.title})`) : ['  None yet']),
    '',
    `Total time spent: ${formatTotal(totalSeconds)}`,
    ...Object.entries(times).sort((a, b) => b[1] - a[1]).map(([id, secs]) => {
      const found = findItem(id);
      return `  ${found ? `${found.item.number}  ${found.item.title}` : id}: ${formatTotal(secs)}`;
    }),
    '',
    `Code you wrote (${codePaths.length} file${codePaths.length === 1 ? '' : 's'}, in the code folder)`,
    ...(codePaths.length ? codePaths.map((path) => `  ${path}`) : ['  None yet']),
    '',
  ];

  const files = [{ name: 'progress.txt', content: lines.join('\n') }];
  codePaths.forEach((path) => files.push({ name: `code/${path}`, content: readFile(path) || '' }));

  const url = URL.createObjectURL(buildZip(files));
  const link = document.createElement('a');
  link.href = url;
  link.download = `swayform-progress-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { completed: completed.length, files: codePaths.length };
}

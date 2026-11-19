// Remembers which lab groups (5 Wave, 6 Greeting Gestures, ...) a viewer has opened; groups start collapsed.
const KEY = 'swayform.portal.open-groups';

function read(){
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}

export function isGroupOpen(groupId){
  return read().has(groupId);
}

export function toggleGroup(groupId){
  const open = read();
  if (open.has(groupId)) open.delete(groupId); else open.add(groupId);
  try { localStorage.setItem(KEY, JSON.stringify([...open])); } catch {}
  return open.has(groupId);
}

// Remembers which lab groups (5 Wave, 6 Greeting Gestures, ...) a viewer has collapsed; groups start open.
const KEY = 'swayform.portal.collapsed-groups';

function read(){
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}

export function isGroupOpen(groupId){
  return !read().has(groupId);
}

export function toggleGroup(groupId){
  const closed = read();
  if (closed.has(groupId)) closed.delete(groupId); else closed.add(groupId);
  try { localStorage.setItem(KEY, JSON.stringify([...closed])); } catch {}
  return !closed.has(groupId);
}

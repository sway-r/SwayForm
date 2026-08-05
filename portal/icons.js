/* Shared line-icon set for the Learning Portal. Minimal, geometric, stroke-based —
   deliberately avoids emoji/cartoonish glyphs to keep the dev-tool aesthetic. */
const PATHS = {
  learn:        '<polyline points="8 5 3 12 8 19"/><polyline points="16 5 21 12 16 19"/>',
  projects:     '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>',
  account:      '<circle cx="12" cy="8.2" r="3.4"/><path d="M4.8 20c1-3.6 4-5.6 7.2-5.6s6.2 2 7.2 5.6"/>',
  help:         '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"/>',
  settings:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.55V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.55 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" opacity="0"/><path d="M4.6 9.4a7.7 7.7 0 0 0 0 5.2M19.4 9.4a7.7 7.7 0 0 1 0 5.2M9.4 4.6a7.7 7.7 0 0 1 5.2 0M9.4 19.4a7.7 7.7 0 0 0 5.2 0"/>',
  close:        '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  minimize:     '<line x1="5" y1="17" x2="19" y2="17"/>',
  maximize:     '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
  restore:      '<rect x="7" y="4" width="12" height="12" rx="1.3"/><path d="M5 8v11a1 1 0 0 0 1 1h11" opacity=".55"/>',
  folder:       '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>',
  folderOpen:   '<path d="M3 8a1 1 0 0 1 1-1h4.5l1.8 2H20a1 1 0 0 1 .97 1.24l-1.5 6A1 1 0 0 1 18.5 17H5a1 1 0 0 1-1-1V8Z"/>',
  file:         '<path d="M7 3.5h7l4 4v13a.9.9 0 0 1-.9.9H7a.9.9 0 0 1-.9-.9V4.4A.9.9 0 0 1 7 3.5Z"/><polyline points="14 3.5 14 8 18.5 8"/>',
  play:         '<path d="M7 5.2v13.6a.8.8 0 0 0 1.22.68l10.9-6.8a.8.8 0 0 0 0-1.36L8.22 4.52A.8.8 0 0 0 7 5.2Z"/>',
  save:         '<path d="M5 4h11l3 3v13H5V4Z"/><path d="M8 4v5h7V4" opacity=".6"/><path d="M8 13h8v6H8z" opacity=".6"/>',
  refresh:      '<path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5"/><path d="M20 4.5V8.5H16" /><path d="M20 12a8 8 0 0 1-13.66 5.66L4 15.5"/><path d="M4 19.5V15.5H8"/>',
  check:        '<polyline points="4 12.5 9.5 18 20 6"/>',
  checkCircle:  '<circle cx="12" cy="12" r="8.2"/><polyline points="8.2 12.3 11 15 15.8 9.2"/>',
  terminal:     '<rect x="3" y="4.5" width="18" height="15" rx="1.5"/><polyline points="7 9.5 10.5 12.5 7 15.5"/><line x1="12.5" y1="15.5" x2="17" y2="15.5"/>',
  chevronRight: '<polyline points="9 5.5 15.5 12 9 18.5"/>',
  chevronDown:  '<polyline points="5.5 9 12 15.5 18.5 9"/>',
  search:       '<circle cx="10.8" cy="10.8" r="6.3"/><line x1="15.5" y1="15.5" x2="20.5" y2="20.5"/>',
  lock:         '<rect x="5" y="10.5" width="14" height="9.5" rx="1.6"/><path d="M8 10.5V7.5a4 4 0 1 1 8 0v3"/>',
  dot:          '<circle cx="12" cy="12" r="4"/>',
  arrowLeft:    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="10.5 6 5 12 10.5 18"/>',
  arrowRight:   '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="13.5 6 19 12 13.5 18"/>',
  plus:         '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  info:         '<circle cx="12" cy="12" r="8.2"/><line x1="12" y1="11" x2="12" y2="16.2"/><circle cx="12" cy="7.6" r=".9" fill="currentColor" stroke="none"/>',
  warning:      '<path d="M12 4 21.5 20H2.5Z"/><line x1="12" y1="10.5" x2="12" y2="14.6"/><circle cx="12" cy="17.3" r=".85" fill="currentColor" stroke="none"/>',
  tip:          '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6.5 6.5 0 0 0-3.6 11.9c.5.35.85.9.9 1.5V17h5.4v-.6c.05-.6.4-1.15.9-1.5A6.5 6.5 0 0 0 12 3Z"/>',
  shield:       '<path d="M12 3.5 19 6.3v5.4c0 4.6-3 8-7 9-4-1-7-4.4-7-9V6.3Z"/>',
  book:         '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"/>',
  clock:        '<circle cx="12" cy="12" r="8.2"/><polyline points="12 7.2 12 12 15.6 14"/>',
  user:         '<circle cx="12" cy="8.2" r="3.4"/><path d="M4.8 20c1-3.6 4-5.6 7.2-5.6s6.2 2 7.2 5.6"/>',
  building:     '<rect x="5" y="3.5" width="14" height="17" rx="1"/><line x1="9" y1="7.5" x2="9" y2="7.5"/><line x1="12" y1="7.5" x2="12" y2="7.5"/><line x1="15" y1="7.5" x2="15" y2="7.5"/><path d="M9 7.5h.01M12 7.5h.01M15 7.5h.01M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5h.01"/><path d="M10 20.5V17h4v3.5"/>',
  externalLink: '<path d="M9 6H5.5A1.5 1.5 0 0 0 4 7.5v11A1.5 1.5 0 0 0 5.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/><polyline points="14 4 20 4 20 10"/><line x1="20" y1="4" x2="11" y2="13"/>',
  bell:         '<path d="M6 10.5a6 6 0 1 1 12 0c0 4.5 1.5 5.5 1.5 5.5h-15S6 15 6 10.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  sun:          '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5" y1="5" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="19" y2="19"/><line x1="19" y1="5" x2="17.2" y2="6.8"/><line x1="6.8" y1="17.2" x2="5" y2="19"/>',
  moon:         '<path d="M20 13.7A8.3 8.3 0 1 1 10.3 4a6.7 6.7 0 0 0 9.7 9.7Z"/>',
  cloud:        '<path d="M7.5 18a4.5 4.5 0 0 1-.5-8.98A5.5 5.5 0 0 1 17.6 9.5 4 4 0 0 1 17 18H7.5Z"/>',
  layers:       '<polygon points="12 3 21 8 12 13 3 8"/><polyline points="3 13 12 18 21 13" opacity=".6"/><polyline points="3 17.5 12 22.5 21 17.5" opacity=".3"/>',
  target:       '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/>',
};

export function icon(name, cls){
  const body = PATHS[name] || PATHS.dot;
  return `<svg viewBox="0 0 24 24" class="${cls||''}" aria-hidden="true">${body}</svg>`;
}

export function hasIcon(name){ return !!PATHS[name]; }

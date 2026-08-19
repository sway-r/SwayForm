import React, { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { store, subscribe, refreshState, undo, redo, api, toast } from './api.js';
import { Icon } from './common.jsx';
import CurriculumView from './views/CurriculumView.jsx';
import LessonEditor from './views/LessonEditor.jsx';
import WorkspaceView from './views/WorkspaceView.jsx';
import PortalHomeView from './views/PortalHomeView.jsx';
import AssetsView from './views/AssetsView.jsx';
import SettingsView from './views/SettingsView.jsx';
import ChangesView from './views/ChangesView.jsx';
import SearchPalette from './views/SearchPalette.jsx';

const NAV = [
  { group: 'Content', items: [
    { id: 'curriculum', label: 'Curriculum', icon: 'layers' },
    { id: 'workspace', label: 'Workspace Files', icon: 'folder' },
    { id: 'desktop', label: 'Portal Home', icon: 'home' },
    { id: 'assets', label: 'Assets', icon: 'image' },
  ]},
  { group: 'Configuration', items: [
    { id: 'settings', label: 'Global Settings', icon: 'sliders' },
  ]},
  { group: 'Review', items: [
    { id: 'changes', label: 'Changes & History', icon: 'git' },
  ]},
];

export default function App() {
  useSyncExternalStore(subscribe, () => store.revision + ':' + store.changeCount + ':' + store.toasts.length + ':' + store.loading);
  const [view, setView] = useState({ page: 'curriculum', params: {} });
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => { refreshState().catch((e) => { store.error = e.message; }); }, []);

  /* Global shortcuts: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, Ctrl+K search. */
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')
        || document.activeElement?.closest?.('.monaco-editor');
      if (e.key === 'k') { e.preventDefault(); setPaletteOpen(true); }
      else if (e.key === 'z' && !e.shiftKey && !inField) { e.preventDefault(); undo(); }
      else if ((e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !inField) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openLesson = useCallback((activityId, tab, focus) => {
    setView({ page: 'lesson', params: { activityId, tab: tab || 'notebook', focus } });
  }, []);

  const nav = { view, setView, openLesson };

  if (store.loading) return <div className="empty" style={{ paddingTop: 120 }}>Loading SwayForm Studio…</div>;
  if (!store.content) return <div className="empty" style={{ paddingTop: 120 }}>Failed to load content: {store.error}</div>;

  const page = view.page;
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span><span className="s">S</span>wayForm</span><span className="sub">Studio</span></div>
        <div className="topbar-search" onClick={() => setPaletteOpen(true)}>
          <Icon name="search" className="icn" />
          <input placeholder="Search lessons, blocks, code…  (Ctrl+K)" readOnly value="" />
        </div>
        <div className="topbar-spacer" />
        {store.staleFiles.length > 0 && (
          <button className="tb-btn" style={{ color: 'var(--amber)' }} title={store.staleFiles.join('\n')}
            onClick={async () => { const r = await api.post('/reload'); await refreshState(); toast(r.dropped.length ? `Reloaded. Dropped ${r.dropped.length} conflicting change(s).` : 'Reloaded external file changes.', 'info'); }}>
            <Icon name="warning" className="icn" /> Files changed outside Studio — reload
          </button>
        )}
        <button className="tb-btn" disabled={!store.canUndo} onClick={undo} title="Undo (Ctrl+Z)"><Icon name="undo" className="icn" /></button>
        <button className="tb-btn" disabled={!store.canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)"><Icon name="redo" className="icn" /></button>
        <button className={`changes-chip${store.changeCount ? '' : ' zero'}`} onClick={() => setView({ page: 'changes', params: {} })}>
          {store.changeCount ? `${store.changeCount} unsaved change${store.changeCount === 1 ? '' : 's'}` : 'No unsaved changes'}
        </button>
        <button className="tb-btn primary" disabled={!store.changeCount}
          onClick={() => setView({ page: 'changes', params: { save: true } })}>
          <Icon name="save" className="icn" /> Save Changes
        </button>
      </div>

      <div className="sidebar">
        {NAV.map((g) => (
          <div className="nav-group" key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map((item) => (
              <button key={item.id}
                className={`nav-item${page === item.id || (page === 'lesson' && item.id === 'curriculum') ? ' active' : ''}`}
                onClick={() => setView({ page: item.id, params: {} })}>
                <Icon name={item.icon} className="icn" />
                {item.label}
                {item.id === 'changes' && store.changeCount > 0 && <span className="count">{store.changeCount}</span>}
              </button>
            ))}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="nav-group" style={{ paddingBottom: 12 }}>
          <div className="nav-group-label">Preview</div>
          <a className="nav-item" href="http://127.0.0.1:4601/" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Icon name="externalLink" className="icn" /> Open Student Portal
          </a>
        </div>
      </div>

      <div className="main">
        {page === 'curriculum' && <CurriculumView nav={nav} />}
        {page === 'lesson' && <LessonEditor nav={nav} params={view.params} />}
        {page === 'workspace' && <WorkspaceView nav={nav} params={view.params} />}
        {page === 'desktop' && <PortalHomeView nav={nav} />}
        {page === 'assets' && <AssetsView nav={nav} />}
        {page === 'settings' && <SettingsView nav={nav} />}
        {page === 'changes' && <ChangesView nav={nav} params={view.params} />}
      </div>

      {paletteOpen && <SearchPalette nav={nav} onClose={() => setPaletteOpen(false)} />}

      <div className="toast-wrap">
        {store.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}

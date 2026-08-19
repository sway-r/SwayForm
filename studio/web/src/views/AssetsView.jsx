/* Asset manager — /images inventory with usage references, upload/replace,
 * and reference-guarded delete (the server refuses to delete anything still
 * referenced by a lesson or a site file).
 */
import React, { useEffect, useRef, useState } from 'react';
import { api, toast, refreshState } from '../api.js';
import { Icon, fmtBytes } from '../common.jsx';

export default function AssetsView() {
  const [assets, setAssets] = useState(null);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  const [replacing, setReplacing] = useState(null);

  const load = () => api.get('/assets').then((r) => setAssets(r.assets)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  async function upload(file, overwriteName) {
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    try {
      const r = await api.post('/assets/upload', {
        name: overwriteName || file.name,
        dataBase64: b64,
        overwrite: !!overwriteName,
      });
      toast(`${r.replaced ? 'Replaced' : 'Uploaded'} ${r.path} (${fmtBytes(r.size)})`, 'success');
      load();
      refreshState();
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  }

  return (
    <div className="view">
      <div className="view-scroll">
        <div className="view-head">
          <div>
            <div className="view-title">Assets</div>
            <div className="view-sub">/images — used by lessons and site pages. Deleting is blocked while an asset is referenced anywhere.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn primary" onClick={() => fileRef.current.click()}><Icon name="plus" size={12} /> Upload image</button>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value = ''; }} />
          <input ref={replaceRef} type="file" accept="image/*" hidden
            onChange={(e) => { if (e.target.files[0] && replacing) upload(e.target.files[0], replacing); e.target.value = ''; setReplacing(null); }} />
        </div>

        {!assets ? <div className="empty">Loading…</div> : (
          <div className="asset-grid">
            {assets.map((a) => (
              <div className="asset-card" key={a.name}>
                <div className="asset-thumb" style={{ backgroundImage: `url(http://127.0.0.1:4601/${a.path}?m=${a.mtime})` }} />
                <div className="asset-info">
                  <div className="asset-name" title={a.name}>{a.name}</div>
                  <div className="asset-meta">
                    <span>{fmtBytes(a.size)}</span>
                    {a.usedBy.length
                      ? <span className="chip green" title={a.usedBy.map((u) => u.title || u.file).join('\n')}>{a.usedBy.length} ref{a.usedBy.length === 1 ? '' : 's'}</span>
                      : <span className="chip gray">unused</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <button className="btn" style={{ flex: 1 }} onClick={() => { setReplacing(a.name); replaceRef.current.click(); }}>Replace</button>
                    <button className="btn danger" disabled={a.usedBy.length > 0}
                      title={a.usedBy.length ? `Still referenced:\n${a.usedBy.map((u) => u.title || u.file).join('\n')}` : 'Delete'}
                      onClick={async () => {
                        if (!window.confirm(`Delete ${a.name}? (Deletes the file directly — commit through normal git flow.)`)) return;
                        try { await api.post('/assets/delete', { name: a.name }); toast(`Deleted ${a.name}`, 'success'); load(); }
                        catch (err) { toast(err.message, 'error', 6000); }
                      }}><Icon name="trash" size={11} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Global Settings — content-level settings (terminal defaults, global
 * read-only files). Advanced developer-level constants deliberately stay in
 * code, per the brief's CONTENT vs ADVANCED split.
 */
import React from 'react';
import { store, sendOp } from '../api.js';
import { Icon, Field } from '../common.jsx';

export default function SettingsView() {
  const model = store.content;
  const t = model.workspaceConfig.terminals;
  const filePaths = Object.keys(model.workspaceFiles);
  const ro = model.workspaceConfig.readOnlyFiles || [];

  const patchT = (patch) => sendOp({ type: 'config.setTerminals', terminals: { ...t, ...patch } });
  const bad = !(t.min >= 1 && t.min <= t.default && t.default <= t.max && t.max <= 8);

  return (
    <div className="view">
      <div className="view-scroll" style={{ maxWidth: 680 }}>
        <div className="view-head">
          <div>
            <div className="view-title">Global Settings</div>
            <div className="view-sub">Defaults for every lesson workspace. Per-lesson overrides live in each lesson's Workspace tab.</div>
          </div>
        </div>

        <div className="view-head" style={{ marginTop: 8 }}><div className="view-title" style={{ fontSize: 14 }}><Icon name="terminal" size={14} /> Terminals</div></div>
        <div className="field-row">
          <Field label="Minimum" hint="Students can never close below this.">
            <input type="number" min={1} max={8} value={t.min} onChange={(e) => patchT({ min: Number(e.target.value) })} />
          </Field>
          <Field label="Default" hint="Open when a workspace starts.">
            <input type="number" min={1} max={8} value={t.default} onChange={(e) => patchT({ default: Number(e.target.value) })} />
          </Field>
          <Field label="Maximum" hint="The + button disables here.">
            <input type="number" min={1} max={8} value={t.max} onChange={(e) => patchT({ max: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="field-row">
          <Field label="Students can open terminals">
            <select value={t.allowCreate === false ? '0' : '1'} onChange={(e) => patchT({ allowCreate: e.target.value === '1' })}>
              <option value="1">Yes</option><option value="0">No</option>
            </select>
          </Field>
          <Field label="Terminal name prefix" hint="“Shell” → Shell 1, Shell 2…">
            <input value={t.namePrefix || 'Shell'} onChange={(e) => patchT({ namePrefix: e.target.value })} />
          </Field>
        </div>
        {bad && <div className="chip red">Invalid bounds: need 1 ≤ min ≤ default ≤ max ≤ 8 — saving is blocked until fixed.</div>}

        <div className="view-head" style={{ marginTop: 24 }}><div className="view-title" style={{ fontSize: 14 }}><Icon name="lock" size={14} /> Read-only files (all lessons)</div></div>
        <Field label="Students can open but not edit these" hint="Package scaffolding usually belongs here.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filePaths.map((p) => (
              <label key={p} className="ro-file-row">
                <input type="checkbox" checked={ro.includes(p)}
                  onChange={(e) => sendOp({
                    type: 'config.setReadOnlyFiles',
                    paths: e.target.checked ? [...ro, p] : ro.filter((x) => x !== p),
                  })} />
                {p}
              </label>
            ))}
          </div>
        </Field>

        <div className="view-head" style={{ marginTop: 24 }}><div className="view-title" style={{ fontSize: 14 }}>Advanced developer settings</div></div>
        <div className="small muted" style={{ lineHeight: 1.6 }}>
          Routing, authentication, window-manager internals, the mock shell's command set, and app registration
          are code, not content — Studio deliberately doesn't expose them. Edit those in the repo directly:
          <span className="mono"> portal/portal.js · portal/apps/learn/workspace/mock-shell.js · portal/services/auth-service.js</span>.
        </div>
      </div>
    </div>
  );
}

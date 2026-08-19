/* Student preview — an iframe onto the REAL portal (preview server, port
 * 4601) with draft data substituted. Device presets resize the frame;
 * revision changes reload it so edits appear immediately.
 */
import React, { useState } from 'react';
import { store, PREVIEW_BASE } from '../api.js';
import { Icon } from '../common.jsx';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', w: 1440, h: 900 },
  { id: 'laptop', label: 'Laptop', w: 1180, h: 740 },
  { id: 'tablet', label: 'Tablet', w: 834, h: 1050 },
  { id: 'mobile', label: 'Mobile', w: 390, h: 760 },
];

export default function PreviewPane({ path, width = 560, onClose }) {
  const [device, setDevice] = useState('desktop');
  const d = DEVICES.find((x) => x.id === device);
  const url = `${PREVIEW_BASE}${path || '/'}`;
  const scale = Math.min(1, (width - 40) / d.w);
  return (
    <div className="preview-pane" style={{ width }}>
      <div className="preview-bar">
        <span className="lbl">Preview as Student</span>
        {DEVICES.map((dev) => (
          <button key={dev.id} className={`device-btn${device === dev.id ? ' active' : ''}`}
            onClick={() => setDevice(dev.id)}>{dev.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <a className="btn ghost btn-icon" href={url} target="_blank" rel="noreferrer" title="Open in browser tab">
          <Icon name="externalLink" size={13} />
        </a>
        {onClose && (
          <button className="btn ghost btn-icon" onClick={onClose} title="Close preview">
            <Icon name="close" size={12} />
          </button>
        )}
      </div>
      <div className="preview-frame-wrap">
        <div style={{ width: d.w * scale, height: d.h * scale, overflow: 'hidden', flexShrink: 0 }}>
          <iframe
            key={`${url}@${store.revision}@${device}`}
            src={url}
            title="Student preview"
            style={{
              width: d.w, height: d.h,
              transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

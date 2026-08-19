/* Quick smoke check of the content loader — read-only. */
import { register } from 'node:module';
register('../server/esm-loader.mjs', import.meta.url);

const m = await import('../server/content-load.mjs');
const content = await m.loadContent();
console.log('sections:', content.curriculum.sections.length);
console.log('activities:', Object.keys(content.activities).length);
console.log('wsFiles:', Object.keys(content.workspaceFiles).length);
console.log('apps:', content.portalHome.apps.map((a) => a.id + ':' + a.title + (a.enabled ? '' : '(off)')).join(', '));
console.log('s1 item0:', JSON.stringify(content.curriculum.sections[0].items[0]));
console.log('s4 pad:', content.curriculum.sections[3].padStyle, '| s3 pad:', content.curriculum.sections[2].padStyle,
  '| s6 generated:', content.curriculum.sections[5].generated, 'pad:', content.curriculum.sections[5].padStyle);
const ov = content.curriculum.sections[3].items.find((i) => i.overrides);
console.log('override example:', JSON.stringify(ov));
console.log('placeholder example:', JSON.stringify(content.curriculum.sections[2].items[0]));
console.log('loc finger-curl:', JSON.stringify(content.activityLocations['finger-curl']));
console.log('icons:', m.listIconNames().length, '| images:', m.listImageAssets().length);

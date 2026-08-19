/* Orchestrates all adapters: given base model + final (draft) model,
 * produces the complete list of candidate file changes
 *   [{ path, before, after }]
 * without writing anything. Used by the diff view, the preview server
 * (serving draft-applied sources), and the save pipeline.
 */
import { readRepoFile, repoFileExists } from './repo.mjs';
import { syntaxCheck, deepEqual } from './ast-utils.mjs';
import { writeCurriculum } from './adapters/curriculum-writer.mjs';
import { writeLearningPath } from './adapters/learning-path-writer.mjs';
import { writeWorkspaceFiles } from './adapters/workspace-files-writer.mjs';
import { generateWorkspaceConfig } from './adapters/workspace-config-writer.mjs';
import { writePortalOrder, writeAppMeta, APP_FILES } from './adapters/portal-home-writer.mjs';

export function generateChanges(baseModel, finalModel) {
  const changes = [];
  const push = (path, before, after) => {
    if (after !== null && after !== before) changes.push({ path, before, after });
  };

  /* curriculum.js */
  {
    const path = 'portal/data/curriculum.js';
    const before = readRepoFile(path);
    push(path, before, writeCurriculum(before, baseModel, finalModel));
  }

  /* learning-path.js */
  {
    const path = 'portal/data/learning-path.js';
    const before = readRepoFile(path);
    push(path, before, writeLearningPath(before, baseModel, finalModel));
  }

  /* workspace-files.js */
  {
    const path = 'portal/data/workspace-files.js';
    const before = readRepoFile(path);
    push(path, before, writeWorkspaceFiles(before, baseModel, finalModel));
  }

  /* workspace-config.js — regenerate whenever the config differs from base,
   * or the file doesn't exist yet but config differs from defaults. */
  {
    const path = 'portal/data/workspace-config.js';
    const exists = repoFileExists(path);
    const before = exists ? readRepoFile(path) : '';
    if (!deepEqual(baseModel.workspaceConfig, finalModel.workspaceConfig) || !exists) {
      const after = generateWorkspaceConfig(finalModel.workspaceConfig);
      // When the file doesn't exist and config still equals defaults, only
      // materialize it if something actually references it (Phase 7 wires
      // the portal to import it; from then on `exists` is true).
      if (exists || !deepEqual(baseModel.workspaceConfig, finalModel.workspaceConfig)) {
        push(path, before, after);
      }
    }
  }

  /* portal.js (desktop icon order/visibility) */
  {
    const path = 'portal/portal.js';
    const before = readRepoFile(path);
    const after = writePortalOrder(before, baseModel, finalModel);
    if (after !== null) push(path, before, after);
  }

  /* app meta modules */
  for (const finalApp of finalModel.portalHome.apps) {
    const baseApp = baseModel.portalHome.apps.find((a) => a.id === finalApp.id);
    if (!baseApp) continue;
    const path = APP_FILES[finalApp.id];
    const before = readRepoFile(path);
    const after = writeAppMeta(before, baseApp, finalApp);
    if (after !== null) push(path, before, after);
  }

  /* Every candidate must parse — catch generator bugs before anything is
   * written or previewed. */
  for (const c of changes) syntaxCheck(c.after, c.path);

  return changes;
}

/* Reconciles the normalized ACTIVITY CONTENT (base vs final) into
 * portal/data/learning-path.js source edits.
 *
 * Only activities that actually changed are touched. Within a changed
 * activity, only changed properties are rewritten; steps are matched by id
 * (moves keep their AST nodes and comments), and blocks are matched by
 * deep-equality so a pure reorder moves nodes instead of rebuilding them.
 * An edited block is rebuilt as one fresh literal — the git diff shows it
 * as a single-block replacement.
 */
import { parse, print, b, findExportConst, objProp, objPropValue, setObjProp, staticString, valueToNode, deepEqual, nodeToValue } from '../ast-utils.mjs';

const ACTIVITY_SCALARS = ['title', 'kind', 'difficulty', 'estimatedTime', 'summary', 'workspaceFile'];

function activityNodeFromValue(a) {
  const props = { id: a.id, title: a.title, kind: a.kind };
  if (a.difficulty !== undefined && a.difficulty !== null) props.difficulty = a.difficulty;
  if (a.estimatedTime !== undefined) props.estimatedTime = a.estimatedTime;
  if (a.summary !== undefined) props.summary = a.summary;
  if (a.workspaceFile !== undefined) props.workspaceFile = a.workspaceFile;
  if (a.relatedConcepts !== undefined) props.relatedConcepts = a.relatedConcepts;
  props.steps = a.steps;
  if (a.completionSummary !== undefined) props.completionSummary = a.completionSummary;
  return valueToNode(props);
}

function stepNodeFromValue(st) {
  return valueToNode({ id: st.id, title: st.title, blocks: st.blocks });
}

/** Reconcile one activity's existing object node against its final value. */
function patchActivityNode(node, baseA, finalA) {
  for (const key of ACTIVITY_SCALARS) {
    const bv = baseA ? baseA[key] : undefined;
    if (!deepEqual(bv, finalA[key])) {
      setObjProp(node, key, finalA[key] === null ? undefined : finalA[key]);
    }
  }
  if (!deepEqual(baseA && baseA.relatedConcepts, finalA.relatedConcepts)) {
    setObjProp(node, 'relatedConcepts', finalA.relatedConcepts);
  }
  if (!deepEqual(baseA && baseA.completionSummary, finalA.completionSummary)) {
    setObjProp(node, 'completionSummary', finalA.completionSummary);
  }

  if (!deepEqual(baseA && baseA.steps, finalA.steps)) {
    const stepsArr = objPropValue(node, 'steps');
    const existingSteps = new Map();
    if (stepsArr && stepsArr.type === 'ArrayExpression') {
      for (const el of stepsArr.elements) {
        const id = staticString(objPropValue(el, 'id'));
        if (id) existingSteps.set(id, el);
      }
    }
    const baseSteps = new Map((baseA ? baseA.steps : []).map((s) => [s.id, s]));
    const finalEls = finalA.steps.map((finalStep) => {
      const el = existingSteps.get(finalStep.id);
      const baseStep = baseSteps.get(finalStep.id);
      if (!el) return stepNodeFromValue(finalStep);
      if (!baseStep || baseStep.title !== finalStep.title) setObjProp(el, 'title', finalStep.title);
      if (!baseStep || !deepEqual(baseStep.blocks, finalStep.blocks)) {
        patchBlocksArray(el, baseStep ? baseStep.blocks : [], finalStep.blocks);
      }
      return el;
    });
    if (stepsArr && stepsArr.type === 'ArrayExpression') stepsArr.elements = finalEls;
    else setObjProp(node, 'steps', finalA.steps);
  }
}

/** Blocks have no ids — match final blocks to existing AST elements by deep
 * value equality (each existing node used at most once), so reorders MOVE
 * nodes and only genuinely-changed blocks are rebuilt. */
function patchBlocksArray(stepEl, baseBlocks, finalBlocks) {
  const blocksProp = objProp(stepEl, 'blocks');
  if (!blocksProp || blocksProp.value.type !== 'ArrayExpression') {
    setObjProp(stepEl, 'blocks', finalBlocks);
    return;
  }
  const arr = blocksProp.value;
  const used = new Set();
  const valueOf = (el) => {
    const r = nodeToValue(el);
    return r.ok ? r.value : Symbol('dynamic');
  };
  const existing = arr.elements.map((el) => ({ el, value: valueOf(el) }));
  arr.elements = finalBlocks.map((blk) => {
    for (let i = 0; i < existing.length; i++) {
      if (!used.has(i) && typeof existing[i].value !== 'symbol' && deepEqual(existing[i].value, blk)) {
        used.add(i);
        return existing[i].el;
      }
    }
    return valueToNode(blk);
  });
}

export function writeLearningPath(source, baseModel, finalModel) {
  const baseActs = baseModel.activities;
  const finalActs = finalModel.activities;
  const finalLocs = finalModel.activityLocations;
  if (deepEqual(baseActs, finalActs)) return source;

  const ast = parse(source);
  const lpExpr = findExportConst(ast, 'LEARNING_PATH');
  const levelsArr = objPropValue(lpExpr, 'levels');

  /* Index: activity id -> { node, activitiesArr }, level id -> level node. */
  const actIndex = new Map();
  const levelNodes = new Map();
  const sectionArrs = new Map(); // `${levelId}/${sectionId}` -> activities ArrayExpression
  for (const levelEl of levelsArr.elements) {
    const levelId = staticString(objPropValue(levelEl, 'id'));
    levelNodes.set(levelId, levelEl);
    const sectionsArr = objPropValue(levelEl, 'sections');
    if (!sectionsArr || sectionsArr.type !== 'ArrayExpression') continue;
    for (const sectionEl of sectionsArr.elements) {
      const sectionId = staticString(objPropValue(sectionEl, 'id'));
      const actsArr = objPropValue(sectionEl, 'activities');
      if (!actsArr || actsArr.type !== 'ArrayExpression') continue;
      sectionArrs.set(`${levelId}/${sectionId}`, actsArr);
      for (const actEl of actsArr.elements) {
        const id = staticString(objPropValue(actEl, 'id'));
        if (id) actIndex.set(id, { node: actEl, arr: actsArr });
      }
    }
  }

  /* ---- removals ---- */
  for (const id of Object.keys(baseActs)) {
    if (finalActs[id]) continue;
    const entry = actIndex.get(id);
    if (entry) {
      entry.arr.elements = entry.arr.elements.filter((el) => el !== entry.node);
      actIndex.delete(id);
    }
  }

  /* ---- edits + additions ---- */
  for (const [id, finalA] of Object.entries(finalActs)) {
    const baseA = baseActs[id];
    const entry = actIndex.get(id);
    if (entry) {
      if (!deepEqual(baseA, finalA)) patchActivityNode(entry.node, baseA, finalA);
      continue;
    }
    // New activity — find (or create) its target activities array.
    const arr = resolveTargetArray(finalLocs[id], id, finalModel, sectionArrs, levelsArr, actIndex);
    arr.elements.push(activityNodeFromValue(finalA));
  }

  return print(ast);
}

/** Target array for a new activity: explicit location if it exists, else the
 * array of a listed neighbor in the same curriculum section, else a fresh
 * level+section named after the curriculum section (appended at the end). */
function resolveTargetArray(loc, activityId, finalModel, sectionArrs, levelsArr, actIndex) {
  if (loc && loc.levelId && loc.sectionId) {
    const key = `${loc.levelId}/${loc.sectionId}`;
    if (sectionArrs.has(key)) return sectionArrs.get(key);
  }
  // Neighbor search in the final curriculum listing.
  for (const section of finalModel.curriculum.sections) {
    const ids = section.items.map((i) => i.id);
    if (!ids.includes(activityId)) continue;
    for (const otherId of ids) {
      if (otherId === activityId) continue;
      const other = actIndex.get(otherId);
      if (other) return other.arr;
    }
    // No located neighbor — create a level+section for this curriculum section.
    return createLevelSection(levelsArr, sectionArrs, section);
  }
  // Not listed anywhere (shouldn't happen for adds) — last existing array.
  const arrs = [...sectionArrs.values()];
  if (!arrs.length) throw new Error('learning-path.js has no activities arrays to insert into');
  return arrs[arrs.length - 1];
}

function createLevelSection(levelsArr, sectionArrs, curriculumSection) {
  const levelId = `${curriculumSection.id}-content`;
  const key = `${levelId}/${curriculumSection.id}`;
  if (sectionArrs.has(key)) return sectionArrs.get(key);
  const actsArr = b.arrayExpression([]);
  const sectionObj = valueToNode({
    id: curriculumSection.id,
    title: curriculumSection.title,
    difficulty: null,
    estimatedTime: '',
    description: curriculumSection.description || '',
  });
  sectionObj.properties.push(b.objectProperty(b.identifier('activities'), actsArr));
  const levelObj = valueToNode({
    id: levelId,
    number: levelsArr.elements.length + 1,
    title: curriculumSection.title,
    description: `Content for the ${curriculumSection.title} section.`,
  });
  levelObj.properties.push(b.objectProperty(b.identifier('sections'), b.arrayExpression([sectionObj])));
  levelsArr.elements.push(levelObj);
  sectionArrs.set(key, actsArr);
  return actsArr;
}

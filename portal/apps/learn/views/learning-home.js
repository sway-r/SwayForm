import { icon } from '../../../icons.js';
import { LEARNING_PATH, findActivity } from '../../../data/learning-path.js';
import { getCurrentActivity, getCompletedActivities } from '../../../services/progress-service.js';
import { applyReadingTheme } from '../../../theme.js';

function diffTag(difficulty){
  if (!difficulty) return '';
  return `<span class="diff-tag ${difficulty}">${difficulty}</span>`;
}

export function mount(container, nav, ctx){
  const root = document.createElement('div');
  root.className = 'lh-root p-scroll content-surface';
  container.appendChild(root);
  applyReadingTheme(root);

  root.innerHTML = `
    <div class="lh-header">
      <h1>My Learning</h1>
      <div class="lh-search-wrap">
        <span class="lh-search-icon">${icon('search')}</span>
        <input type="text" class="lh-search" placeholder="Search activities, concepts…" autocomplete="off" spellcheck="false">
      </div>
    </div>
    <div data-continue></div>
    <div data-path></div>`;

  const continueEl = root.querySelector('[data-continue]');
  const pathEl = root.querySelector('[data-path]');
  const searchInput = root.querySelector('.lh-search');

  let completedIds = [];

  async function renderContinue(){
    const current = await getCurrentActivity();
    completedIds = await getCompletedActivities();
    const entry = current ? findActivity(current.activityId) : null;
    const totalActivities = LEARNING_PATH.levels.reduce((n, l) => n + l.sections.reduce((m, s) => m + s.activities.length, 0), 0);

    if (entry){
      continueEl.innerHTML = `
        <div class="lh-continue">
          <div>
            <div class="lh-continue-eyebrow">Continue Learning</div>
            <div class="lh-continue-title">${entry.activity.title}</div>
            <div class="lh-continue-sub">Level ${entry.level.number} · ${entry.section.title}</div>
            <div class="lh-continue-progress">
              <span class="lh-continue-bar"><span style="width:${totalActivities ? (completedIds.length / totalActivities * 100) : 0}%"></span></span>
              <span class="lh-continue-progress-text">${completedIds.length} / ${totalActivities} complete</span>
            </div>
          </div>
          <button type="button" class="p-btn primary lh-continue-btn" data-resume>${icon('arrowRight')}<span>Resume</span></button>
        </div>`;
      continueEl.querySelector('[data-resume]').addEventListener('click', () => nav.activity(entry.activity.id));
    } else {
      const first = LEARNING_PATH.levels[0].sections[0].activities[0];
      continueEl.innerHTML = `
        <div class="lh-continue">
          <div>
            <div class="lh-continue-eyebrow">SwayForm Fundamentals</div>
            <div class="lh-continue-title">Start with Foundations</div>
            <div class="lh-continue-sub">${LEARNING_PATH.levels.length} levels, built around real robot behaviors.</div>
          </div>
          <button type="button" class="p-btn primary lh-continue-btn" data-start>${icon('arrowRight')}<span>Start Learning</span></button>
        </div>`;
      continueEl.querySelector('[data-start]').addEventListener('click', () => nav.activity(first.id));
    }
  }

  function renderPath(filter){
    const q = (filter || '').trim().toLowerCase();
    pathEl.innerHTML = '';
    LEARNING_PATH.levels.forEach((level) => {
      const levelEl = document.createElement('div');
      levelEl.className = 'lh-level';
      levelEl.innerHTML = `
        <div class="lh-level-hdr"><span class="lh-level-num">Level ${level.number}</span><h2>${level.title}</h2></div>
        <p class="lh-level-desc">${level.description}</p>
        <div class="lh-sections"></div>`;
      const sectionsEl = levelEl.querySelector('.lh-sections');

      level.sections.forEach((section) => {
        if (!section.activities.length && section.comingSoon){
          const match = !q || section.title.toLowerCase().includes(q) || section.comingSoon.some((c) => c.title.toLowerCase().includes(q));
          const block = document.createElement('div');
          block.className = 'lh-coming' + (match ? '' : ' lh-row-dim');
          block.innerHTML = `
            <div class="lh-coming-title">${section.title}</div>
            <div class="lh-coming-desc">${section.description}</div>
            <div class="lh-coming-list">${section.comingSoon.map((c) => `<div class="lh-coming-item">${icon('lock')}<span><strong>${c.title}</strong> — ${c.note}</span></div>`).join('')}</div>`;
          sectionsEl.appendChild(block);
          return;
        }

        const doneCount = section.activities.filter((a) => completedIds.includes(a.id)).length;
        const corpus = (section.title + ' ' + section.description + ' ' + section.activities.map((a) => a.title + ' ' + (a.relatedConcepts || []).join(' ')).join(' ')).toLowerCase();
        const match = !q || corpus.includes(q);

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'lh-section-row' + (match ? '' : ' lh-row-dim');
        row.innerHTML = `
          <div class="lh-section-row-main">
            <div class="lh-section-title">${section.title}</div>
            <div class="lh-section-desc">${section.description}</div>
          </div>
          <div class="lh-section-meta">
            ${diffTag(section.difficulty)}
            <span class="lh-section-time">${section.estimatedTime || ''}</span>
            <span class="lh-section-progress">${doneCount} / ${section.activities.length}</span>
            <span class="lh-section-chevron">${icon('chevronRight')}</span>
          </div>`;
        row.addEventListener('click', () => nav.section(section.id));
        sectionsEl.appendChild(row);
      });

      pathEl.appendChild(levelEl);
    });
  }

  searchInput.addEventListener('input', () => renderPath(searchInput.value));

  renderContinue().then(() => renderPath(''));

  return {
    unmount(){},
  };
}

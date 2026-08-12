import * as LearningHome from './views/learning-home.js';
import * as SectionView from './views/section-view.js';
import * as ActivityWorkspace from './views/activity-workspace.js';
import * as CurriculumIndex from './curriculum-index.js';

export const meta = {
  id: 'learn',
  title: 'Learn',
  icon: 'learn',
  defaultSize: { w: 1180, h: 760 },
};

export function mount(container, ctx){
  container.innerHTML = '<div class="learn-shell" data-shell><div class="learn-view" data-view></div></div>';
  const shellEl = container.querySelector('[data-shell]');
  const viewEl = container.querySelector('[data-view]');
  let current = null; // { name, instance }
  let currentItemId = null;
  let currentSectionId = null; // set on Section view too, so the drawer can auto-expand a section the student is just browsing, not only one containing an in-progress activity

  const indexApi = CurriculumIndex.mount(shellEl, {
    getCurrentItemId: () => currentItemId,
    getCurrentSectionId: () => currentSectionId,
    onNavigate(dest){
      if (dest.type === 'section') nav.section(dest.id);
      else nav.activity(dest.id);
    },
  });

  const nav = {
    home(){ go({ view: 'home' }); },
    section(sectionId){ go({ view: 'section', sectionId }); },
    activity(activityId, stepIndex){ go({ view: 'activity', activityId, stepIndex }); },
    toggleIndex(){ indexApi.toggle(); },
  };

  function go(params){
    currentItemId = params.activityId || null;
    currentSectionId = params.sectionId || null;
    render(params);
    ctx.navigate(null, params);
    indexApi.refresh();
  }

  function render(params){
    if (current && current.instance && typeof current.instance.unmount === 'function') current.instance.unmount();
    viewEl.innerHTML = '';

    const view = params.view || 'home';
    if (view === 'section' && params.sectionId){
      current = { name: 'section', instance: SectionView.mount(viewEl, { sectionId: params.sectionId }, nav, ctx) };
    } else if (view === 'activity' && params.activityId){
      current = { name: 'activity', instance: ActivityWorkspace.mount(viewEl, { activityId: params.activityId, stepIndex: params.stepIndex }, nav, ctx) };
    } else {
      current = { name: 'home', instance: LearningHome.mount(viewEl, nav, ctx) };
    }
  }

  ctx.setAppTitle && ctx.setAppTitle('Learn');
  render({ view: 'home' });

  return {
    onParams(params){
      currentItemId = (params && params.activityId) || null;
      currentSectionId = (params && params.sectionId) || null;
      render(params || { view: 'home' });
      indexApi.refresh();
    },
    unmount(){
      if (current && current.instance && typeof current.instance.unmount === 'function') current.instance.unmount();
      indexApi.destroy();
    },
  };
}

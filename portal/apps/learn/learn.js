import * as LearningHome from './views/learning-home.js';
import * as SectionView from './views/section-view.js';
import * as ActivityWorkspace from './views/activity-workspace.js';

export const meta = {
  id: 'learn',
  title: 'Learn',
  icon: 'learn',
  defaultSize: { w: 1180, h: 760 },
};

export function mount(container, ctx){
  container.innerHTML = '<div class="learn-shell" data-shell></div>';
  const shellEl = container.querySelector('[data-shell]');
  let current = null; // { name, instance }

  const nav = {
    home(){ go({ view: 'home' }); },
    section(sectionId){ go({ view: 'section', sectionId }); },
    activity(activityId, stepIndex){ go({ view: 'activity', activityId, stepIndex }); },
  };

  function go(params){
    render(params);
    ctx.navigate(null, params);
  }

  function render(params){
    if (current && current.instance && typeof current.instance.unmount === 'function') current.instance.unmount();
    shellEl.innerHTML = '';

    const view = params.view || 'home';
    if (view === 'section' && params.sectionId){
      current = { name: 'section', instance: SectionView.mount(shellEl, { sectionId: params.sectionId }, nav, ctx) };
    } else if (view === 'activity' && params.activityId){
      current = { name: 'activity', instance: ActivityWorkspace.mount(shellEl, { activityId: params.activityId, stepIndex: params.stepIndex }, nav, ctx) };
    } else {
      current = { name: 'home', instance: LearningHome.mount(shellEl, nav, ctx) };
    }
  }

  ctx.setAppTitle && ctx.setAppTitle('Learn');
  render({ view: 'home' });

  return {
    onParams(params){ render(params || { view: 'home' }); },
    unmount(){
      if (current && current.instance && typeof current.instance.unmount === 'function') current.instance.unmount();
    },
  };
}

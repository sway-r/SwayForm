/* One message per unmet Queue on Robot gate of a lab (activity.robotGate), or [] when clear. An admin still has to approve the job. */
export async function unmetRobotGates(activity, read, getCompleted){
  const gate = activity.robotGate;
  if (!gate) return [];
  const unmet = [];
  if ((gate.needsComplete || []).length){
    // If progress can't be loaded, nothing counts as complete, so the gate stays shut.
    const done = new Set(await getCompleted().catch(() => []));
    gate.needsComplete.forEach((g) => { if (!done.has(g.id)) unmet.push(g.text); });
  }
  (gate.needsNoTodos || []).forEach((g) => {
    if (/#\s*TODO/i.test(read(g.path) || '')) unmet.push(g.text);
  });
  return unmet;
}

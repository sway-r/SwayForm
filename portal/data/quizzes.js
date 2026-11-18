/* Every quiz in the course, in curriculum order: the Grades app's columns, and what /api/progress accepts results for. */
import { CURRICULUM } from './curriculum.js';

export const QUIZZES = CURRICULUM.sections.flatMap((section) => section.items.flatMap((item) => (item.steps || [])
  .flatMap((step) => step.blocks.filter((b) => b.type === 'quiz'))
  .map((b) => ({
    id: b.id, title: b.title, passPercent: b.passPercent, count: Math.min(b.count, b.questions.length),
    itemId: item.id, itemNumber: item.number, itemTitle: item.title,
    group: item.group ? item.group.title : section.title,
  }))));

export function findQuiz(id){
  return QUIZZES.find((q) => q.id === id) || null;
}

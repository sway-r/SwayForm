/* SwayForm Learning Portal — mock seed data for the frontend-only Account app.
   Entirely fictional / mocked: no real auth, no real student record. Progress
   totals are chosen to stay internally consistent with the Learning Hub
   curriculum as ported: 3 Start Here lessons (Getting Started, Classroom
   Workflow, Safety Notes) + 4 Setup lessons (VS Code, SSH, Student Projects,
   Validation & Queue) + 5 Demos = 12 pre-lab lessons total, and 10 available
   Student Labs (Level 1 — Control), matching swayform_labs' package.xml. */

export const ACCOUNT_MOCK = {
  studentName: "Jordan Alvarez",
  accountId: "SF-2026-0142",
  school: "Riverbend High School — Robotics Club",
  role: "Student",
  plan: "Learning Hub — Free",
  memberSince: "2026-02-10",
  progress: {
    lessonsCompleted: 7,
    totalLessons: 12,
    labsCompleted: 3,
    totalLabs: 10,
    demosViewed: 5,
    totalDemos: 5,
  },
  comingSoon: [
    {
      label: "School Organization",
      description: "Join your class or school's account to share progress with an instructor, coming with school accounts.",
    },
    {
      label: "Instructor Review",
      description: "Get structured feedback from a teacher on submitted labs, coming with school accounts.",
    },
    {
      label: "Google Sign-In",
      description: "Sign in with your school Google account instead of a mock profile.",
    },
    {
      label: "Subscription & Billing",
      description: "Manage a paid Learning Hub plan and billing details once commercial plans, including any included free months, are available.",
    },
  ],
};

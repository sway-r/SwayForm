/* SwayForm Learning Portal — mock seed data for the frontend-only Account app.
   Entirely fictional / mocked: no real auth, no real student record. The
   `progress` block below is NOT read anywhere — account.js computes real
   progress live from labTotals()/sectionProgress() in curriculum.js — but is
   kept internally consistent with that curriculum for readability: 5 Getting
   Started + 9 Introduction to ROS 2 lessons, 5 Pre-Installed Demos, and 10
   Control (Level 1) labs. */

export const ACCOUNT_MOCK = {
  studentName: "Jordan Alvarez",
  accountId: "SF-2026-0142",
  school: "Riverbend High School — Robotics Club",
  role: "Student",
  plan: "Learning Hub — Free",
  memberSince: "2026-02-10",
  progress: {
    lessonsCompleted: 9,
    totalLessons: 14,
    labsCompleted: 3,
    totalLabs: 10,
    demosViewed: 2,
    totalDemos: 5,
  },
  comingSoon: [
    {
      label: "School Organization",
      description: "Join your class or school's account to share progress with an instructor, coming with school accounts.",
    },
    {
      label: "Instructor Review",
      description: "Get structured feedback from a teacher on your labs, coming with school accounts.",
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

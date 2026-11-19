/*
 * SwayForm canonical product facts.
 * This is the single source of truth for numbers/status that appear in
 * multiple places across the site. Static copy on every page is written
 * to MATCH these values by hand (this is a static HTML site with no build
 * step, so text can't be templated at request time), when a number below
 * changes, grep the site for the old value and update copy to match.
 *
 * Also runs small on-page sync tasks (copyright year) that are safe to
 * drive from JS on every page.
 */
window.SWAYFORM = {
  labs: {
    availableNow: 10,
    plannedTotal: 140,
    plannedTotalWithRobot: 340,
    robotBasedLabs: 200,
    statusLine: "Twenty foundation labs, then behavior sections of 6–12 labs each: 15+ projected in the Learning Portal, 35+ with the robot.",
    plannedSections: 15,
    plannedSectionsWithRobot: 35,
    sections: ["Getting Started", "Introduction to ROS 2", "Pre-Installed Demos", "Foundation Labs", "Behavior Sections"]
  },
  demos: {
    count: 5,
    names: ["Wave", "Handshake", "Fist Bump", "Finger Count", "Target Lock"]
  },
  audience: {
    summary: "Schools.",
    tracks: ["Middle School", "High School"],
    tracksNote: "Two curriculums at different difficulty levels, with overlapping features and skills, that connect together at the end of the path. Planned."
  },
  robot: {
    degreesOfFreedom: 21,
    studentCapacity: "Designed for teams of up to 15 students using rotating engineering roles."
  },
  pricing: {
    learningPortalPackage: "Learning Portal: $1,000 per year, no deposit. 140+ labs (projected), quizzes, assessments and browser simulation, up to 60 students, no robot.",
    standardPackage: "Standard School Package: $7,000 ($1,000 deposit + $6,000). Robot with AI vision and human-like hands, 340+ labs (projected, 200 robot-based), lifetime Learning Portal, simulation and Cloud Classroom free for 3 years.",
    afterYear3: "Cloud Classroom $149 per year (15 active, 60 enrolled); simulation optional at $500 per year; Learning Portal stays included for life.",
    robotPrice: "$7,000 per unit"
  },
  timeline: {
    pilotStatus: "Pilot interest is currently open.",
    commercialLaunchTarget: "Fall 2027"
  },
  contact: {
    salesEmail: "contact@swayform.net",
    supportEmail: "support@swayform.net"
  }
};

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".copy-year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
});

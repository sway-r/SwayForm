/*
 * SwayForm canonical product facts.
 * This is the single source of truth for numbers/status that appear in
 * multiple places across the site. Static copy on every page is written
 * to MATCH these values by hand (this is a static HTML site with no build
 * step, so text can't be templated at request time) — when a number below
 * changes, grep the site for the old value and update copy to match.
 *
 * Also runs small on-page sync tasks (copyright year) that are safe to
 * drive from JS on every page.
 */
window.SWAYFORM = {
  labs: {
    availableNow: 10,
    plannedTotal: 100,
    statusLine: "Begin with 10 structured labs, with the curriculum expanding to around 100 across four levels.",
    sections: ["Getting Started", "Introduction to ROS 2", "Pre-Installed Demos", "Control (Level 1)", "React (Level 2)", "Perceive (Level 3)", "Create (Level 4)"]
  },
  demos: {
    count: 5,
    names: ["Wave", "Handshake", "Fist Bump", "Finger Count", "Target Lock"]
  },
  audience: {
    summary: "Schools — including, but not limited to, high schools and middle schools.",
    tracks: ["Middle School", "High School"],
    tracksNote: "Two curriculums at different difficulty levels, with overlapping features and skills, that connect together at the end of the path. Planned."
  },
  robot: {
    degreesOfFreedom: 21,
    studentCapacity: "Designed for teams of up to 15 students using rotating engineering roles."
  },
  pricing: {
    robotPrice: "$6,999.99 per unit",
    cloudSubscription: "$12 per month or $100 per year, first year free with every purchase.",
    cloudPlanTiersHidden: "Classroom Hosting / Standard / Premium tiers hidden site-wide since 2026-09-23; their markup is kept in an HTML comment on for-schools.html."
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

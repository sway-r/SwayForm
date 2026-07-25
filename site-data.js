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
    plannedTotal: 40,
    statusLine: "Begin with 10 structured labs, with the curriculum expanding to 40."
  },
  demos: {
    count: 5,
    names: ["Wave", "Handshake", "Pick and Place", "Rock Paper Scissors", "Interactive Exchange"]
  },
  robot: {
    degreesOfFreedom: 21,
    studentCapacity: "Designed for teams of up to 15 students using rotating engineering roles."
  },
  pricing: {
    robotPrice: "Contact Sales",
    premiumFreeMonthsIncluded: 6,
    premiumAnnualPriceNote: "Annual premium curriculum pricing will be announced before commercial release."
  },
  timeline: {
    pilotStatus: "Pilot interest is currently open.",
    commercialLaunchTarget: "Fall 2027"
  },
  contact: {
    salesEmail: "contact@swayform.net"
  }
};

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".copy-year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
});

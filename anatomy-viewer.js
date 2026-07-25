/*
 * Shared Interactive Anatomy controller — used by both index.html (homepage)
 * and robot.html. Single source of truth for part data, video/image assets,
 * and the transition state machine, so the two pages cannot drift apart.
 *
 * Each page keeps its own existing element IDs/classes (they differ slightly
 * for historical reasons) and passes them in via a config object to
 * SwayFormAnatomy.create(cfg).init().
 */
(function () {
  'use strict';

  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── Part definitions — single source of truth for both pages ── */
  var PARTS = [
    { id: 'head',
      label: 'Head', xPercent: 50, yPercent: 27, labelSide: 'r',
      videoGroup: 'head', finalImage: 'images/head.png',
      title: 'Head System', category: 'Vision + Head System',
      description: 'The head unit integrates the Intel RealSense D435i depth camera with a 2-DOF pan/tilt neck (neck_yaw and neck_pitch). Together they enable object tracking, proximity sensing, and feedback-driven behaviors — all from code students write themselves.',
      learns: ['How RGB and depth image streams are published as separate ROS topics', 'Proportional controllers and why dead zones prevent jitter in pan/tilt systems', 'HSV color segmentation vs depth-based proximity detection', 'How camera feedback loops drive physical joint movement in real time'] },

    { id: 'shoulder',
      label: 'Shoulder', xPercent: 73, yPercent: 43, labelSide: 'l',
      videoGroup: 'shoulder', finalImage: 'images/shoulder.png',
      title: 'Shoulder Joint', category: 'High-Torque Joint',
      description: 'MG996R servo providing shoulder_pitch (forward/backward arm swing). The highest load-bearing joint in the arm chain. Students quickly discover that commanding the shoulder to an extreme position while the elbow is extended creates significant torque on the servo.',
      learns: ['Why mechanical load matters — not just angle range', 'How joint limits interact with each other in a chain', 'The importance of motion sequencing order', 'Torque vs. speed tradeoffs in servo selection'] },

    { id: 'arm',
      label: 'Arm', xPercent: 78, yPercent: 50, labelSide: 'l',
      videoGroup: 'arm', finalImage: 'images/Arm.png',
      title: 'Arm System', category: 'Multi-Joint Arm',
      description: 'The arm chain spans shoulder, elbow, and wrist — three servos that work together to position the hand. Students discover how joint order matters: moving the shoulder with the elbow extended produces very different torque than moving them in sequence.',
      learns: ['Multi-joint coordination and timing', 'Mechanical advantage and why elbow angle affects shoulder load', 'Keyframe interpolation across a joint chain', 'Safe range design for compound motion'] },

    { id: 'fingers',
      label: 'Hand / Fingers', xPercent: 16, yPercent: 16, labelSide: 'r',
      videoGroup: 'hand', finalImage: 'images/hand.png',
      title: 'Five-Finger Hand', category: 'Fine Motor',
      description: 'Five MG90S servos — one per finger — each independently addressed via separate joints. All five can receive commands in a single message or be addressed individually. First example students encounter of commanding many joints at once.',
      learns: ['Individual joint addressing within a single message type', 'Simultaneous multi-joint commands vs sequential', 'Servo driver channel assignment', 'Fine PWM precision requirements at low-torque joints'] },

    { id: 'electronics',
      label: 'Electronics', xPercent: 50, yPercent: 59, labelSide: 'r',
      videoGroup: 'electronics', finalImage: 'images/swayform_robot_2.png',
      title: 'Raspberry Pi 5 + Electronics', category: 'Compute + Control',
      description: 'Raspberry Pi 5 (8 GB) running Linux and a ROS 2-based software stack. Servo drivers on the I²C bus. A 12V bus bar distributes power to a dedicated 5V buck converter for the Pi and two separate 6V buck converters for the servo groups. Everything is accessible, labeled, and replaceable — no black boxes.',
      learns: ['Onboard Linux compute and why it runs ROS natively', 'I²C bus, device addressing, and how the servo driver is configured', 'Regulated power architecture — separate rails for compute and servos, plus a direct 12V motor line', 'SSH workflow — how students connect and deploy code'] },

    { id: 'base',
      label: 'Base', xPercent: 50, yPercent: 80, labelSide: 'r',
      videoGroup: 'base', finalImage: 'images/Base.png',
      title: 'Rotating Base', category: 'Actuated Base',
      description: 'DC motor with encoder driving a belt/pulley system for torso yaw rotation, powered directly from the 12V bus rather than through a servo buck converter. Different from the servo-driven arm joints — uses encoder feedback instead of PWM position control. Students encounter DC motor control as a distinct system from servo control.',
      learns: ['DC motor control vs servo control — different command interfaces', 'Encoder feedback and position estimation', 'Belt/pulley mechanical advantage and backlash', 'Why actuator type selection matters at the design stage'] }
  ];

  /* ── Video paths — all files live in transition/ (CamelCase) ── */
  var VIDEOS = {
    overview_to_head: 'transition/OverviewToHead.mp4',
    head_to_overview: 'transition/HeadToOverview.mp4',
    overview_to_shoulder: 'transition/OverviewToShoulder.mp4',
    shoulder_to_overview: 'transition/ShoulderToOverview.mp4',
    overview_to_arm: 'transition/OverviewToArm.mp4',
    arm_to_overview: 'transition/ArmToOverview.mp4',
    overview_to_hand: 'transition/OverviewToHand.mp4',
    hand_to_overview: 'transition/HandToOverview.mp4',
    overview_to_base: 'transition/OverviewToBase.mp4',
    base_to_overview: 'transition/BaseToOverview.mp4',
    overview_to_electronics: 'transition/OverviewToElectronics.mp4', /* not yet on disk — falls back to fade */
    electronics_to_overview: 'transition/ElectronicsToOverview.mp4'  /* not yet on disk — falls back to fade */
  };

  /* ── Final still image per video group ── */
  var GROUP_IMAGES = {
    overview: 'images/RobotOverview.png',
    head: 'images/head.png',
    shoulder: 'images/shoulder.png',
    arm: 'images/Arm.png', /* elbow + wrist share the arm group/still */
    hand: 'images/hand.png',
    base: 'images/Base.png',
    electronics: 'images/swayform_robot_2.png'
  };

  /**
   * Create an independent anatomy viewer instance bound to one page's DOM.
   * cfg: {
   *   frameId, stillId, videoId, hotspotLayerId, overviewBtnId, loaderId,
   *   panelId, detailSlotId, defaultPanelId,
   *   hotspotClass, hotspotIdPrefix, labelClass, labelSidePrefix,
   *   detailLabelClass, learnsLabelClass, learnsListClass,
   *   logPrefix
   * }
   */
  function create(cfg) {
    var log = cfg.logPrefix || '[anatomy]';
    var viewer = { group: 'overview', transitioning: false, partId: null };

    function $(id) { return document.getElementById(id); }

    function showLoading(on) {
      var el = $(cfg.loaderId);
      if (el) el.style.display = on ? 'block' : 'none';
    }

    function preloadAssets() {
      var seen = {};
      Object.keys(GROUP_IMAGES).forEach(function (k) {
        var src = GROUP_IMAGES[k];
        if (!seen[src]) { seen[src] = true; var img = new Image(); img.src = src; }
      });
      if (REDUCED_MOTION) return; /* reduced motion never plays video, so never preload it */
      Object.keys(VIDEOS).forEach(function (k) {
        var pv = document.createElement('video');
        pv.muted = true; pv.preload = 'auto'; pv.src = VIDEOS[k];
        pv.load();
      });
    }

    function fadeToStill(src, cb) {
      var el = $(cfg.stillId);
      if (!el) { if (cb) cb(); return; }
      if (REDUCED_MOTION) {
        el.src = src;
        if (cb) cb();
        return;
      }
      el.style.transition = 'opacity .28s ease';
      el.style.opacity = '0';
      setTimeout(function () {
        el.src = src;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.style.opacity = '1';
            if (cb) setTimeout(cb, 300);
          });
        });
      }, 290);
    }

    function playTransition(key, finalImage, cb) {
      if (REDUCED_MOTION) { fadeToStill(finalImage, cb); return; }

      var vid = $(cfg.videoId);
      var still = $(cfg.stillId);
      if (!vid || !still) { if (cb) cb(); return; }
      var path = VIDEOS[key];
      var done = false;
      var timer = null;

      showLoading(true);

      function cleanup() {
        clearTimeout(timer);
        vid.onended = null;
        vid.onerror = null;
        if (vid._ph) { vid.removeEventListener('canplay', vid._ph); vid._ph = null; }
        showLoading(false);
      }

      function finish() {
        if (done) return; done = true;
        cleanup();
        still.src = finalImage;
        still.style.opacity = '1';
        vid.style.transition = 'opacity .2s ease';
        vid.style.opacity = '0';
        setTimeout(function () {
          vid.style.display = 'none';
          vid.style.opacity = '1';
          vid.style.transition = '';
          vid.removeAttribute('src'); vid.load();
          if (cb) cb();
        }, 220);
      }

      function fallback(reason) {
        if (done) return; done = true;
        console.warn(log + ' fallback (' + reason + ') -> fading to ' + finalImage);
        cleanup();
        vid.style.display = 'none';
        vid.removeAttribute('src'); vid.load();
        fadeToStill(finalImage, cb);
      }

      if (!path) { showLoading(false); fadeToStill(finalImage, cb); return; }

      if (vid._ph) { vid.removeEventListener('canplay', vid._ph); vid._ph = null; }
      vid.onended = null; vid.onerror = null;
      vid.removeAttribute('src'); vid.load();

      vid.onended = function () { finish(); };
      vid.onerror = function () {
        var c = vid.error ? vid.error.code : '?';
        fallback('onerror code=' + c + ' src=' + path);
      };

      function tryPlay() {
        vid.removeEventListener('canplay', tryPlay);
        vid._ph = null;
        if (done) return;
        clearTimeout(timer);
        vid.currentTime = 0;
        var prom = vid.play();
        if (prom && prom.catch) prom.catch(function (e) {
          fallback('play() rejected: ' + e.name + ' ' + e.message);
        });
      }

      vid._ph = tryPlay;
      vid.addEventListener('canplay', tryPlay);

      still.style.opacity = '1';
      vid.style.opacity = '1';
      vid.src = path;
      vid.style.display = 'block';
      vid.load();

      timer = setTimeout(function () { fallback('5s timeout — canplay never fired for ' + path); }, 5000);
    }

    function setOverviewUI(isOverview) {
      var layer = $(cfg.hotspotLayerId);
      if (layer) layer.style.display = isOverview ? 'block' : 'none';
    }

    function setActive(partId) {
      PARTS.forEach(function (p) {
        var d = $(cfg.hotspotIdPrefix + p.id);
        if (d) d.classList.toggle('active', p.id === partId);
      });
    }

    function updatePanel(partId) {
      var slot = $(cfg.detailSlotId);
      var def = $(cfg.defaultPanelId);
      if (!partId) {
        if (slot) slot.style.display = 'none';
        if (def) def.style.display = 'flex';
        return;
      }
      var p = null;
      for (var i = 0; i < PARTS.length; i++) { if (PARTS[i].id === partId) { p = PARTS[i]; break; } }
      if (!p || !slot) return;
      if (def) def.style.display = 'none';
      slot.innerHTML =
        '<div class="' + cfg.detailLabelClass + '">' + p.category + '</div>' +
        '<h3>' + p.title + '</h3>' +
        '<p>' + p.description + '</p>' +
        '<div class="' + cfg.learnsLabelClass + '">What students learn from this</div>' +
        '<ul class="' + cfg.learnsListClass + '">' +
        p.learns.map(function (b) { return '<li>' + b + '</li>'; }).join('') +
        '</ul>';
      slot.style.display = 'block';
      if (window.innerWidth < 900) setTimeout(function () {
        var panel = $(cfg.panelId);
        if (panel) panel.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'nearest' });
      }, 80);
    }

    function selectPart(partId) {
      if (viewer.transitioning) return;
      var part = null;
      for (var i = 0; i < PARTS.length; i++) { if (PARTS[i].id === partId) { part = PARTS[i]; break; } }
      if (!part) return;

      var tg = part.videoGroup;

      if (viewer.group === tg && viewer.group !== 'overview') {
        viewer.partId = partId;
        setActive(partId);
        updatePanel(partId);
        return;
      }

      viewer.transitioning = true;
      setActive(partId);
      setOverviewUI(false);

      if (viewer.group === 'overview') {
        playTransition('overview_to_' + tg, part.finalImage, function () {
          viewer.group = tg;
          viewer.partId = partId;
          viewer.transitioning = false;
          updatePanel(partId);
        });
      } else {
        var fromGroup = viewer.group;
        playTransition(fromGroup + '_to_overview', GROUP_IMAGES.overview, function () {
          viewer.group = 'overview';
          setTimeout(function () {
            playTransition('overview_to_' + tg, part.finalImage, function () {
              viewer.group = tg;
              viewer.partId = partId;
              viewer.transitioning = false;
              updatePanel(partId);
            });
          }, 100);
        });
      }
    }

    function goToOverview() {
      if (viewer.transitioning || viewer.group === 'overview') return;
      viewer.transitioning = true;
      setActive(null);
      var fromGroup = viewer.group;
      playTransition(fromGroup + '_to_overview', GROUP_IMAGES.overview, function () {
        viewer.group = 'overview';
        viewer.partId = null;
        viewer.transitioning = false;
        setOverviewUI(true);
        updatePanel(null);
      });
    }

    function init() {
      var layer = $(cfg.hotspotLayerId);
      if (!layer) { console.warn(log + ' hotspot layer #' + cfg.hotspotLayerId + ' not found — skipping init'); return; }
      PARTS.forEach(function (p) {
        var dot = document.createElement('div');
        dot.className = cfg.hotspotClass;
        dot.id = cfg.hotspotIdPrefix + p.id;
        dot.style.left = p.xPercent + '%';
        dot.style.top = p.yPercent + '%';
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('aria-label', p.label);
        dot.addEventListener('click', function () { selectPart(p.id); });
        dot.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPart(p.id); }
        });
        var lbl = document.createElement('span');
        lbl.className = cfg.labelClass + ' ' + cfg.labelSidePrefix + p.labelSide;
        lbl.textContent = p.label;
        dot.appendChild(lbl);
        layer.appendChild(dot);
      });
      var overviewBtn = $(cfg.overviewBtnId);
      if (overviewBtn) overviewBtn.addEventListener('click', goToOverview);
      preloadAssets();
    }

    return { init: init, selectPart: selectPart, goToOverview: goToOverview, isReducedMotion: function () { return REDUCED_MOTION; } };
  }

  window.SwayFormAnatomy = { create: create, PARTS: PARTS, VIDEOS: VIDEOS, GROUP_IMAGES: GROUP_IMAGES };
})();

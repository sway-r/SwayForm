/* Shared behavior for every /learning-hub/* page: sidebar group toggle,
   mobile sidebar reveal, copy-code buttons, and search over LH_INDEX. */

function toggleSbGroup(btn) {
  btn.classList.toggle('open');
  var items = btn.nextElementSibling;
  if (items) items.classList.toggle('open');
}

var lhDrawerTrigger = null;

function openLhSidebarMobile(triggerEl) {
  var sb = document.getElementById('lh-sidebar');
  var backdrop = document.getElementById('lh-sidebar-backdrop');
  if (!sb) return;
  lhDrawerTrigger = triggerEl || document.querySelector('.lh-mob-nav-toggle');
  sb.classList.add('mobile-open');
  if (backdrop) backdrop.classList.add('open');
  if (lhDrawerTrigger) lhDrawerTrigger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  var closeBtn = sb.querySelector('.lh-sb-close');
  if (closeBtn) closeBtn.focus();
}

function closeLhSidebarMobile() {
  var sb = document.getElementById('lh-sidebar');
  var backdrop = document.getElementById('lh-sidebar-backdrop');
  if (!sb) return;
  sb.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('open');
  var trigger = lhDrawerTrigger || document.querySelector('.lh-mob-nav-toggle');
  if (trigger) { trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
  document.body.style.overflow = '';
}

function toggleLhSidebarMobile(el) {
  var sb = document.getElementById('lh-sidebar');
  if (!sb) return;
  if (sb.classList.contains('mobile-open')) closeLhSidebarMobile();
  else openLhSidebarMobile(el);
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var sb = document.getElementById('lh-sidebar');
  if (sb && sb.classList.contains('mobile-open')) closeLhSidebarMobile();
});

function copyCode(btn) {
  var pre = btn.closest('.lh-code').querySelector('pre code');
  if (!pre) return;
  navigator.clipboard.writeText(pre.innerText).then(function () {
    btn.textContent = 'Copied!';
    btn.classList.add('ok');
    setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('ok'); }, 1800);
  }).catch(function () {
    btn.textContent = 'Error';
    setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
  });
}

function initLhSearch() {
  var input = document.getElementById('lh-search-input');
  var resultEl = document.getElementById('lh-search-results');
  if (!input || !resultEl || typeof LH_INDEX === 'undefined') return;

  function doSearch(query) {
    var q = query.trim().toLowerCase();
    if (!q) { resultEl.style.display = 'none'; return; }

    var matches = LH_INDEX.filter(function (p) {
      return p.title.toLowerCase().indexOf(q) >= 0
          || p.group.toLowerCase().indexOf(q) >= 0
          || p.keywords.some(function (k) { return k.indexOf(q) >= 0; });
    });

    if (!matches.length) {
      resultEl.innerHTML = '<div class="lh-sr-empty">No matching Learning Hub sections found.</div>';
      resultEl.style.display = 'block';
      return;
    }

    resultEl.innerHTML = matches.slice(0, 10).map(function (p) {
      var badge = p.status === 'soon'
        ? '<span class="lh-sr-badge soon">Coming soon</span>'
        : '<span class="lh-sr-badge">Ready</span>';
      return '<a class="lh-sr-item" href="' + p.url + '">'
           + '<span class="lh-sr-title">' + p.title + '</span>'
           + '<span class="lh-sr-meta"><span class="lh-sr-group">' + p.group + '</span>' + badge + '</span>'
           + '</a>';
    }).join('');
    resultEl.style.display = 'block';
  }

  input.addEventListener('input', function () { doSearch(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { resultEl.style.display = 'none'; input.value = ''; }
  });
  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !resultEl.contains(e.target)) {
      resultEl.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initLhSearch();
});

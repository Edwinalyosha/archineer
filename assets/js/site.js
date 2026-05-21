/* site.js — Archineer Uganda LLP shared UI
   Handles: engineering overlay, custom cursor, mobile image colourisation,
            scroll reveal with scroll-up reset.
   Loaded on every page. Per-page scripts add .reveal classes; this file observes them.
*/

// ─── Engineering Overlay ────────────────────────────────────────────────────
(function () {
  var overlay = document.createElement('div');
  overlay.id = 'eng-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div id="eng-right">' +
      '<span class="eng-tick top"></span>' +
      '<span id="eng-y-tracker" class="eng-tracker"></span>' +
      '<span class="eng-tick bottom"></span>' +
    '</div>' +
    '<div id="eng-bottom">' +
      '<span class="eng-tick left"></span>' +
      '<span id="eng-x-tracker" class="eng-tracker"></span>' +
      '<span class="eng-tick right"></span>' +
    '</div>';
  document.body.appendChild(overlay);

  // Evenly-spaced interval ticks — regenerated on resize
  function buildTicks() {
    var right  = document.getElementById('eng-right');
    var bottom = document.getElementById('eng-bottom');
    if (!right || !bottom) return;

    // Clear old interval ticks
    right.querySelectorAll('.eng-itick').forEach(function (el) { el.remove(); });
    bottom.querySelectorAll('.eng-itick').forEach(function (el) { el.remove(); });

    var spacing = 80;
    var h = window.innerHeight;
    var w = window.innerWidth;
    var mobile   = w <= 1023;
    var tickLen  = mobile ? 5  : 11;
    var tickOff  = mobile ? -2 : -5;

    for (var y = spacing; y < h - spacing / 2; y += spacing) {
      var rt = document.createElement('span');
      rt.className = 'eng-itick';
      rt.style.cssText = 'position:absolute;top:' + y + 'px;left:' + tickOff + 'px;width:' + tickLen + 'px;height:1px;background:rgba(255,255,255,0.18);';
      right.appendChild(rt);
    }

    for (var x = spacing; x < w - spacing / 2; x += spacing) {
      var bt = document.createElement('span');
      bt.className = 'eng-itick';
      bt.style.cssText = 'position:absolute;left:' + x + 'px;top:' + tickOff + 'px;width:1px;height:' + tickLen + 'px;background:rgba(255,255,255,0.18);';
      bottom.appendChild(bt);
    }
  }

  buildTicks();
  window.addEventListener('resize', buildTicks, { passive: true });

  document.addEventListener('mousemove', function (e) {
    var yT = document.getElementById('eng-y-tracker');
    var xT = document.getElementById('eng-x-tracker');
    if (yT) yT.style.top  = e.clientY + 'px';
    if (xT) xT.style.left = e.clientX + 'px';
  }, { passive: true });
})();


// ─── Custom Cursor (desktop only) ────────────────────────────────────────────
(function () {
  if (window.innerWidth < 1024) return;

  // Force cursor off on every element — inline style beats all stylesheets
  document.documentElement.style.setProperty('cursor', 'none', 'important');

  var style = document.createElement('style');
  style.textContent = '* { cursor: none !important; }';
  document.head.appendChild(style);

  // Build crosshair div
  var cur = document.createElement('div');
  cur.id = 'eng-cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" style="display:block;overflow:visible">' +
      '<circle cx="16" cy="16" r="5" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1"/>' +
      '<circle cx="16" cy="16" r="1.5" fill="rgba(255,255,255,0.9)"/>' +
      '<line x1="0"  y1="16" x2="10" y2="16" stroke="rgba(255,255,255,0.9)" stroke-width="1"/>' +
      '<line x1="22" y1="16" x2="32" y2="16" stroke="rgba(255,255,255,0.9)" stroke-width="1"/>' +
      '<line x1="16" y1="0"  x2="16" y2="10" stroke="rgba(255,255,255,0.9)" stroke-width="1"/>' +
      '<line x1="16" y1="22" x2="16" y2="32" stroke="rgba(255,255,255,0.9)" stroke-width="1"/>' +
    '</svg>';
  cur.style.cssText =
    'position:fixed;top:0;left:0;width:32px;height:32px;pointer-events:none;' +
    'z-index:99999;transform:translate(-16px,-16px);transition:opacity 0.15s;opacity:0;';
  document.body.appendChild(cur);

  document.addEventListener('mousemove', function (e) {
    cur.style.transform = 'translate(' + (e.clientX - 16) + 'px,' + (e.clientY - 16) + 'px)';
    cur.style.opacity = '1';
  }, { passive: true });

  document.addEventListener('mouseleave', function () { cur.style.opacity = '0'; });
  document.addEventListener('mouseenter', function () { cur.style.opacity = '1'; });
})();


// ─── Mobile Image Colourisation ──────────────────────────────────────────────
// Images whose bottom edge is above the bottom line (100 px from viewport base)
// are shown in colour; everything below the line stays greyscale.
(function () {
  var mq = window.matchMedia('(max-width: 1023px)');

  function lineY() { return window.innerHeight - 100; }

  function update() {
    var mobile = mq.matches;
    var ly = lineY();

    document.querySelectorAll('img').forEach(function (img) {
      // Never touch the logo or any header image
      if (img.closest('header')) return;
      // Skip images that are display:none (e.g. filtered-out projects)
      if (img.offsetParent === null) return;

      if (!mobile) {
        // Desktop: remove inline override so Tailwind grayscale + hover take over
        img.style.filter = '';
        return;
      }

      var rect = img.getBoundingClientRect();
      img.style.filter = rect.bottom < ly ? 'grayscale(0%)' : 'grayscale(100%)';
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  mq.addEventListener('change', update);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
})();


// ─── Scroll Reveal — with scroll-up reset ────────────────────────────────────
// Observes all elements with class .reveal.
// Elements animate in when entering the viewport.
// Elements reset when they scroll off the BOTTOM of the viewport (user scrolled up)
// so they re-animate on the next downscroll.
(function () {
  function init() {
    var observer = new IntersectionObserver(function (entries) {
      // Collect elements entering the viewport, sorted top-to-bottom for natural stagger
      var entering = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });

      entering.forEach(function (entry, i) {
        setTimeout(function () {
          entry.target.classList.add('active');
        }, i * 110);
      });

      // Reset elements that have exited at the BOTTOM (user scrolled back up)
      // boundingClientRect.top > 0 when !isIntersecting means the element's top
      // edge is still within/below the viewport — it exited downward (scroll up).
      entries.forEach(function (entry) {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          entry.target.classList.remove('active');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    // setTimeout(0) ensures per-page DOMContentLoaded handlers have already
    // added their .reveal classes before we start observing.
    setTimeout(function () {
      document.querySelectorAll('.reveal').forEach(function (el) {
        observer.observe(el);
      });
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

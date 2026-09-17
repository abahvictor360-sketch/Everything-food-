/* =============================================================================
   Everything Food — menu page
   Category chips, search across the whole price list, tap-a-price ordering,
   and the spark that travels from the price you tapped up to the cart.
   Depends on window.EF, published by main.js.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var EF = window.EF || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var chips = $$('.mchip');
  var sections = $$('.msection');
  var items = $$('.mitem');
  var countEl = $('#mnav-count');
  var searchInput = $('#q');

  /* ------------------------------------------------- Chips track the section */
  // The chip rail scrolls horizontally, so the active chip is pulled into view
  // rather than left off the edge.
  function setActiveChip(id) {
    var active = null;
    chips.forEach(function (chip) {
      var on = chip.getAttribute('href') === '#' + id;
      chip.classList.toggle('is-active', on);
      if (on) active = chip;
    });
    if (!active) return;

    var rail = active.parentElement;
    var left = active.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2;
    rail.scrollTo({ left: Math.max(left, 0), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveChip(entry.target.id);
      });
    }, { rootMargin: '-25% 0px -60% 0px' });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      var id = chip.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      // Clear the sticky header and the chip bar so the heading is not hidden.
      var offset = ($('#header').offsetHeight || 0) + ($('#mnav').offsetHeight || 0) + 12;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      setActiveChip(id);
      history.replaceState(null, '', '#' + id);
    });
  });

  /* ------------------------------------------------------------------ Search */
  function runSearch(query) {
    var q = query.trim().toLowerCase();
    var shown = 0;

    sections.forEach(function (section) {
      var visibleInSection = 0;
      $$('.mitem', section).forEach(function (item) {
        var match = !q || item.dataset.search.indexOf(q) > -1;
        item.classList.toggle('is-hidden', !match);
        if (match) visibleInSection += 1;
      });
      section.classList.toggle('is-empty', visibleInSection === 0);
      shown += visibleInSection;
    });

    if (!countEl) return;
    if (!q) countEl.textContent = items.length + ' dishes';
    else if (shown === 0) countEl.textContent = 'No match for "' + query.trim() + '"';
    else countEl.textContent = shown + ' of ' + items.length + ' dishes';
  }

  if (searchInput) {
    var timer;
    searchInput.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { runSearch(searchInput.value); }, 180);
    });
  }
  runSearch('');

  /* ------------------------------------------------- Tap a price, order it */
  function flyToCart(from) {
    var cart = EF.cartButton;
    if (!cart || reduceMotion.matches) return;

    var a = from.getBoundingClientRect();
    var b = cart.getBoundingClientRect();

    var dot = document.createElement('span');
    dot.className = 'fly';
    dot.style.left = (a.left + a.width / 2 - 7) + 'px';
    dot.style.top = (a.top + a.height / 2 - 7) + 'px';
    document.body.appendChild(dot);

    // One frame at the start position, then the transition carries it.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        dot.style.transform =
          'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' +
                         (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.4)';
        dot.style.opacity = '0';
      });
    });

    dot.addEventListener('transitionend', function () { dot.remove(); }, { once: true });
    setTimeout(function () { dot.remove(); }, 1200);
  }

  $$('.mitem__price').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.name;
      var unit = btn.dataset.unit;

      btn.classList.add('is-added');
      setTimeout(function () { btn.classList.remove('is-added'); }, 700);

      flyToCart(btn);
      if (EF.addToCart) EF.addToCart(name + (unit ? ' (' + unit + ')' : ''));
    });
  });

  /* ----------------------------------------- Land on the right section on load */
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('msection')) {
      setActiveChip(target.id);
      setTimeout(function () {
        var offset = ($('#header').offsetHeight || 0) + ($('#mnav').offsetHeight || 0) + 12;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'auto' });
      }, 60);
    }
  }
})();
